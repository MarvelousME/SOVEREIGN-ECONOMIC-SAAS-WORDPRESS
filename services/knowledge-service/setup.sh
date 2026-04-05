#!/bin/bash

echo "Setting up Knowledge Service..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Create logs directory
echo "Creating logs directory..."
mkdir -p logs

# Copy environment file
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cp .env.example .env
  echo "⚠️  Please update .env with your configuration"
fi

# Build the service
echo "Building TypeScript..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration (OpenAI API key, database credentials, etc.)"
echo "2. Start dependencies: podman compose up -d postgres qdrant redis nats"
echo "3. Run the service: npm run dev"
echo ""
