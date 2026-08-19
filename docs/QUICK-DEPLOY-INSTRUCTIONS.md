# Quick Deploy Instructions (Remote)

Use this when you have new code changes and want to deploy safely.

For the current Exabytes production server, see `docs/EXABYTES-PRODUCTION-RUNBOOK.md` for the exact SSH command, deploy helper, backup job, and canonical domain details.

## 1) Go to project folder

```bash
cd /home/deploy/pm
```

## 2) Pull latest code from main

```bash
git pull --ff-only origin main
```

## 3) Install/update dependencies

```bash
pnpm install --frozen-lockfile
```

If lockfile changed and the command fails, run:

```bash
pnpm install
```

## 4) Build

```bash
pnpm build
```

## 5) Run database checks/migrations when needed

For the payment gateway update after commit `9bf2882` (`successful payment with stripe`), there is no new table/column migration. Confirm the existing payment schema is present:

```bash
docker exec pm-mysql mysql -u pm_user -p"YOUR_MYSQL_PASSWORD" pm_exam -e "
SHOW TABLES LIKE 'app_settings';
SHOW TABLES LIKE 'payment_events';
SHOW COLUMNS FROM orders LIKE 'gateway_provider';
SHOW COLUMNS FROM orders LIKE 'gateway_bill_code';
SHOW COLUMNS FROM orders LIKE 'cart_group_id';
"
```

If `cart_group_id` is missing:

```bash
docker exec -i pm-mysql mysql -u pm_user -p"YOUR_MYSQL_PASSWORD" pm_exam < infra/docker/mysql/init/004_add_cart_group.sql
```

See `docs/PAYMENT-GATEWAY-DEPLOYMENT.md` for the full payment gateway runbook.

## 6) Restart services with PM2

```bash
pm2 reload ecosystem.config.cjs
pm2 save
```

## 7) Verify everything is healthy

```bash
pm2 status
pm2 logs pm-api --lines 30 --nostream
pm2 logs pm-web --lines 30 --nostream
curl http://localhost:4000/health
```

---

## One-line deploy (normal case)

```bash
cd /home/deploy/pm && git pull --ff-only origin main && pnpm install --frozen-lockfile && pnpm build && pm2 reload ecosystem.config.cjs && pm2 save && pm2 status
```

---

## If `pm-web` or `pm-api` is errored

```bash
cd /home/deploy/pm
pnpm build
pm2 delete pm-web pm-api
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

Check logs:

```bash
pm2 logs pm-web --lines 100 --nostream
pm2 logs pm-api --lines 100 --nostream
```

---

## First-time setup on a new server (run once)

```bash
cd /home/deploy/pm
pnpm install
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd
```

After `pm2 startup systemd`, copy and run the sudo command shown in terminal.

---

## Create Super Admin User

To create the first super admin (or add additional super admins), use the CLI script:

```bash
cd apps/api
npx tsx scripts/create-super-admin.ts <email> <password> [full_name]
```

**Examples:**

```bash
# Create new super admin
cd apps/api
npx tsx scripts/create-super-admin.ts admin@mycompany.com SecurePass123 'John Doe'

# Update existing super admin's password (use --force)
cd apps/api
npx tsx scripts/create-super-admin.ts admin@mycompany.com NewPassword 'John Doe' --force
```

**Prerequisites:**
- MySQL must be running and accessible
- `.env` file in project root with `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`

**If you get ECONNREFUSED error:**
1. Check if MySQL is running: `docker ps` (if using Docker) or `brew services list` (if using Homebrew on Mac)
2. Start MySQL if needed: `docker compose up -d db` or `brew services start mysql`
3. Verify the port in `.env` matches your MySQL instance (default is 3306, but your `.env` might use 3307)
4. Add `MYSQL_HOST=localhost` to your `.env` if it's missing

**What it does:**
- Creates a new user with `super_admin` role, OR
- Updates an existing user to `super_admin` role (and resets password)
- Validates email format and password length (min 8 characters)
- Use `--force` flag to update password for existing super admins

**After creation:**
- Access the admin portal at `/admin/login`
- Login with the credentials you just created
- Only `super_admin` can create other admin users or change user roles

**Script location:** `apps/api/scripts/create-super-admin.ts`
