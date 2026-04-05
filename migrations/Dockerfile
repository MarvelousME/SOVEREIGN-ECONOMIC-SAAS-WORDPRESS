FROM node:18-alpine

WORKDIR /app

# Install node-pg-migrate
RUN npm install -g node-pg-migrate@6.2.2

# Copy migration files
COPY migrations/ ./migrations/
COPY package.json ./

# Install dependencies
RUN npm install --production

# Default command
CMD ["node-pg-migrate", "up"]
