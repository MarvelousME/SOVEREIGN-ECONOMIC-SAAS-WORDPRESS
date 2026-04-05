#!/bin/bash
# =============================================================================
# Traefik API Gateway - Quick Setup Script
# UBI-CMS Platform
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERTS_DIR="${SCRIPT_DIR}/certs"
DYNAMIC_DIR="${SCRIPT_DIR}/dynamic"

echo "==================================================================="
echo "🚀 Traefik API Gateway Setup for UBI-CMS"
echo "==================================================================="
echo ""

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then 
  echo "⚠️  Warning: Running as root is not recommended"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check Podman installation
echo "🔍 Checking Podman installation..."
if ! command -v podman &> /dev/null; then
  echo "❌ Podman is not installed. Please install Podman first."
  exit 1
fi

if ! podman compose version &> /dev/null; then
  echo "❌ Podman Compose is not available. Use Podman 4.1+ with the compose subcommand, or install podman-compose."
  exit 1
fi
echo "✅ Podman is installed"
echo ""

# Check OpenSSL installation
echo "🔍 Checking OpenSSL installation..."
if ! command -v openssl &> /dev/null; then
  echo "❌ OpenSSL is not installed. Please install OpenSSL for certificate generation."
  exit 1
fi
echo "✅ OpenSSL is installed"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p "${DYNAMIC_DIR}"
mkdir -p "${CERTS_DIR}"
mkdir -p "${SCRIPT_DIR}/logs"
echo "✅ Directories created"
echo ""

# Generate certificates
echo "🔐 Generating TLS certificates..."
if [ -f "${CERTS_DIR}/ubi-cms.local.crt" ]; then
  read -p "Certificates already exist. Regenerate? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "${CERTS_DIR}"
    bash generate-certs.sh
  else
    echo "⏭️  Skipping certificate generation"
  fi
else
  cd "${CERTS_DIR}"
  bash generate-certs.sh
fi
echo ""

# Create ACME storage file
echo "📝 Creating ACME storage..."
if [ ! -f "${CERTS_DIR}/acme.json" ]; then
  touch "${CERTS_DIR}/acme.json"
  chmod 600 "${CERTS_DIR}/acme.json"
  echo "✅ ACME storage created"
else
  echo "⏭️  ACME storage already exists"
fi
echo ""

# Create environment file
echo "⚙️  Setting up environment..."
if [ ! -f "${SCRIPT_DIR}/.env" ]; then
  cp "${SCRIPT_DIR}/.env.example" "${SCRIPT_DIR}/.env"
  echo "✅ Environment file created from template"
  echo "⚠️  Please update .env with your configuration"
else
  echo "⏭️  Environment file already exists"
fi
echo ""

# Update hosts file
echo "📝 Updating hosts file..."
HOSTS_ENTRIES=(
  "127.0.0.1 ubi-cms.local"
  "127.0.0.1 admin.ubi-cms.local"
  "127.0.0.1 api.ubi-cms.local"
  "127.0.0.1 traefik.ubi-cms.local"
)

HOSTS_FILE="/etc/hosts"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  HOSTS_FILE="C:/Windows/System32/drivers/etc/hosts"
fi

echo "Add these entries to your hosts file (${HOSTS_FILE}):"
echo ""
for entry in "${HOSTS_ENTRIES[@]}"; do
  echo "  $entry"
done
echo ""
read -p "Open hosts file for editing? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sudo nano "$HOSTS_FILE"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo nano "$HOSTS_FILE"
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    notepad "$HOSTS_FILE"
  fi
fi
echo ""

# Trust CA certificate
echo "🔒 Trust CA certificate..."
echo "Install the CA certificate to trust self-signed certificates:"
echo "  CA Certificate: ${CERTS_DIR}/ca.crt"
echo ""
echo "Instructions:"
echo "  - Windows: Double-click ca.crt → Install Certificate → Local Machine → Trusted Root Certification Authorities"
echo "  - macOS: sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${CERTS_DIR}/ca.crt"
echo "  - Linux: sudo cp ${CERTS_DIR}/ca.crt /usr/local/share/ca-certificates/ubi-cms-ca.crt && sudo update-ca-certificates"
echo ""
read -p "Press Enter when done..."
echo ""

# Create Podman network
echo "🌐 Creating Podman network..."
if ! podman network inspect ubi-cms-network &> /dev/null; then
  podman network create ubi-cms-network
  echo "✅ Network created: ubi-cms-network"
else
  echo "⏭️  Network already exists: ubi-cms-network"
fi
echo ""

# Start Traefik
echo "🚀 Starting Traefik..."
read -p "Start Traefik now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd "${SCRIPT_DIR}"
  podman compose -f docker-compose.traefik.yml up -d
  echo ""
  echo "✅ Traefik started successfully!"
  echo ""
  echo "📊 Access points:"
  echo "  - Dashboard: https://traefik.ubi-cms.local"
  echo "  - Metrics:   http://localhost:8082/metrics"
  echo ""
  echo "📝 Check logs:"
  echo "  podman logs -f ubi-cms-traefik"
else
  echo "⏭️  Skipping Traefik startup"
  echo ""
  echo "To start Traefik manually:"
  echo "  cd ${SCRIPT_DIR}"
  echo "  podman compose -f docker-compose.traefik.yml up -d"
fi
echo ""

echo "==================================================================="
echo "✅ Traefik setup complete!"
echo "==================================================================="
echo ""
echo "📋 Next steps:"
echo "  1. Update .env with your configuration"
echo "  2. Review and customize middleware in dynamic/middleware.yml"
echo "  3. Add your services to dynamic/routes.yml or use container labels"
echo "  4. Start your services"
echo "  5. Access the Traefik dashboard at https://traefik.ubi-cms.local"
echo ""
echo "📚 Documentation:"
echo "  - Traefik:       ${SCRIPT_DIR}/README.md"
echo "  - Certificates:  ${CERTS_DIR}/README.md"
echo ""
echo "🔧 Troubleshooting:"
echo "  - View logs:     podman logs ubi-cms-traefik"
echo "  - Check config:  podman exec ubi-cms-traefik traefik healthcheck"
echo "  - Test routes:   curl -k https://ubi-cms.local"
echo ""
echo "==================================================================="
