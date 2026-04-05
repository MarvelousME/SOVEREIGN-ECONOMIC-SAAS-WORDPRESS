#!/bin/bash
# UBI-CMS Local Development Setup Script
# This script sets up your local development environment
# Usage: bash api/setup-dev.sh

set -euo pipefail

echo "==================================="
echo " UBI-CMS Local Dev Setup"
echo "==================================="

# Check prerequisites
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "ERROR: $1 is not installed. Please install it first."
        exit 1
    fi
}

check_command docker
check_command node
check_command npm

echo ""
echo "1. Starting local Docker services..."
docker compose -f docker-compose.local.yml up -d postgres redis

echo ""
echo "2. Waiting for PostgreSQL to be ready..."
until docker exec ubi-postgres-local pg_isready -U postgres -d ubi_dev > /dev/null 2>&1; do
    printf "."
    sleep 2
done
echo " Ready!"

echo ""
echo "3. Installing API dependencies..."
cd api
npm install

echo ""
echo "4. API is ready. Start it with:"
echo "   cd api && node src/index.js"
echo ""
echo "==================================="
echo " Dev environment is ready!"
echo "==================================="
echo ""
echo " Database: postgresql://postgres:devpassword123@localhost:5432/ubi_dev"
echo " Redis:    redis://localhost:6379"
echo " API:      http://localhost:3000"
echo ""
echo " Test credentials:"
echo "   admin / Admin@123456"
echo "   alice / Admin@123456"
echo "   bob   / Admin@123456"
echo ""
echo " Test the API:"
echo "   curl http://localhost:3000/health"
echo '   curl -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '"'"'{"username":"admin","password":"Admin@123456"}'"'"
