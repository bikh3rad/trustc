#!/bin/sh
# Apply every .sql under /migrations/<service>/ in lexicographic order.
# Each file should be idempotent (CREATE TABLE IF NOT EXISTS, etc.).
set -eu

PSQL="psql -h postgres -U trustc -d trustc -v ON_ERROR_STOP=1"

for svc_dir in /migrations/*/; do
  svc=$(basename "$svc_dir")
  echo ">>> Migrating schema: $svc"
  for f in "$svc_dir"*.sql; do
    [ -f "$f" ] || continue
    echo "   applying $(basename "$f")"
    $PSQL -f "$f"
  done
done

echo ">>> All migrations applied."
