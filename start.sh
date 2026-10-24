#!/bin/sh
set -e

echo "=== Starting QP Generator ==="

# Set environment defaults if not provided by host/Coolify
export PORT="${PORT:-4000}"
export DATABASE_URL="${DATABASE_URL:-file:/app/backend/prisma/dev.db}"
export JWT_SECRET="${JWT_SECRET:-qp-generator-prod-jwt-secret-key-2026}"
export NODE_ENV="${NODE_ENV:-production}"

# Navigate to backend directory
cd /app/backend 2>/dev/null || cd backend 2>/dev/null || true

# Ensure persistent directories exist
mkdir -p /app/backend/prisma /app/backend/uploads/images /app/backend/uploads/cards ./prisma ./uploads/images ./uploads/cards 2>/dev/null || true

echo "Applying database schema..."
npx prisma db push --skip-generate

echo "Seeding default admin and starter syllabus..."
node prisma/seed.js

echo "Launching application server on port $PORT..."
exec node src/server.js
