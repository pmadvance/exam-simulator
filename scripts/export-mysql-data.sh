#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/backups}"
CONTAINER_NAME="${MYSQL_CONTAINER:-pm-mysql}"
UPLOADS_DIR="${UPLOADS_DIR:-$ROOT_DIR/apps/api/uploads}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

usage() {
  cat <<EOF
Usage: $(basename "$0") [--db-only]

Creates a portable export archive in:
  $OUTPUT_DIR

Environment overrides:
  ENV_FILE=/path/to/.env
  OUTPUT_DIR=/path/to/backups
  MYSQL_CONTAINER=pm-mysql
  UPLOADS_DIR=/path/to/uploads
EOF
}

DB_ONLY=false
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
elif [[ "${1:-}" == "--db-only" ]]; then
  DB_ONLY=true
elif [[ $# -gt 0 ]]; then
  usage >&2
  exit 1
fi

load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing env file: $ENV_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

load_env
require_cmd docker
require_cmd gzip
require_cmd tar

MYSQL_DATABASE="${MYSQL_DATABASE:-pm_exam}"
MYSQL_USER="${MYSQL_USER:-pm_user}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-pm_password}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "MySQL container is not running: $CONTAINER_NAME" >&2
  echo "Start it first, for example:" >&2
  echo "  docker compose -f infra/docker/docker-compose.yml --env-file .env up -d" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

DUMP_FILE="$WORK_DIR/${MYSQL_DATABASE}_${TIMESTAMP}.sql.gz"
UPLOADS_FILE="$WORK_DIR/uploads_${TIMESTAMP}.tar.gz"
MANIFEST_FILE="$WORK_DIR/manifest.txt"
ARCHIVE_NAME="${MYSQL_DATABASE}_export_${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="$OUTPUT_DIR/$ARCHIVE_NAME"

echo "Creating MySQL dump for database: $MYSQL_DATABASE"
docker exec \
  -e MYSQL_PWD="$MYSQL_PASSWORD" \
  "$CONTAINER_NAME" \
  mysqldump \
    --user="$MYSQL_USER" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    --default-character-set=utf8mb4 \
    --set-gtid-purged=OFF \
    --no-tablespaces \
    "$MYSQL_DATABASE" | gzip -9 > "$DUMP_FILE"

if [[ "$DB_ONLY" == false ]]; then
  if [[ -d "$UPLOADS_DIR" ]]; then
    echo "Adding uploaded files from: $UPLOADS_DIR"
    tar -C "$(dirname "$UPLOADS_DIR")" -czf "$UPLOADS_FILE" "$(basename "$UPLOADS_DIR")"
  else
    echo "Uploads directory not found, skipping: $UPLOADS_DIR"
  fi
fi

{
  echo "Created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Database: $MYSQL_DATABASE"
  echo "MySQL user: $MYSQL_USER"
  echo "Container: $CONTAINER_NAME"
  echo "Source env: $ENV_FILE"
  echo "Includes uploads: $([[ -f "$UPLOADS_FILE" ]] && echo yes || echo no)"
  echo
  echo "Restore database:"
  echo "  gunzip -c $(basename "$DUMP_FILE") | docker exec -i $CONTAINER_NAME mysql -u $MYSQL_USER -p $MYSQL_DATABASE"
  if [[ -f "$UPLOADS_FILE" ]]; then
    echo
    echo "Restore uploads, from repo root:"
    echo "  tar -xzf $(basename "$UPLOADS_FILE") -C apps/api"
  fi
} > "$MANIFEST_FILE"

echo "Packaging export archive: $ARCHIVE_PATH"
tar -C "$WORK_DIR" -czf "$ARCHIVE_PATH" .

echo
echo "Export complete:"
echo "  $ARCHIVE_PATH"
echo
echo "Copy to another server with:"
echo "  scp \"$ARCHIVE_PATH\" deploy@NEW_SERVER_IP:~/"
