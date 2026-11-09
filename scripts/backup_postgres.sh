#!/bin/bash
# ==============================================================================
# QuestionStudio Production PostgreSQL Backup Protocol
# ==============================================================================
# Usage:
#   ./scripts/backup_postgres.sh [optional_output_dir]
#
# Environment variables:
#   DATABASE_URL: PostgreSQL connection string (postgresql://user:pass@host:5432/dbname)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${1:-./backups/postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/qpgen_prod_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set." >&2
  exit 1
fi

echo "==> Initiating Verified PostgreSQL Backup..."
echo "==> Target File: ${BACKUP_FILE}"

# Execute custom-format compressed backup with schema and data
pg_dump -Fc --no-owner --no-privileges -d "${DATABASE_URL}" -f "${BACKUP_FILE}"

# Verify backup integrity
echo "==> Verifying backup archive integrity..."
pg_restore --list "${BACKUP_FILE}" > /dev/null

BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "✅ Backup successfully created and verified! (Size: ${BACKUP_SIZE})"
echo "==> Permanent archive stored at: ${BACKUP_FILE}"
echo "NOTE: Backups are persistent and will NOT be automatically deleted."
