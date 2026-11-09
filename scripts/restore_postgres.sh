#!/bin/bash
# ==============================================================================
# QuestionStudio Production PostgreSQL Restore Protocol
# ==============================================================================
# Usage:
#   ./scripts/restore_postgres.sh <path_to_dump_file>
#
# Environment variables:
#   DATABASE_URL: PostgreSQL connection string (postgresql://user:pass@host:5432/dbname)
# ==============================================================================
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_dump_file>" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file '${BACKUP_FILE}' does not exist." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set." >&2
  exit 1
fi

echo "⚠️  WARNING: You are about to restore database from: ${BACKUP_FILE}"
echo "Target: ${DATABASE_URL}"
echo "Press Ctrl+C within 5 seconds to abort..."
sleep 5

echo "==> Initiating database restore..."
pg_restore --clean --if-exists --no-owner --no-privileges -d "${DATABASE_URL}" "${BACKUP_FILE}"

echo "✅ Database restore successfully completed!"
