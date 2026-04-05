#!/bin/bash
# =============================================================================
# Traefik Configuration Validation Script
# UBI-CMS Platform
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "==================================================================="
echo "🔍 Traefik Configuration Validation"
echo "==================================================================="
echo ""

ERRORS=0
WARNINGS=0
PASSED=0

# Function to print results
pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ((ERRORS++))
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# Check files exist
echo "📁 Checking configuration files..."
if [ -f "${SCRIPT_DIR}/traefik.yml" ]; then
  pass "Static configuration exists (traefik.yml)"
else
  fail "Static configuration missing (traefik.yml)"
fi

if [ -f "${SCRIPT_DIR}/dynamic/middleware.yml" ]; then
  pass "Middleware configuration exists"
else
  fail "Middleware configuration missing"
fi

if [ -f "${SCRIPT_DIR}/dynamic/routes.yml" ]; then
  pass "Routes configuration exists"
else
  fail "Routes configuration missing"
fi

if [ -f "${SCRIPT_DIR}/dynamic/tls.yml" ]; then
  pass "TLS configuration exists"
else
  fail "TLS configuration missing"
fi
echo ""

# Check certificates
echo "🔐 Checking certificates..."
if [ -f "${SCRIPT_DIR}/certs/ca.crt" ]; then
  pass "CA certificate exists"
  
  # Check certificate validity
  if openssl x509 -checkend 86400 -noout -in "${SCRIPT_DIR}/certs/ca.crt" &>/dev/null; then
    pass "CA certificate is valid (not expiring in 24h)"
  else
    warn "CA certificate expires soon"
  fi
else
  warn "CA certificate not found (run generate-certs.sh)"
fi

if [ -f "${SCRIPT_DIR}/certs/ubi-cms.local.crt" ]; then
  pass "Domain certificate exists"
  
  if openssl x509 -checkend 86400 -noout -in "${SCRIPT_DIR}/certs/ubi-cms.local.crt" &>/dev/null; then
    pass "Domain certificate is valid"
  else
    warn "Domain certificate expires soon"
  fi
else
  warn "Domain certificate not found (run generate-certs.sh)"
fi

if [ -f "${SCRIPT_DIR}/certs/acme.json" ]; then
  PERMS=$(stat -c %a "${SCRIPT_DIR}/certs/acme.json" 2>/dev/null || stat -f %A "${SCRIPT_DIR}/certs/acme.json" 2>/dev/null)
  if [ "$PERMS" = "600" ]; then
    pass "ACME storage has correct permissions (600)"
  else
    fail "ACME storage has incorrect permissions ($PERMS, should be 600)"
  fi
else
  warn "ACME storage not found (will be created on first run)"
fi
echo ""

# Check Podman
echo "🐳 Checking Podman environment..."
if command -v podman &> /dev/null; then
  pass "Podman is installed"
  
  if podman info &> /dev/null; then
    pass "Podman machine/service is running"
  else
    fail "Podman is not running"
  fi
else
  fail "Podman is not installed"
fi

if podman network inspect ubi-cms-network &> /dev/null; then
  pass "Podman network exists (ubi-cms-network)"
else
  warn "Podman network not found (will be created automatically)"
fi
echo ""

# Check if Traefik is running
echo "🚀 Checking Traefik service..."
if podman ps --filter "name=ubi-cms-traefik" --format "{{.Names}}" | grep -q "ubi-cms-traefik"; then
  pass "Traefik container is running"
  
  # Check container health
  HEALTH=$(podman inspect --format='{{.State.Health.Status}}' ubi-cms-traefik 2>/dev/null || echo "none")
  if [ "$HEALTH" = "healthy" ]; then
    pass "Traefik is healthy"
  elif [ "$HEALTH" = "none" ]; then
    info "Traefik health check not configured"
  else
    warn "Traefik health status: $HEALTH"
  fi
  
  # Check if ports are listening
  if podman port ubi-cms-traefik 80 &>/dev/null; then
    pass "HTTP port (80) is exposed"
  else
    warn "HTTP port (80) not exposed"
  fi
  
  if podman port ubi-cms-traefik 443 &>/dev/null; then
    pass "HTTPS port (443) is exposed"
  else
    warn "HTTPS port (443) not exposed"
  fi
  
  if podman port ubi-cms-traefik 8080 &>/dev/null; then
    pass "Dashboard port (8080) is exposed"
  else
    warn "Dashboard port (8080) not exposed"
  fi
else
  warn "Traefik container is not running"
fi
echo ""

# Check environment variables
echo "⚙️  Checking environment configuration..."
if [ -f "${SCRIPT_DIR}/.env" ]; then
  pass "Environment file exists"
  
  # Check for critical variables
  if grep -q "JWT_SECRET=change-me-in-production" "${SCRIPT_DIR}/.env"; then
    warn "JWT_SECRET uses default value (change in production!)"
  else
    pass "JWT_SECRET is customized"
  fi
  
  if grep -q "KEYCLOAK_ADMIN_PASSWORD=admin" "${SCRIPT_DIR}/.env"; then
    warn "Keycloak admin password uses default value"
  fi
  
  if grep -q "DB_PASSWORD=postgres" "${SCRIPT_DIR}/.env"; then
    warn "Database password uses default value"
  fi
else
  fail "Environment file not found (.env)"
fi
echo ""

# Check hosts file
echo "🌐 Checking hosts file configuration..."
HOSTS_FILE="/etc/hosts"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  HOSTS_FILE="C:/Windows/System32/drivers/etc/hosts"
fi

if grep -q "ubi-cms.local" "$HOSTS_FILE" 2>/dev/null; then
  pass "Hosts file contains ubi-cms.local"
else
  warn "ubi-cms.local not found in hosts file"
fi

if grep -q "admin.ubi-cms.local" "$HOSTS_FILE" 2>/dev/null; then
  pass "Hosts file contains admin.ubi-cms.local"
else
  warn "admin.ubi-cms.local not found in hosts file"
fi
echo ""

# Test endpoints (if Traefik is running)
if podman ps --filter "name=ubi-cms-traefik" --format "{{.Names}}" | grep -q "ubi-cms-traefik"; then
  echo "🔌 Testing endpoints..."
  
  # Test HTTP to HTTPS redirect
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "308" ]; then
    pass "HTTP to HTTPS redirect working (${HTTP_CODE})"
  else
    warn "HTTP redirect returned: $HTTP_CODE"
  fi
  
  # Test HTTPS
  HTTPS_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost/ 2>/dev/null || echo "000")
  if [ "$HTTPS_CODE" = "200" ] || [ "$HTTPS_CODE" = "404" ]; then
    pass "HTTPS endpoint responding (${HTTPS_CODE})"
  else
    warn "HTTPS endpoint returned: $HTTPS_CODE"
  fi
  
  # Test dashboard
  DASHBOARD_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" http://localhost:8080/dashboard/ 2>/dev/null || echo "000")
  if [ "$DASHBOARD_CODE" = "200" ] || [ "$DASHBOARD_CODE" = "401" ]; then
    pass "Traefik dashboard accessible (${DASHBOARD_CODE})"
  else
    warn "Dashboard returned: $DASHBOARD_CODE"
  fi
  
  # Test metrics
  METRICS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/metrics 2>/dev/null || echo "000")
  if [ "$METRICS_CODE" = "200" ]; then
    pass "Metrics endpoint accessible"
  else
    warn "Metrics endpoint returned: $METRICS_CODE"
  fi
  echo ""
fi

# Summary
echo "==================================================================="
echo "📊 Validation Summary"
echo "==================================================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Errors:${NC}   $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Configuration is valid!${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Please review warnings above${NC}"
  fi
  exit 0
else
  echo -e "${RED}❌ Configuration has errors!${NC}"
  echo "Please fix the errors above before deploying"
  exit 1
fi
