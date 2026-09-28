#!/usr/bin/env sh
set -eu
FILE="${1:-}"
test -n "$FILE"
test -f "$FILE"
docker exec -i meddonish-postgres psql -U meddonish -d meddonish < "$FILE"
echo restored
