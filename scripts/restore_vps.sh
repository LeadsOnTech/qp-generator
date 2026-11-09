#!/bin/bash
# ==============================================================================
# QuestionStudio Production Database Restore Protocol
# ==============================================================================
# Usage:
#   ./scripts/restore_vps.sh /data/backups/questionstudio/qpgen_YYYYMMDD_HHMMSS.db.gz
# ==============================================================================
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <path_to_backup_file.db.gz> [target_db_path]"
  exit 1
fi

BACKUP_ARCHIVE="$1"
TARGET_DB="${2:-/var/lib/docker/volumes/qpgen-prisma/_data/dev.db}"

if [ ! -f "${BACKUP_ARCHIVE}" ]; then
  echo "ERROR: Backup archive ${BACKUP_ARCHIVE} not found!"
  exit 1
fi

echo "===> Initiating Verified Restore..."
echo "===> Source: ${BACKUP_ARCHIVE}"
echo "===> Target: ${TARGET_DB}"

# 1. Create a safety snapshot of the current active database before restoring
SAFETY_DIR="$(dirname "${TARGET_DB}")/safety_backups"
mkdir -p "${SAFETY_DIR}"
SAFETY_BACKUP="${SAFETY_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).db"

if [ -f "${TARGET_DB}" ]; then
  echo "===> Taking pre-restore safety snapshot..."
  cp "${TARGET_DB}" "${SAFETY_BACKUP}"
  echo "Pre-restore safety snapshot saved at: ${SAFETY_BACKUP}"
fi

# 2. Decompress archive to temporary staging file
TEMP_RESTORE="/tmp/qpgen_restore_temp.db"
rm -f "${TEMP_RESTORE}"
gunzip -c "${BACKUP_ARCHIVE}" > "${TEMP_RESTORE}"

# 3. Verify integrity of the restored database before applying
STATUS=$(python3 -c "
import sqlite3
conn = sqlite3.connect('${TEMP_RESTORE}')
cur = conn.cursor()
cur.execute('PRAGMA integrity_check;')
print(cur.fetchone()[0])
conn.close()
")

if [ "${STATUS}" != "ok" ]; then
  echo "ERROR: Decompressed backup failed integrity check! Aborting restore."
  rm -f "${TEMP_RESTORE}"
  exit 1
fi

# 4. Atomic copy into target database path
cp -f "${TEMP_RESTORE}" "${TARGET_DB}"
chmod 644 "${TARGET_DB}" 2>/dev/null || true
rm -f "${TEMP_RESTORE}"

echo "✅ Restore completed successfully! Target DB updated: ${TARGET_DB}"
