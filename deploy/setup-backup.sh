#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="${BACKUP_DIR:-/var/backups/purre-pets}"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)
if [[ -f /root/.purre_mysql ]]; then
  source /root/.purre_mysql
  mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" purre_pets | gzip > "${BACKUP_DIR}/purre_pets_${DATE}.sql.gz"
  echo "Backup DB: ${BACKUP_DIR}/purre_pets_${DATE}.sql.gz"
fi
# Retencja 7 dni
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
echo "Backup zakończony"
