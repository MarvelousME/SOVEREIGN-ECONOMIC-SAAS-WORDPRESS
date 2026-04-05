FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production

EXPOSE 3011
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \n  CMD wget --no-verbose --tries=1 --spare http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
