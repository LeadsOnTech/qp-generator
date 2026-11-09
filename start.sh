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

# Synchronize fresh schema.prisma, migrations, and seed.js from image template into persistent volume directory
if [ -d "/app/backend/prisma-template" ]; then
  echo "Syncing latest schema.prisma, migrations, and seed.js to persistent volume..."
  cp -f /app/backend/prisma-template/schema.prisma /app/backend/prisma/schema.prisma 2>/dev/null || true
  cp -f /app/backend/prisma-template/seed.js /app/backend/prisma/seed.js 2>/dev/null || true
  cp -rf /app/backend/prisma-template/migrations /app/backend/prisma/ 2>/dev/null || true
  cp -rf /app/backend/prisma-template/migrations_postgresql /app/backend/prisma/ 2>/dev/null || true
  cp -f /app/backend/prisma-template/schema.prisma ./prisma/schema.prisma 2>/dev/null || true
  cp -f /app/backend/prisma-template/seed.js ./prisma/seed.js 2>/dev/null || true
  cp -rf /app/backend/prisma-template/migrations ./prisma/ 2>/dev/null || true
  cp -rf /app/backend/prisma-template/migrations_postgresql ./prisma/ 2>/dev/null || true
fi

# Detect database provider from connection string
IS_POSTGRES=0
case "$DATABASE_URL" in
  postgres://*|postgresql://*)
    IS_POSTGRES=1
    ;;
esac

if [ "$IS_POSTGRES" -eq 1 ]; then
  echo "==> Production Database Connection: PostgreSQL detected."
  # Adjust provider to postgresql if needed in schema.prisma
  if grep -q 'provider = "sqlite"' prisma/schema.prisma 2>/dev/null; then
    echo "Configuring Prisma provider to 'postgresql' for PostgreSQL datasource..."
    sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma 2>/dev/null || true
    [ -f "/app/backend/prisma/schema.prisma" ] && sed -i 's/provider = "sqlite"/provider = "postgresql"/' /app/backend/prisma/schema.prisma 2>/dev/null || true
  fi

  # Switch to PostgreSQL migrations directory if available
  if [ -d "prisma/migrations_postgresql" ]; then
    echo "Switching to PostgreSQL version-controlled migrations..."
    rm -rf prisma/migrations_backup 2>/dev/null || true
    mv prisma/migrations prisma/migrations_backup 2>/dev/null || true
    cp -rf prisma/migrations_postgresql prisma/migrations 2>/dev/null || true
  fi

  echo "==> Applying committed migrations via 'prisma migrate deploy' (Production Safe)..."
  npx prisma migrate deploy || {
    echo "==> Notice: Existing production schema detected (P3005). Baselining migrations..."
    npx prisma migrate resolve --applied 20261106180000_phase4_baseline 2>/dev/null || true
  }

  echo "==> Regenerating Prisma client for PostgreSQL schema..."
  npx prisma generate
else
  echo "==> Database Connection: SQLite detected."
  echo "==> Applying committed migrations via 'prisma migrate deploy'..."
  npx prisma migrate deploy || true

  echo "==> Regenerating Prisma client..."
  npx prisma generate
fi

echo "Seeding default admin and starter syllabus (idempotent)..."
node prisma/seed.js || true

echo "Syncing common entrance exams and mappings..."
node -e "require('./src/lib/multiExamSync').distributeAllExistingQuestions().then(n => console.log('Multi-exam sync done, mapped questions:', n)).catch(console.error)" || true

echo "Launching application server on port $PORT..."
exec node src/server.js
