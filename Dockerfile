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

# Copy backend files
COPY backend/ ./backend/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Generate Prisma Client
WORKDIR /app/backend
RUN npx prisma generate

# Create persistent storage directories
RUN mkdir -p /app/backend/uploads/images /app/backend/uploads/cards /app/backend/prisma

EXPOSE 4000
ENV PORT=4000
ENV NODE_ENV=production

# On container start: sync schema with db push, seed initial admin & NEET syllabus if fresh, then start server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node prisma/seed.js && node src/server.js"]
