#!/bin/sh
set -e

echo "=== Starting QP Generator ==="

# Go to backend directory
cd /app/backend 2>/dev/null || cd backend 2>/dev/null || true

# Generate Prisma Client if not already generated
npx prisma generate || true

# Synchronize SQLite database schema
npx prisma db push --skip-generate || true

# Seed default admin and initial syllabus if not already seeded
node prisma/seed.js || true

# Start Express server on PORT (default 4000)
echo "Launching server on port ${PORT:-4000}..."
exec node src/server.js
