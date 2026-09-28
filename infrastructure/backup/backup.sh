#!/usr/bin/env sh
set -eu
DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
OUT="$DIR/artifacts"
mkdir -p "$OUT"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$OUT/meddonish-$STAMP.sql"
KEEP=7

docker exec meddonish-postgres pg_dump -U meddonish -d meddonish --no-owner --no-privileges > "$FILE"
test -s "$FILE"

ls -1t "$OUT"/meddonish-*.sql 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "$FILE"
