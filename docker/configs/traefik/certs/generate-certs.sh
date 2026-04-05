#!/bin/bash
# =============================================================================
# Generate Self-Signed TLS Certificates for Development
# UBI-CMS Platform
# =============================================================================

set -e

CERTS_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="ubi-cms.local"
WILDCARD_DOMAIN="*.ubi-cms.local"
DAYS_VALID=365

echo "==================================================================="
echo "Generating TLS Certificates for UBI-CMS"
echo "==================================================================="

# Create CA (Certificate Authority)
echo "📜 Creating Certificate Authority..."
openssl genrsa -out "${CERTS_DIR}/ca.key" 4096

openssl req -x509 -new -nodes \
  -key "${CERTS_DIR}/ca.key" \
  -sha256 \
  -days 1024 \
  -out "${CERTS_DIR}/ca.crt" \
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=UBI-CMS/OU=Development/CN=UBI-CMS Root CA"

echo "✅ CA certificate created: ca.crt"

# Create certificate for main domain
echo "📜 Creating certificate for ${DOMAIN}..."
openssl genrsa -out "${CERTS_DIR}/${DOMAIN}.key" 2048

openssl req -new \
  -key "${CERTS_DIR}/${DOMAIN}.key" \
  -out "${CERTS_DIR}/${DOMAIN}.csr" \
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=UBI-CMS/OU=Development/CN=${DOMAIN}"

# Create config file for SAN
cat > "${CERTS_DIR}/${DOMAIN}.ext" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = www.${DOMAIN}
DNS.3 = admin.${DOMAIN}
DNS.4 = api.${DOMAIN}
DNS.5 = traefik.${DOMAIN}
EOF

openssl x509 -req \
  -in "${CERTS_DIR}/${DOMAIN}.csr" \
  -CA "${CERTS_DIR}/ca.crt" \
  -CAkey "${CERTS_DIR}/ca.key" \
  -CAcreateserial \
  -out "${CERTS_DIR}/${DOMAIN}.crt" \
  -days ${DAYS_VALID} \
  -sha256 \
  -extfile "${CERTS_DIR}/${DOMAIN}.ext"

echo "✅ Domain certificate created: ${DOMAIN}.crt"

# Create wildcard certificate
echo "📜 Creating wildcard certificate for ${WILDCARD_DOMAIN}..."
openssl genrsa -out "${CERTS_DIR}/wildcard.${DOMAIN}.key" 2048

openssl req -new \
  -key "${CERTS_DIR}/wildcard.${DOMAIN}.key" \
  -out "${CERTS_DIR}/wildcard.${DOMAIN}.csr" \
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=UBI-CMS/OU=Development/CN=${WILDCARD_DOMAIN}"

# Create config file for wildcard SAN
cat > "${CERTS_DIR}/wildcard.${DOMAIN}.ext" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = ${WILDCARD_DOMAIN}
EOF

openssl x509 -req \
  -in "${CERTS_DIR}/wildcard.${DOMAIN}.csr" \
  -CA "${CERTS_DIR}/ca.crt" \
  -CAkey "${CERTS_DIR}/ca.key" \
  -CAcreateserial \
  -out "${CERTS_DIR}/wildcard.${DOMAIN}.crt" \
  -days ${DAYS_VALID} \
  -sha256 \
  -extfile "${CERTS_DIR}/wildcard.${DOMAIN}.ext"

echo "✅ Wildcard certificate created: wildcard.${DOMAIN}.crt"

# Clean up CSR and extension files
rm -f "${CERTS_DIR}"/*.csr
rm -f "${CERTS_DIR}"/*.ext
rm -f "${CERTS_DIR}"/*.srl

# Set proper permissions
chmod 600 "${CERTS_DIR}"/*.key
chmod 644 "${CERTS_DIR}"/*.crt

echo ""
echo "==================================================================="
echo "✅ Certificate generation complete!"
echo "==================================================================="
echo ""
echo "📋 Generated certificates:"
echo "   - CA Certificate: ca.crt"
echo "   - Domain Certificate: ${DOMAIN}.crt"
echo "   - Wildcard Certificate: wildcard.${DOMAIN}.crt"
echo ""
echo "⚠️  To trust these certificates:"
echo "   1. Import ca.crt into your system's trusted root certificates"
echo "   2. Add '127.0.0.1 ${DOMAIN}' to /etc/hosts (Linux/Mac) or C:\\Windows\\System32\\drivers\\etc\\hosts (Windows)"
echo "   3. Add subdomains: admin.${DOMAIN}, api.${DOMAIN}, traefik.${DOMAIN}"
echo ""
echo "🔐 Certificate validity: ${DAYS_VALID} days"
echo "==================================================================="
