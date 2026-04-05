#!/bin/bash

# Keycloak Setup Script for UBI-CMS
# This script configures a Keycloak realm for the UBI-CMS platform

set -e

# Configuration
KEYCLOAK_URL=${KEYCLOAK_URL:-"http://localhost:8080"}
ADMIN_USER=${KEYCLOAK_ADMIN:-"admin"}
ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD:-"admin"}
REALM_NAME="ubi-cms"

echo "🔐 Starting Keycloak setup for UBI-CMS..."
echo "Keycloak URL: $KEYCLOAK_URL"
echo "Realm: $REALM_NAME"

# Wait for Keycloak to be ready
echo "⏳ Waiting for Keycloak to be ready..."
for i in {1..30}; do
  if curl -f -s "$KEYCLOAK_URL/health/ready" > /dev/null 2>&1; then
    echo "✅ Keycloak is ready"
    break
  fi
  echo "  Attempt $i/30: Keycloak not ready yet..."
  sleep 5
done

# Get admin access token
echo "🔑 Authenticating as admin..."
ACCESS_TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASSWORD" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to authenticate with Keycloak"
  exit 1
fi

echo "✅ Authenticated successfully"

# Check if realm exists
echo "🔍 Checking if realm exists..."
REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$KEYCLOAK_URL/admin/realms/$REALM_NAME")

if [ "$REALM_EXISTS" == "200" ]; then
  echo "⚠️  Realm '$REALM_NAME' already exists. Skipping creation."
else
  # Import realm configuration
  echo "📥 Creating realm from configuration..."
  curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d @realm-config.json

  echo "✅ Realm created successfully"
fi

# Create service account clients for microservices
echo "🔧 Creating service account clients..."

SERVICES=(
  "auth-service"
  "treasury-engine"
  "ubi-engine"
  "ledger-service"
  "reputation-service"
  "rewards-engine"
  "task-marketplace"
  "agent-control-plane"
  "governance-service"
  "notifications-service"
)

for SERVICE in "${SERVICES[@]}"; do
  echo "  Creating client: $SERVICE"
  
  CLIENT_ID="$SERVICE"
  CLIENT_SECRET=$(openssl rand -hex 32)
  
  # Check if client exists
  CLIENT_EXISTS=$(curl -s \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients?clientId=$CLIENT_ID" | jq -r 'length')
  
  if [ "$CLIENT_EXISTS" != "0" ]; then
    echo "    ⚠️  Client '$CLIENT_ID' already exists. Skipping."
    continue
  fi
  
  # Create client
  curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"clientId\": \"$CLIENT_ID\",
      \"name\": \"$SERVICE\",
      \"enabled\": true,
      \"publicClient\": false,
      \"protocol\": \"openid-connect\",
      \"bearerOnly\": false,
      \"standardFlowEnabled\": false,
      \"directAccessGrantsEnabled\": false,
      \"serviceAccountsEnabled\": true,
      \"secret\": \"$CLIENT_SECRET\"
    }"
  
  echo "    ✅ Client created with secret: $CLIENT_SECRET"
  echo "    💾 Save this to your .env file: ${SERVICE^^}_KEYCLOAK_CLIENT_SECRET=$CLIENT_SECRET"
done

# Get API Gateway client secret
echo "🔑 Retrieving API Gateway client secret..."
API_GW_CLIENT_UUID=$(curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients?clientId=api-gateway" | jq -r '.[0].id')

if [ "$API_GW_CLIENT_UUID" != "null" ] && [ -n "$API_GW_CLIENT_UUID" ]; then
  # Generate new secret for API Gateway
  API_GW_SECRET=$(openssl rand -hex 32)
  
  curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients/$API_GW_CLIENT_UUID/client-secret" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"secret\", \"value\": \"$API_GW_SECRET\"}"
  
  echo "✅ API Gateway client secret: $API_GW_SECRET"
  echo "💾 Save to .env: KEYCLOAK_CLIENT_SECRET=$API_GW_SECRET"
fi

# Create default admin user
echo "👤 Creating default admin user..."
ADMIN_EMAIL="admin@ubicsm.com"
ADMIN_USERNAME="admin"
ADMIN_PASS="ChangeMe123!"

USER_EXISTS=$(curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users?username=$ADMIN_USERNAME" | jq -r 'length')

if [ "$USER_EXISTS" == "0" ]; then
  curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"$ADMIN_USERNAME\",
      \"email\": \"$ADMIN_EMAIL\",
      \"firstName\": \"Platform\",
      \"lastName\": \"Administrator\",
      \"enabled\": true,
      \"emailVerified\": true,
      \"credentials\": [{
        \"type\": \"password\",
        \"value\": \"$ADMIN_PASS\",
        \"temporary\": false
      }]
    }"
  
  # Get user ID
  USER_ID=$(curl -s \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users?username=$ADMIN_USERNAME" | jq -r '.[0].id')
  
  # Assign admin role
  ADMIN_ROLE_ID=$(curl -s \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$REALM_NAME/roles/admin" | jq -r '.id')
  
  curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users/$USER_ID/role-mappings/realm" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "[{\"id\": \"$ADMIN_ROLE_ID\", \"name\": \"admin\"}]"
  
  echo "✅ Admin user created"
  echo "   Username: $ADMIN_USERNAME"
  echo "   Password: $ADMIN_PASS (please change immediately!)"
else
  echo "⚠️  Admin user already exists. Skipping."
fi

echo ""
echo "🎉 Keycloak setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update your service .env files with the generated client secrets"
echo "2. Change the default admin password"
echo "3. Configure SMTP settings in Keycloak admin console"
echo "4. Test authentication with the auth-service"
echo ""
echo "🌐 Access Keycloak Admin Console:"
echo "   URL: $KEYCLOAK_URL/admin"
echo "   Realm: $REALM_NAME"
echo "   Master Admin: $ADMIN_USER"
echo ""
