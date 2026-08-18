#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
CONTAINER_NAME="${MYSQL_CONTAINER:-pm-mysql}"
UPLOADS_DIR="${UPLOADS_DIR:-$ROOT_DIR/apps/api/uploads}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/pre-import}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

usage() {
  cat <<EOF
Usage: $(basename "$0") --file PATH --yes [--db-only]

Drops and recreates the target database, then imports data from a dump.

Accepted files:
  *.tar.gz export archive created by pnpm db:export
  *.sql.gz plain compressed MySQL dump
  *.sql plain MySQL dump

Required:
  --file PATH    Dump/archive to import
  --yes          Confirm destructive database reset

Options:
  --db-only      Do not restore uploaded files from an export archive

Environment overrides:
  ENV_FILE=/path/to/.env
  MYSQL_CONTAINER=pm-mysql
  UPLOADS_DIR=/path/to/uploads
  BACKUP_DIR=/path/to/pre-import-backups
EOF
}

IMPORT_FILE=""
CONFIRMED=false
DB_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      IMPORT_FILE="${2:-}"
      shift 2
      ;;
    --yes)
      CONFIRMED=true
      shift
      ;;
    --db-only)
      DB_ONLY=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
done

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

mysql_exec() {
  docker exec \
    -e MYSQL_PWD="$MYSQL_PASSWORD" \
    "$CONTAINER_NAME" \
    mysql \
      --user="$MYSQL_USER" \
      --default-character-set=utf8mb4 \
      "$@"
}

mysql_root_exec() {
  docker exec \
    -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" \
    "$CONTAINER_NAME" \
    mysql \
      --user=root \
      --default-character-set=utf8mb4 \
      "$@"
}

mysql_import() {
  docker exec -i \
    -e MYSQL_PWD="$MYSQL_PASSWORD" \
    "$CONTAINER_NAME" \
    mysql \
      --user="$MYSQL_USER" \
      --default-character-set=utf8mb4 \
      "$MYSQL_DATABASE"
}

database_exists() {
  local result
  result="$(mysql_root_exec --batch --skip-column-names -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$MYSQL_DATABASE';")"
  [[ "$result" == "$MYSQL_DATABASE" ]]
}

create_pre_import_backup() {
  local backup_work_dir="$WORK_DIR/pre-import-backup"
  local dump_file="$backup_work_dir/${MYSQL_DATABASE}_before_import_${TIMESTAMP}.sql.gz"
  local uploads_file="$backup_work_dir/uploads_before_import_${TIMESTAMP}.tar.gz"
  local manifest_file="$backup_work_dir/manifest.txt"
  local archive_path="$BACKUP_DIR/${MYSQL_DATABASE}_before_import_${TIMESTAMP}.tar.gz"

  mkdir -p "$backup_work_dir" "$BACKUP_DIR"

  if database_exists; then
    echo "Creating safety backup before reset: $archive_path"
    docker exec \
      -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" \
      "$CONTAINER_NAME" \
      mysqldump \
        --user=root \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --hex-blob \
        --default-character-set=utf8mb4 \
        --set-gtid-purged=OFF \
        --no-tablespaces \
        "$MYSQL_DATABASE" | gzip -9 > "$dump_file"
  else
    echo "Database does not exist yet, skipping database safety dump: $MYSQL_DATABASE"
  fi

  if [[ -d "$UPLOADS_DIR" ]]; then
    echo "Adding current uploads to safety backup: $UPLOADS_DIR"
    tar -C "$(dirname "$UPLOADS_DIR")" -czf "$uploads_file" "$(basename "$UPLOADS_DIR")"
  fi

  {
    echo "Created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "Reason: automatic safety backup before import"
    echo "Database: $MYSQL_DATABASE"
    echo "Container: $CONTAINER_NAME"
    echo "Includes database: $([[ -f "$dump_file" ]] && echo yes || echo no)"
    echo "Includes uploads: $([[ -f "$uploads_file" ]] && echo yes || echo no)"
  } > "$manifest_file"

  tar -C "$backup_work_dir" -czf "$archive_path" .
  echo "Safety backup complete: $archive_path"
}

load_env
require_cmd docker
require_cmd gzip
require_cmd tar

MYSQL_DATABASE="${MYSQL_DATABASE:-pm_exam}"
MYSQL_USER="${MYSQL_USER:-pm_user}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-pm_password}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"

if [[ -z "$IMPORT_FILE" ]]; then
  echo "Missing required --file PATH" >&2
  usage >&2
  exit 1
fi

if [[ ! -f "$IMPORT_FILE" ]]; then
  echo "Import file not found: $IMPORT_FILE" >&2
  exit 1
fi

if [[ "$CONFIRMED" != true ]]; then
  echo "Refusing to continue without --yes." >&2
  echo "This will DROP and recreate database: $MYSQL_DATABASE" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "MySQL container is not running: $CONTAINER_NAME" >&2
  echo "Start it first, for example:" >&2
  echo "  docker compose -f infra/docker/docker-compose.yml --env-file .env up -d" >&2
  exit 1
fi

case "$IMPORT_FILE" in
  *.tar.gz|*.tgz)
    echo "Unpacking export archive: $IMPORT_FILE"
    tar -xzf "$IMPORT_FILE" -C "$WORK_DIR"
    DUMP_FILE="$(find "$WORK_DIR" -maxdepth 1 -type f \( -name '*.sql.gz' -o -name '*.sql' \) | head -n 1)"
    UPLOADS_FILE="$(find "$WORK_DIR" -maxdepth 1 -type f -name 'uploads_*.tar.gz' | head -n 1 || true)"
    ;;
  *.sql.gz|*.sql)
    DUMP_FILE="$IMPORT_FILE"
    UPLOADS_FILE=""
    ;;
  *)
    echo "Unsupported import file type: $IMPORT_FILE" >&2
    usage >&2
    exit 1
    ;;
esac

if [[ -z "${DUMP_FILE:-}" || ! -f "$DUMP_FILE" ]]; then
  echo "No SQL dump found in: $IMPORT_FILE" >&2
  exit 1
fi

create_pre_import_backup

echo "Resetting database: $MYSQL_DATABASE"
mysql_root_exec <<SQL
DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`;
CREATE DATABASE \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
SQL

echo "Importing dump: $DUMP_FILE"
case "$DUMP_FILE" in
  *.sql.gz)
    gunzip -c "$DUMP_FILE" | mysql_import
    ;;
  *.sql)
    mysql_import < "$DUMP_FILE"
    ;;
esac

if [[ "$DB_ONLY" == false && -n "${UPLOADS_FILE:-}" && -f "$UPLOADS_FILE" ]]; then
  echo "Restoring uploads to: $UPLOADS_DIR"
  rm -rf "$UPLOADS_DIR"
  mkdir -p "$(dirname "$UPLOADS_DIR")"
  tar -xzf "$UPLOADS_FILE" -C "$(dirname "$UPLOADS_DIR")"
elif [[ "$DB_ONLY" == false ]]; then
  echo "No uploads archive found, skipping uploaded files."
fi

TABLE_COUNT="$(mysql_exec --batch --skip-column-names "$MYSQL_DATABASE" -e 'SHOW TABLES;' | wc -l | tr -d ' ')"

echo
echo "Import complete."
echo "Database: $MYSQL_DATABASE"
echo "Tables imported: $TABLE_COUNT"
