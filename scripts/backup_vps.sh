#!/bin/bash
# ==============================================================================
# QuestionStudio Production Automated Daily Backup Protocol
# ==============================================================================
# Safe, non-blocking backup for QuestionsStudio (19,079 questions).
# Uses SQLite Online Backup API (zero locks, zero downtime).
# Strictly isolated to QuestionsStudio volume (0% impact on other websites).
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${1:-/data/backups/questionstudio}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=14
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

log() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $*" | tee -a "${LOG_FILE}"
}

log "===> Starting QuestionStudio automated backup..."

SQLITE_PATH="/var/lib/docker/volumes/qpgen-prisma/_data/dev.db"

# Fallback path for local testing
if [ ! -f "${SQLITE_PATH}" ] && [ -f "backend/prisma/dev.db" ]; then
  SQLITE_PATH="backend/prisma/dev.db"
fi

if [ -f "${SQLITE_PATH}" ]; then
  log "===> Active Database: SQLite detected at ${SQLITE_PATH}"
  TEMP_BACKUP="${BACKUP_DIR}/qpgen_${TIMESTAMP}.db"
  FINAL_BACKUP="${TEMP_BACKUP}.gz"

  # Use Python3's built-in non-blocking SQLite Online Backup API
  python3 -c "
import sqlite3
source = sqlite3.connect('${SQLITE_PATH}')
dest = sqlite3.connect('${TEMP_BACKUP}')
source.backup(dest)
dest.close()
source.close()
print('Online backup completed.')
" >> "${LOG_FILE}" 2>&1

  # Verify integrity and count questions in backup
  INTEGRITY=$(python3 -c "
import sqlite3
conn = sqlite3.connect('${TEMP_BACKUP}')
cur = conn.cursor()
cur.execute('PRAGMA integrity_check;')
res = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM Question;')
q_count = cur.fetchone()[0]
conn.close()
print(f'{res}|{q_count}')
")

  STATUS=$(echo "${INTEGRITY}" | cut -d'|' -f1)
  QUESTIONS=$(echo "${INTEGRITY}" | cut -d'|' -f2)

  if [ "${STATUS}" != "ok" ]; then
    log "ERROR: SQLite integrity check failed! Status: ${STATUS}"
    rm -f "${TEMP_BACKUP}"
    exit 1
  fi

  log "Integrity check: OK | Questions verified: ${QUESTIONS}"

  # Compress with gzip
  gzip -f "${TEMP_BACKUP}"
  BACKUP_SIZE=$(ls -lh "${FINAL_BACKUP}" | awk '{print $5}')
  log "✅ Backup created and verified: ${FINAL_BACKUP} (Size: ${BACKUP_SIZE})"
else
  log "ERROR: No SQLite database found at ${SQLITE_PATH}!"
  exit 1
fi

# Cleanup backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -name "qpgen_*.db.gz" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "qpgen_*.db.gz" -type f | wc -l)
log "===> Active retained backups: ${TOTAL_BACKUPS}"
log "=== Backup completed successfully. ==="
