# Multi-stage Dockerfile for QP Generator (Coolify / Production)

# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Server ---
FROM node:20-slim AS runner
WORKDIR /app

# Install OpenSSL for Prisma engine & certificates
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production=false

# Copy backend source
COPY backend/ ./backend/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set production environment variables
ENV PORT=4000
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/backend/prisma/dev.db"
ENV JWT_SECRET="qp-generator-prod-jwt-secret-key-2026"

# Generate Prisma Client
WORKDIR /app/backend
RUN npx prisma generate

# Create persistent storage directories
RUN mkdir -p /app/backend/uploads/images /app/backend/uploads/cards /app/backend/prisma

EXPOSE 4000

# On container start: run start.sh
CMD ["/app/start.sh"]
