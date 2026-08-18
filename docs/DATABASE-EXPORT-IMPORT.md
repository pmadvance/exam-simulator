# Database Export and Import Runbook

Use this when moving the PM exam platform data to another server.

The export/import scripts handle:
- MySQL database dump
- Uploaded files in `apps/api/uploads`
- A safety backup before import resets the target database

---

## Prerequisites

Run these commands from the project root:

```bash
cd ~/pm
```

Make sure the root `.env` exists and contains the same MySQL variables used by Docker:

```env
MYSQL_DATABASE=pm_exam
MYSQL_USER=pm_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_ROOT_PASSWORD=your_mysql_root_password
MYSQL_PORT=3307
```

Make sure MySQL is running:

```bash
docker compose -f infra/docker/docker-compose.yml --env-file .env up -d
docker ps --filter name=pm-mysql
```

---

## 1. Export from the Old Server

Create a full export archive:

```bash
pnpm db:export
```

The archive is created in:

```text
backups/pm_exam_export_YYYYMMDD_HHMMSS.tar.gz
```

It contains:
- `pm_exam_YYYYMMDD_HHMMSS.sql.gz`
- `uploads_YYYYMMDD_HHMMSS.tar.gz`
- `manifest.txt`

If you only want the database and not uploaded files:

```bash
pnpm db:export -- --db-only
```

---

## 2. Copy Export to the New Server

From the old server:

```bash
scp backups/pm_exam_export_YYYYMMDD_HHMMSS.tar.gz deploy@NEW_SERVER_IP:~/
```

Or from your Mac, after downloading the archive:

```bash
scp pm_exam_export_YYYYMMDD_HHMMSS.tar.gz deploy@NEW_SERVER_IP:~/
```

---

## 3. Prepare the New Server

SSH into the new server:

```bash
ssh pm-hetzner
cd ~/pm
```

Start MySQL:

```bash
docker compose -f infra/docker/docker-compose.yml --env-file .env up -d
```

If the app is already running, stop it before import:

```bash
pm2 stop all
```

---

## 4. Import on the New Server

This command first creates a safety backup of the current target server data, then resets the database, imports the dump, and restores uploads:

```bash
pnpm db:import -- --file ~/pm_exam_export_YYYYMMDD_HHMMSS.tar.gz --yes
```

The `--yes` flag is required because the import command drops and recreates `MYSQL_DATABASE`.

If you only want to import the database and skip uploaded files:

```bash
pnpm db:import -- --file ~/pm_exam_export_YYYYMMDD_HHMMSS.tar.gz --yes --db-only
```

The script also accepts plain SQL dump files:

```bash
pnpm db:import -- --file ~/pm_exam_YYYYMMDD_HHMMSS.sql.gz --yes
pnpm db:import -- --file ~/pm_exam_YYYYMMDD_HHMMSS.sql --yes
```

---

## 5. Safety Backup Before Import

Before the import resets anything, the script automatically creates a safety backup of the current target server state:

```text
backups/pre-import/pm_exam_before_import_YYYYMMDD_HHMMSS.tar.gz
```

This backup may contain:
- current database dump, if the database exists
- current `apps/api/uploads`, if the directory exists
- `manifest.txt`

Keep this file until you have confirmed the migration works.

---

## 6. Restart and Verify

Restart the app:

```bash
pm2 restart all
```

Verify the API:

```bash
curl -s http://localhost:4000/health | head -20
```

Check the table count:

```bash
docker exec pm-mysql mysql -u pm_user -p"YOUR_MYSQL_PASSWORD" pm_exam -e "SHOW TABLES;"
```

Check uploaded files:

```bash
find apps/api/uploads -type f | head
```

Then test in the browser:

```text
https://YOUR_DOMAIN
```

---

## 7. Post-Migration Audit Checklist

Use these checks after moving from one server to another. They catch the two most common migration problems for this project: data that exists but is hidden by status fields, and files that exist on disk but are requested through the wrong URL prefix.

### 7.1 Check Database Visibility

Run from `apps/api` so Node can resolve the API dependencies:

```bash
cd ~/pm/apps/api
set -a; . ../../.env; set +a

node - <<'NODE'
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: 1
  });

  const q = async (sql) => (await pool.query(sql))[0];

  console.table(await q(`
    SELECT 'products' item, COUNT(*) count FROM products
    UNION ALL SELECT 'published_products', COUNT(*) FROM products WHERE visibility='published'
    UNION ALL SELECT 'exams', COUNT(*) FROM exams
    UNION ALL SELECT 'visible_published_exams', COUNT(*)
      FROM exams e JOIN products p ON p.id=e.product_id
      WHERE e.status='published' AND p.visibility='published'
    UNION ALL SELECT 'questions', COUNT(*) FROM questions
    UNION ALL SELECT 'published_questions', COUNT(*) FROM questions WHERE status='published'
  `));

  console.log('Hidden exam blockers:');
  console.table(await q(`
    SELECT e.slug examSlug, p.slug productSlug, p.visibility, e.status
    FROM exams e
    JOIN products p ON p.id=e.product_id
    WHERE e.status <> 'published' OR p.visibility <> 'published'
    ORDER BY e.id
  `));

  await pool.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
```

Expected result for the May 2026 Hetzner migration:

```text
products: 13
published_products: 13
exams: 19
visible_published_exams: 19
questions: 133
published_questions: 133
Hidden exam blockers: none
```

If `exams` is greater than `visible_published_exams`, check whether the exam has `status != 'published'` or its parent product has `visibility != 'published'`.

### 7.2 Check Uploaded Files

Compare current uploads to the pre-import backup if one exists:

```bash
cd ~/pm

find apps/api/uploads -type f | sed 's#^apps/api/uploads/##' | sort > /tmp/current_uploads_list.txt

tmp=$(mktemp -d)
tar -xzf backups/pre-import/pm_exam_before_import_YYYYMMDD_HHMMSS.tar.gz \
  -C "$tmp" ./uploads_before_import_YYYYMMDD_HHMMSS.tar.gz
tar -tzf "$tmp/uploads_before_import_YYYYMMDD_HHMMSS.tar.gz" \
  | sed 's#^./##; s#^uploads/##' \
  | grep -v '^$' \
  | grep -v '/$' \
  | sort > /tmp/backup_uploads_list.txt

comm -3 /tmp/backup_uploads_list.txt /tmp/current_uploads_list.txt
rm -rf "$tmp"
```

No output from `comm -3` means the file lists match.

Also verify the live static route:

```bash
curl -I https://YOUR_DOMAIN/uploads/questions/Picture7.png
```

Expected: `HTTP/2 200` or `HTTP/1.1 200`.

### 7.3 Check API Base URL

The frontend API base must be the domain root, not the domain plus `/api`.

Correct:

```env
NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN
```

Wrong:

```env
NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN/api
```

Why this matters:

- API calls are written as `${apiUrl}/api/products`.
- Static uploads are written as `${apiUrl}/uploads/questions/...`.
- If `apiUrl` already includes `/api`, the browser requests `/api/api/products` and `/api/uploads/questions/...`, which both 404.

After changing `NEXT_PUBLIC_API_URL`, rebuild the web app because `NEXT_PUBLIC_*` values are baked into the Next.js client bundle:

```bash
cd ~/pm
pnpm --filter web build
pm2 restart pm-web --update-env
```

Verify:

```bash
curl -sS -o /tmp/products.json -w 'products %{http_code}\n' https://YOUR_DOMAIN/api/products
curl -sS -o /tmp/upload.png -w 'upload %{http_code}\n' https://YOUR_DOMAIN/uploads/questions/Picture7.png
```

Both should return `200`.

---

## Rollback

If the import has problems, use the safety backup created in `backups/pre-import`.

Example:

```bash
pm2 stop all
pnpm db:import -- --file backups/pre-import/pm_exam_before_import_YYYYMMDD_HHMMSS.tar.gz --yes
pm2 restart all
```

This restores the target server to the state it had immediately before the failed import.

---

## Useful Overrides

Use these only if your paths or container name differ from the defaults.

Export to another folder:

```bash
OUTPUT_DIR=/home/deploy/backups pnpm db:export
```

Import using a different `.env`:

```bash
ENV_FILE=/home/deploy/pm/.env pnpm db:import -- --file ~/pm_exam_export_YYYYMMDD_HHMMSS.tar.gz --yes
```

Use a different MySQL container name:

```bash
MYSQL_CONTAINER=my-mysql pnpm db:import -- --file ~/pm_exam_export_YYYYMMDD_HHMMSS.tar.gz --yes
```

Use a different pre-import backup folder:

```bash
BACKUP_DIR=/home/deploy/safety-backups pnpm db:import -- --file ~/pm_exam_export_YYYYMMDD_HHMMSS.tar.gz --yes
```

---

## Command Summary

| Task | Command |
|------|---------|
| Export DB + uploads | `pnpm db:export` |
| Export DB only | `pnpm db:export -- --db-only` |
| Import DB + uploads | `pnpm db:import -- --file ~/pm_exam_export_YYYYMMDD_HHMMSS.tar.gz --yes` |
| Import DB only | `pnpm db:import -- --file ~/pm_exam_export_YYYYMMDD_HHMMSS.tar.gz --yes --db-only` |
| Roll back using safety backup | `pnpm db:import -- --file backups/pre-import/pm_exam_before_import_YYYYMMDD_HHMMSS.tar.gz --yes` |
