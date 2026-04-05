#!/bin/bash
# Initialize ledger database schema

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ubi_cms}"
DB_USER="${DB_USER:-ubi_user}"

echo "Initializing ledger database schema..."
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/001_init_ledger.sql

echo "✓ Database schema initialized successfully"
