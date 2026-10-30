#!/bin/sh
set -e

echo "=== Starting QuestionStudio ==="

# Set environment defaults if not provided by host/Coolify
export PORT="${PORT:-4000}"
export DATABASE_URL="${DATABASE_URL:-file:/app/backend/prisma/dev.db}"
export JWT_SECRET="${JWT_SECRET:-qp-generator-prod-jwt-secret-key-2026}"
export NODE_ENV="${NODE_ENV:-production}"

# Navigate to backend directory
cd /app/backend 2>/dev/null || cd backend 2>/dev/null || true

# Ensure persistent directories exist
mkdir -p /app/backend/prisma /app/backend/uploads/images /app/backend/uploads/cards ./prisma ./uploads/images ./uploads/cards 2>/dev/null || true

# Synchronize fresh schema.prisma and seed.js from image template into persistent volume directory
if [ -d "/app/backend/prisma-template" ]; then
  echo "Syncing latest schema.prisma and seed.js to persistent volume..."
  cp -f /app/backend/prisma-template/schema.prisma /app/backend/prisma/schema.prisma 2>/dev/null || true
  cp -f /app/backend/prisma-template/seed.js /app/backend/prisma/seed.js 2>/dev/null || true
  cp -f /app/backend/prisma-template/schema.prisma ./prisma/schema.prisma 2>/dev/null || true
  cp -f /app/backend/prisma-template/seed.js ./prisma/seed.js 2>/dev/null || true
fi

echo "Applying database schema..."
npx prisma db push --accept-data-loss --skip-generate || true

echo "Regenerating Prisma client against live schema..."
npx prisma generate || true

echo "Seeding default admin and starter syllabus..."
node prisma/seed.js || true

echo "Syncing common entrance exams and mappings..."
node -e "require('./src/lib/multiExamSync').distributeAllExistingQuestions().then(n => console.log('Multi-exam sync done, mapped questions:', n)).catch(console.error)" || true

echo "Launching application server on port $PORT..."
exec node src/server.js
