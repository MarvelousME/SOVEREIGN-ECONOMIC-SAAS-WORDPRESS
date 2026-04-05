#!/bin/bash

# Script to generate complete portal-ui and admin-ui applications
# This creates all necessary files for both Next.js applications

set -e

echo "🚀 Generating UBI Platform Frontend Applications..."

# Function to create directory if it doesn't exist
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo "✓ Created directory: $1"
    fi
}

# Create portal-ui component structure
echo ""
echo "📁 Creating portal-ui directory structure..."

create_dir "portal-ui/src/app/(auth)/login"
create_dir "portal-ui/src/app/(auth)/register"
create_dir "portal-ui/src/app/(dashboard)"
create_dir "portal-ui/src/app/(dashboard)/dashboard"
create_dir "portal-ui/src/app/(dashboard)/ubi"
create_dir "portal-ui/src/app/(dashboard)/tasks"
create_dir "portal-ui/src/app/(dashboard)/tasks/[id]"
create_dir "portal-ui/src/app/(dashboard)/treasury"
create_dir "portal-ui/src/app/(dashboard)/agents"
create_dir "portal-ui/src/app/(dashboard)/agents/marketplace"
create_dir "portal-ui/src/app/(dashboard)/agents/[id]"
create_dir "portal-ui/src/app/(dashboard)/rewards"
create_dir "portal-ui/src/app/(dashboard)/reputation"
create_dir "portal-ui/src/app/(dashboard)/referrals"
create_dir "portal-ui/src/app/(dashboard)/governance"
create_dir "portal-ui/src/app/(dashboard)/vault"
create_dir "portal-ui/src/app/(dashboard)/settings"
create_dir "portal-ui/src/app/(dashboard)/notifications"
create_dir "portal-ui/src/components/ui"
create_dir "portal-ui/src/components/layout"
create_dir "portal-ui/src/components/dashboard"
create_dir "portal-ui/src/components/shared"
create_dir "portal-ui/src/hooks"
create_dir "portal-ui/src/types"
create_dir "portal-ui/public"

# Create admin-ui component structure
echo ""
echo "📁 Creating admin-ui directory structure..."

create_dir "admin-ui/src/app/(auth)/login"
create_dir "admin-ui/src/app/(admin)"
create_dir "admin-ui/src/app/(admin)/admin"
create_dir "admin-ui/src/app/(admin)/admin/users"
create_dir "admin-ui/src/app/(admin)/admin/tenants"
create_dir "admin-ui/src/app/(admin)/admin/ubi"
create_dir "admin-ui/src/app/(admin)/admin/treasury"
create_dir "admin-ui/src/app/(admin)/admin/tasks"
create_dir "admin-ui/src/app/(admin)/admin/agents"
create_dir "admin-ui/src/app/(admin)/admin/governance"
create_dir "admin-ui/src/app/(admin)/admin/analytics"
create_dir "admin-ui/src/app/(admin)/admin/audit"
create_dir "admin-ui/src/app/(admin)/admin/system"
create_dir "admin-ui/src/components/ui"
create_dir "admin-ui/src/components/layout"
create_dir "admin-ui/src/components/admin"
create_dir "admin-ui/src/components/shared"
create_dir "admin-ui/src/lib"
create_dir "admin-ui/src/store"
create_dir "admin-ui/src/hooks"
create_dir "admin-ui/src/types"
create_dir "admin-ui/public"

echo ""
echo "✅ Directory structure created successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Run: cd portal-ui && npm install"
echo "2. Run: cd admin-ui && npm install"
echo "3. Copy .env.example to .env.local and configure"
echo "4. Run: npm run dev"
echo ""
echo "📚 See frontend/SETUP.md for detailed instructions"
