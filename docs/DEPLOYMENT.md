# VPS Deployment Guide — PM Practice Exam Platform

> **Target**: Exabytes NVMe C2 (2 vCPU / 4GB RAM / 100GB NVMe)
> **OS**: Ubuntu 22.04 LTS
> **Audience**: First-time VPS setup (zero prior experience)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [VPS Purchase & Initial Access](#1-vps-purchase--initial-access)
3. [Secure the Server](#2-secure-the-server)
4. [Install System Dependencies](#3-install-system-dependencies)
5. [Install Docker (for MySQL)](#4-install-docker-for-mysql)
6. [Install Node.js 22 & pnpm](#5-install-nodejs-22--pnpm)
7. [Deploy the Application Code](#6-deploy-the-application-code)
8. [Configure Environment Variables](#7-configure-environment-variables)
9. [Start the Database](#8-start-the-database)
10. [Build & Start the Application](#9-build--start-the-application)
11. [Set Up Nginx Reverse Proxy](#10-set-up-nginx-reverse-proxy)
12. [Enable HTTPS with Let's Encrypt](#11-enable-https-with-lets-encrypt)
13. [Point Your Domain](#12-point-your-domain)
14. [Post-Deployment Checklist](#13-post-deployment-checklist)
15. [Maintenance & Operations](#14-maintenance--operations)
16. [Troubleshooting](#15-troubleshooting)
17. [Git Workflow & Staging Environment](#16-git-workflow--staging-environment)
18. [Quick Reference Commands](#quick-reference-commands)

---

## Architecture Overview

```
Internet
   │
   ▼
┌──────────────┐
│   Nginx      │  :80 / :443   (reverse proxy + SSL termination)
│   (public)   │
└──┬───────┬───┘
   │       │
   ▼       ▼
┌──────┐ ┌──────┐
│ Web  │ │ API  │
│:3000 │ │:4000 │   (Node.js processes managed by PM2)
└──────┘ └──┬───┘
            │
            ▼
       ┌─────────┐
       │ MySQL   │
       │ 8.4     │   (Docker container, port 3307)
       └─────────┘
```

- **Nginx** faces the internet on ports 80/443, terminates SSL, and forwards traffic
- **Web** (Next.js 15) serves the frontend on port 3000 (internal only)
- **API** (Express 5) serves the backend on port 4000 (internal only)
- **MySQL 8.4** runs inside Docker for easy schema management
- **PM2** keeps both Node.js processes alive and restarts them if they crash

---

## 1. VPS Purchase & Initial Access

### 1.1 — Order the VPS

1. Go to https://www.exabytes.my/servers/nvme-vps
2. Select **NVMe C2** (2 vCPU / 4GB RAM / 100GB NVMe) — recommended for this stack
3. Choose **Ubuntu 22.04 LTS** as the operating system
4. **Do NOT add cPanel/Plesk** — we will configure everything manually (cheaper and more control)
5. Complete payment

After provisioning (~3 minutes), Exabytes sends you an email with:
- **IP address** (e.g. `103.xx.xx.xx`)
- **Root password**
- **SolusVM panel URL** (for reboots, console access, reinstalls)

### 1.2 — Connect via SSH

On your Mac, open Terminal:

```bash
ssh root@YOUR_SERVER_IP
```

Type `yes` when asked about the fingerprint, then enter the root password from the email.

> **Tip**: Save the SolusVM panel URL as a bookmark. If you lock yourself out of SSH, you can use the VNC console there.

---

## 2. Secure the Server

These steps prevent bots and attackers from accessing your server. **Do all of them before anything else.**

### 2.1 — Update system packages

```bash
apt update && apt upgrade -y
```

### 2.2 — Create a non-root user

Never run your application as `root`. Create a dedicated user:

```bash
adduser deploy
# Enter a strong password when prompted, skip the rest with Enter

usermod -aG sudo deploy
```

### 2.3 — Set up SSH key authentication (recommended)

On **your Mac** (not the server), generate a key pair if you don't have one:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
# Press Enter to accept default location (~/.ssh/id_ed25519)
```

Copy the key to the server:

```bash
ssh-copy-id deploy@YOUR_SERVER_IP
```

Test it works:

```bash
ssh deploy@YOUR_SERVER_IP
# Should log in WITHOUT asking for a password
```

### 2.4 — Disable root login and password authentication

```bash
sudo nano /etc/ssh/sshd_config
```

Find and change these lines:

```
PermitRootLogin no
PasswordAuthentication no
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`), validate the file, and reload SSH:

```bash
sudo /usr/sbin/sshd -t
sudo systemctl reload ssh
```

> **Warning**: Before closing your current terminal, open a **new terminal tab** and test `ssh deploy@YOUR_SERVER_IP` to make sure it works. If it doesn't, you can fix it from the still-open session.

### 2.5 — Configure the firewall

The production server uses SSH port `8288`. Allow that port **before** changing
the SSH daemon configuration or enabling UFW:

```bash
sudo ufw allow 8288/tcp comment 'SSH'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Type `y` to confirm. This blocks all ports except SSH (8288), HTTP (80), and
HTTPS (443). The `OpenSSH` UFW profile normally permits port 22 only; it does
not automatically follow a custom `Port` value in `sshd_config`.

Before ending the current SSH session, validate the configuration and confirm
the custom port is listening:

```bash
sudo /usr/sbin/sshd -t
sudo ss -ltnp | grep ':8288'
sudo ufw status
```

Open a second terminal and verify `ssh -p 8288 deploy@YOUR_SERVER_IP` works.

### 2.6 — Set the timezone

```bash
sudo timedatectl set-timezone Asia/Kuala_Lumpur
```

---

## 3. Install System Dependencies

Log in as the `deploy` user for all remaining steps:

```bash
ssh deploy@YOUR_SERVER_IP
```

Install required packages:

```bash
sudo apt install -y git curl wget build-essential
```

---

## 4. Install Docker (for MySQL)

We use Docker only for MySQL — it makes database setup and backups much easier.

```bash
# Add Docker's official GPG key and repository
curl -fsSL https://get.docker.com | sudo sh

# Allow the deploy user to run Docker without sudo
sudo usermod -aG docker deploy

# Log out and back in for the group change to take effect
exit
```

SSH back in:

```bash
ssh deploy@YOUR_SERVER_IP
```

Verify Docker works:

```bash
docker --version
docker compose version
```

---

## 5. Install Node.js 22 & pnpm

```bash
# Install Node.js 22 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # Should show v22.x.x
npm --version

# Install pnpm (must match the version in package.json)
sudo npm install -g pnpm@9.15.0

# Install PM2 (process manager)
sudo npm install -g pm2
```

---

## 6. Deploy the Application Code

### 6.1 — Clone the repository

```bash
cd ~
git clone YOUR_REPO_URL pm
cd pm
```

> **If using a private GitHub repo**: Generate a personal access token at https://github.com/settings/tokens and use it as the password when cloning. Or set up a deploy key:
> ```bash
> ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "deploy@vps"
> cat ~/.ssh/github_deploy.pub
> # Add this key at: GitHub → repo → Settings → Deploy keys
> ```

### 6.2 — Install dependencies

```bash
pnpm install
```

### 6.3 — Create the uploads directory

```bash
mkdir -p apps/api/uploads/questions
```

---

## 7. Configure Environment Variables

### 7.1 — Root .env

```bash
cp .env.example .env
nano .env
```

Set these values:

```env
MYSQL_DATABASE=pm_exam
MYSQL_USER=pm_user
MYSQL_PASSWORD=GENERATE_A_STRONG_PASSWORD_HERE
MYSQL_ROOT_PASSWORD=GENERATE_ANOTHER_STRONG_PASSWORD_HERE
MYSQL_PORT=3307
API_PORT=4000
NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN
```

> **Generate strong passwords**: Run `openssl rand -base64 24` on the server to get random passwords.

### 7.2 — API .env

```bash
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
```

```env
PORT=4000
APP_URL=https://YOUR_DOMAIN
JWT_SECRET=GENERATE_A_64_CHAR_SECRET_HERE
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=14
PASSWORD_RESET_TTL_MINUTES=30
COOKIE_SECURE=true
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307
MYSQL_DATABASE=pm_exam
MYSQL_USER=pm_user
MYSQL_PASSWORD=SAME_PASSWORD_AS_ROOT_ENV
TOYYIBPAY_SECRET_KEY=
TOYYIBPAY_CATEGORY_CODE=
TOYYIBPAY_SANDBOX=true
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_SANDBOX=true
BILLPLZ_API_KEY=
BILLPLZ_COLLECTION_ID=
BILLPLZ_X_SIGNATURE_KEY=
BILLPLZ_SANDBOX=true
API_BASE_URL=https://YOUR_DOMAIN
```

> **Important values to change**:
> - `APP_URL` = your full domain with `https://` (e.g. `https://exam.pmadvance.com`)
> - `JWT_SECRET` = generate with `openssl rand -base64 48`
> - `COOKIE_SECURE` = **must be `true`** in production (requires HTTPS)
> - `MYSQL_PASSWORD` = must match what you set in root `.env`
> - `API_BASE_URL` = public site origin where payment gateways can reach your API callbacks. The app appends `/api/payments/callbacks/...` itself.
> - Payment gateway credentials can also be managed later in **Admin > Settings > Payment**. See [Payment Gateway Deployment Runbook](./PAYMENT-GATEWAY-DEPLOYMENT.md).

### 7.3 — Web .env

```bash
cp apps/web/.env.example apps/web/.env
nano apps/web/.env
```

```env
NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN
```

> **Important**: Use the site origin only, without `/api`. The web app already appends `/api/...` and `/uploads/...` internally.
>
> **Note**: `NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at **build time**. If you change this value later, you must rebuild: `pnpm --filter web build`.

---

## 8. Start the Database

### 8.1 — Start MySQL

```bash
cd ~/pm
docker compose -f infra/docker/docker-compose.yml --env-file .env up -d
```

> **Security note**: The Compose file binds MySQL to `127.0.0.1:${MYSQL_PORT}` by default so the database is not exposed publicly.

Wait ~30 seconds for MySQL to initialise and run the schema files, then verify:

```bash
docker logs pm-mysql 2>&1 | tail -5
# Should show "ready for connections"

# Test connection
docker exec pm-mysql mysql -u pm_user -p"YOUR_MYSQL_PASSWORD" pm_exam -e "SHOW TABLES;"
```

You should see all the tables listed (users, products, exams, questions, etc.).

---

## 9. Build & Start the Application

### 9.1 — Build both apps

```bash
cd ~/pm
pnpm build
```

This runs:
1. `tsc` for the API → outputs to `apps/api/dist/`
2. `next build` for the web → outputs to `apps/web/.next/`

### 9.2 — Seed the database (optional)

If you want demo data (products, test questions):

```bash
pnpm seed
```

### 9.3 — Start with PM2

```bash
mkdir -p ~/pm/logs
cd ~/pm
pm2 start ecosystem.config.cjs
```

Verify both processes are running:

```bash
pm2 status
```

You should see:

```
┌────┬──────────┬─────────┬──────┬───────┬──────────┐
│ id │ name     │ mode    │ pid  │ status│ memory   │
├────┼──────────┼─────────┼──────┼───────┼──────────┤
│ 0  │ pm-api   │ fork    │ 1234 │ online│ 80.0mb   │
│ 1  │ pm-web   │ fork    │ 1235 │ online│ 120.0mb  │
└────┴──────────┴─────────┴──────┴───────┴──────────┘
```

### 9.4 — Auto-start PM2 on server reboot

```bash
pm2 startup systemd
# PM2 will print a command — copy and run it (it starts with sudo)

pm2 save
```

Quick test that both services respond:

```bash
curl -s http://localhost:4000/health | head -20
curl -s http://localhost:3000 | head -5
```

---

## 10. Set Up Nginx Reverse Proxy

Nginx sits in front of both apps and routes traffic based on the URL path.

### 10.1 — Install Nginx

```bash
sudo apt install -y nginx
```

### 10.2 — Create the site config

```bash
sudo nano /etc/nginx/sites-available/pm-exam
```

Paste this configuration (replace `YOUR_DOMAIN` with your actual domain):

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max upload size (for question images)
    client_max_body_size 10M;

    # API requests → Express on port 4000
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Uploaded files → Express static handler
    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
    }

    # Everything else → Next.js on port 3000
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 10.3 — Enable the site

```bash
# Enable our config
sudo ln -s /etc/nginx/sites-available/pm-exam /etc/nginx/sites-enabled/

# Remove the default Nginx page
sudo rm /etc/nginx/sites-enabled/default

# Test the config for syntax errors
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

At this point, `http://YOUR_DOMAIN` should show your site (once DNS is pointed — see step 12).

---

## 11. Enable HTTPS with Let's Encrypt

Free SSL certificate, auto-renewed every 90 days.

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d YOUR_DOMAIN
```

When prompted:
1. Enter your email address
2. Agree to the terms of service
3. Choose whether to share your email with EFF (optional)
4. Select **"2: Redirect"** — this forces all HTTP traffic to HTTPS

Certbot automatically:
- Obtains the certificate
- Modifies your Nginx config to serve HTTPS
- Sets up auto-renewal via a systemd timer

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

---

## 12. Point Your Domain

### 12.1 — DNS Configuration

At your domain registrar (e.g. Exabytes, Namecheap, Cloudflare), add an **A record**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` (or subdomain like `exam`) | `YOUR_SERVER_IP` | 300 |

If your domain is something like `exam.pmadvance.com`:
- **Type**: A
- **Name**: `exam`
- **Value**: `103.xx.xx.xx` (your VPS IP)

DNS propagation takes 5 minutes to 48 hours (usually under 30 minutes).

### 12.2 — Verify

```bash
# From your Mac
dig YOUR_DOMAIN +short
# Should return your VPS IP

# Then test in a browser
https://YOUR_DOMAIN
```

---

## 13. Post-Deployment Checklist

Run through these after everything is live:

| # | Check | How |
|---|-------|-----|
| 1 | Site loads over HTTPS | Visit `https://YOUR_DOMAIN` in browser |
| 2 | API responds | `curl https://YOUR_DOMAIN/health` |
| 3 | Login works | Try `admin@example.com` / `admin12345` |
| 4 | HTTPS lock icon shows | Check browser address bar |
| 5 | Admin panel accessible | Visit `https://YOUR_DOMAIN/admin` |
| 6 | Student can start exam | Log in as student, start a practice test |
| 7 | PM2 survives reboot | `sudo reboot`, wait 2 min, check `pm2 status` |
| 8 | Cookie secure flag | DevTools → Application → Cookies → `pm_access` should show Secure ✓ |
| 9 | File uploads work | Upload a question image in admin panel |
| 10 | Change default passwords | Update admin/student demo account passwords immediately |

### Critical Security Actions

```bash
# 1. Change the default admin password via the platform UI

# 2. Optionally delete demo/test accounts via MySQL
docker exec -it pm-mysql mysql -u pm_user -p"YOUR_PASSWORD" pm_exam \
  -e "DELETE FROM users WHERE email IN ('student@example.com', 'test7@gmail.com');"

# 3. Verify firewall is active
sudo ufw status
```

---

## 14. Maintenance & Operations

### 14.1 — Deploying Updates

When you push new code and want to update the server:

```bash
ssh deploy@YOUR_SERVER_IP
cd ~/pm

# Pull latest code
git pull origin main

# Install any new dependencies
pnpm install

# Rebuild both apps
pnpm build

# Restart services (zero-downtime with reload)
pm2 reload ecosystem.config.cjs
```

### 14.2 — Viewing Logs

```bash
# Real-time logs for both apps
pm2 logs

# Only API logs
pm2 logs pm-api --lines 50

# Only Web logs
pm2 logs pm-web --lines 50

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 14.3 — Database Backups

**Manual backup:**

```bash
mkdir -p ~/backups
docker exec pm-mysql mysqldump -u pm_user -p"YOUR_PASSWORD" pm_exam > ~/backups/pm_exam_$(date +%Y%m%d_%H%M%S).sql
```

**Automated daily backup** — create a cron job:

```bash
crontab -e
```

Add these lines (backup at 3 AM, cleanup old backups at 3:30 AM):

```
0 3 * * * docker exec pm-mysql mysqldump -u pm_user -p"YOUR_PASSWORD" pm_exam | gzip > /home/deploy/backups/pm_exam_$(date +\%Y\%m\%d).sql.gz 2>/dev/null
30 3 * * * find /home/deploy/backups -name "pm_exam_*.sql.gz" -mtime +14 -delete
```

**Restore from backup:**

```bash
gunzip < ~/backups/pm_exam_20260423.sql.gz | docker exec -i pm-mysql mysql -u pm_user -p"YOUR_PASSWORD" pm_exam
```

### 14.4 — Database Migrations

When new SQL migration files are added (e.g. `016_new_feature.sql`):

```bash
# Run the migration manually
docker exec -i pm-mysql mysql -u pm_user -p"YOUR_PASSWORD" pm_exam < infra/docker/mysql/init/016_new_feature.sql

# The API also applies runtime ALTER statements automatically on health check
curl http://localhost:4000/health
```

For the PayPal/Billplz payment gateway update after commit `9bf2882`, there is no new table/column migration. The new gateway values are stored in the existing `app_settings` table and can be configured from **Admin > Settings > Payment** or `.env`. Use the dedicated runbook for deploy checks:

```bash
less docs/PAYMENT-GATEWAY-DEPLOYMENT.md
```

### 14.5 — Monitoring Memory

With 2GB RAM, monitor usage:

```bash
# Current memory usage
free -h

# Per-process memory
pm2 monit

# Docker memory
docker stats pm-mysql --no-stream
```

If memory is tight, PM2 is configured to restart processes at 512MB. Reduce if needed in `ecosystem.config.cjs`.

### 14.6 — System Updates

Run monthly:

```bash
sudo apt update && sudo apt upgrade -y

# If the kernel was updated
sudo reboot
```

---

## 15. Troubleshooting

### Site shows "502 Bad Gateway"

The Node.js processes aren't running:

```bash
pm2 status          # Check if processes are online
pm2 restart all     # Restart everything
pm2 logs --lines 30 # Check for errors
```

### "Error: connect ECONNREFUSED 127.0.0.1:3307"

MySQL container isn't running:

```bash
docker ps                          # Should show pm-mysql
docker compose -f infra/docker/docker-compose.yml --env-file .env up -d
docker logs pm-mysql --tail 20     # Check for errors
```

### CORS errors in browser console

`APP_URL` in `apps/api/.env` doesn't match the actual domain:

```bash
# Must match exactly, including https:// and no trailing slash
APP_URL=https://YOUR_DOMAIN
```

Then restart:

```bash
pm2 restart pm-api
```

### Cookies not being set (login doesn't stick)

1. Check `COOKIE_SECURE=true` in `apps/api/.env` AND that you're accessing via HTTPS
2. Check `APP_URL` matches exactly (CORS must allow credentials from that origin)

### "NEXT_PUBLIC_API_URL" points to wrong URL

This is baked at build time. You must rebuild:

```bash
nano apps/web/.env
# Fix the URL
pnpm --filter web build
pm2 restart pm-web
```

### SSL certificate renewal fails

```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

### Locked out of SSH

If both SSH ports are inaccessible, use the Exabytes/SolusVM panel → VNC
Console. Log in as root (console login is separate from `PermitRootLogin`), then
run the recovery procedure in `docs/EXABYTES-PRODUCTION-RUNBOOK.md`.

### Server runs out of disk

```bash
df -h                                  # Check disk usage
docker system prune -f                 # Clean Docker cache
find ~/pm/logs -name "*.log" -size +50M -delete  # Clean large logs
pm2 flush                              # Clear PM2 logs
```

---

## 16. Git Workflow & Staging Environment

This section covers the day-to-day workflow for pushing code from your Mac to the server,
plus an optional lightweight staging environment for testing before going live.

### 16.1 — Git Workflow (Local → GitHub → Server)

The flow is: **code on Mac → push to GitHub → pull on server → rebuild**.

#### On your Mac (already done)

```bash
git remote -v   # confirm origin points to your GitHub repo
```

#### On the server — first-time setup

```bash
cd ~/pm

# Set up GitHub deploy key (if private repo & not done in step 6)
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "deploy@vps" -N ""
cat ~/.ssh/github_deploy.pub
# → Add this key at: GitHub → repo → Settings → Deploy keys → "Add deploy key" (read-only)

# Configure SSH to use the deploy key for GitHub
cat >> ~/.ssh/config << 'EOF'
Host github.com
    IdentityFile ~/.ssh/github_deploy
    IdentitiesOnly yes
EOF

# Switch remote from HTTPS to SSH (if needed)
git remote set-url origin git@github.com:YOUR_USER/YOUR_REPO.git
```

#### Deploy workflow (run every time you push changes)

```bash
# One-liner deploy command:
cd ~/pm && git pull && pnpm install && pnpm build && pm2 reload ecosystem.config.cjs
```

Create a shortcut alias:

```bash
echo 'alias deploy="cd ~/pm && git pull && pnpm install && pnpm build && pm2 reload ecosystem.config.cjs"' >> ~/.bashrc
source ~/.bashrc
```

Now just SSH in and type `deploy`.

#### Typical daily workflow

```bash
# 1. On your Mac — work on features, then:
git add -A && git commit -m "feat: new feature" && git push

# 2. SSH into server:
ssh deploy@YOUR_SERVER_IP

# 3. Deploy:
deploy
```

### 16.2 — Staging Environment (Optional)

A lightweight staging copy for testing before pushing to production.
Sized for **~3 users with minimal data** — very low resource usage.

#### Overview

| | Production | Staging |
|---|---|---|
| Directory | `~/pm` | `~/pm-staging` |
| Database | `pm_exam` | `pm_exam_staging` |
| API port | 4000 | 4001 |
| Web port | 3000 | 3001 |
| Domain | `YOUR_DOMAIN` | `staging.YOUR_DOMAIN` |
| PM2 config | `ecosystem.config.cjs` | `staging.ecosystem.config.cjs` |
| Memory (API) | 512 MB | 256 MB |
| Memory (Web) | 512 MB | 256 MB |

**Memory budget**: Production uses ~1.3 GB, staging adds ~0.5 GB → total ~1.8 GB of 4 GB. Plenty of headroom.

#### Step A — Create the staging database

```bash
# Connect to the existing MySQL container
docker exec -it pm-mysql mysql -u root -p

# Inside MySQL:
CREATE DATABASE pm_exam_staging;
GRANT ALL PRIVILEGES ON pm_exam_staging.* TO 'pm_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

The schema migrations will auto-run when the staging API starts (same ALTER statements as production).

#### Step B — Clone the repo a second time

```bash
cd ~
git clone git@github.com:YOUR_USER/YOUR_REPO.git pm-staging
cd pm-staging
pnpm install
```

#### Step C — Configure staging environment variables

```bash
# Root .env
cp ~/pm/.env ~/pm-staging/.env
nano ~/pm-staging/.env
```

Change only the database name:

```env
MYSQL_DATABASE=pm_exam_staging
# Keep all other values the same
```

```bash
# API .env
cp ~/pm/apps/api/.env ~/pm-staging/apps/api/.env
nano ~/pm-staging/apps/api/.env
```

Change these values:

```env
PORT=4001
APP_URL=https://staging.YOUR_DOMAIN
MYSQL_DATABASE=pm_exam_staging
# Generate a different JWT_SECRET: openssl rand -base64 48
JWT_SECRET=DIFFERENT_SECRET_FOR_STAGING
```

```bash
# Web .env
cp ~/pm/apps/web/.env ~/pm-staging/apps/web/.env
nano ~/pm-staging/apps/web/.env
```

```env
NEXT_PUBLIC_API_URL=https://staging.YOUR_DOMAIN
```

#### Step D — Create the staging PM2 config

This file is already in the repo (see below). If not:

```bash
nano ~/pm-staging/staging.ecosystem.config.cjs
```

```javascript
module.exports = {
  apps: [
    {
      name: "pm-api-staging",
      cwd: "./apps/api",
      script: "dist/index.js",
      env: { NODE_ENV: "production" },
      max_memory_restart: "256M",
      error_file: "./logs/api-staging-error.log",
      out_file: "./logs/api-staging-out.log",
      merge_logs: true,
      time: true
    },
    {
      name: "pm-web-staging",
      cwd: "./apps/web",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      env: { NODE_ENV: "production" },
      max_memory_restart: "256M",
      error_file: "./logs/web-staging-error.log",
      out_file: "./logs/web-staging-out.log",
      merge_logs: true,
      time: true
    }
  ]
};
```

#### Step E — Build & start staging

```bash
cd ~/pm-staging
pnpm build
pm2 start staging.ecosystem.config.cjs
pm2 save
```

#### Step F — Nginx config for staging subdomain

```bash
sudo nano /etc/nginx/sites-available/pm-exam-staging
```

```nginx
server {
    listen 80;
    server_name staging.YOUR_DOMAIN;

    add_header X-Robots-Tag "noindex, nofollow" always;
    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pm-exam-staging /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### Step G — SSL for staging

```bash
sudo certbot --nginx -d staging.YOUR_DOMAIN
```

> **DNS**: Add an A record for `staging.YOUR_DOMAIN` → your server IP (same as production).

#### Step H — Deploy to staging

```bash
echo 'alias deploy-staging="cd ~/pm-staging && git pull && pnpm install && pnpm build && pm2 reload staging.ecosystem.config.cjs"' >> ~/.bashrc
source ~/.bashrc
```

Usage:

```bash
# Push from Mac to a staging branch (or main — your choice)
git push

# SSH in, then:
deploy-staging
```

#### Staging tips

- **Don't build production and staging at the same time** — builds are RAM-hungry. Build one, then the other.
- **Seed staging separately**: After first deploy, insert minimal test data via MySQL shell or your admin panel.
- **Stop staging when unused**: `pm2 stop pm-api-staging pm-web-staging` to free ~0.5 GB RAM. Start with `pm2 start ...`.
- **Staging is NOT for load testing** — it's for feature verification before going live.

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| SSH into server | `ssh deploy@YOUR_SERVER_IP` |
| Check process status | `pm2 status` |
| View logs | `pm2 logs` |
| Restart all apps | `pm2 reload ecosystem.config.cjs` |
| Restart just API | `pm2 restart pm-api` |
| Restart just Web | `pm2 restart pm-web` |
| Start MySQL | `docker compose -f infra/docker/docker-compose.yml --env-file .env up -d` |
| Stop MySQL | `docker compose -f infra/docker/docker-compose.yml --env-file .env down` |
| MySQL shell | `docker exec -it pm-mysql mysql -u pm_user -p pm_exam` |
| Manual backup | `docker exec pm-mysql mysqldump -u pm_user -p pm_exam > backup.sql` |
| Nginx reload | `sudo systemctl reload nginx` |
| Nginx test config | `sudo nginx -t` |
| SSL renew test | `sudo certbot renew --dry-run` |
| Firewall status | `sudo ufw status` |
| Memory check | `free -h` |
| Disk check | `df -h` |
| Deploy update | `git pull && pnpm install && pnpm build && pm2 reload ecosystem.config.cjs` |
| Deploy staging | `cd ~/pm-staging && git pull && pnpm install && pnpm build && pm2 reload staging.ecosystem.config.cjs` |
| Stop staging | `pm2 stop pm-api-staging pm-web-staging` |
| Start staging | `pm2 start pm-api-staging pm-web-staging` |

---

## Selected VPS Plan — Exabytes NVMe C2

| Spec | Value |
|------|-------|
| Plan | NVMe C2 (Compute Optimised) |
| vCPU | 2 |
| RAM | 4 GB |
| Storage | 100 GB NVMe |
| Monthly Data Transfer | 4 TB |
| Bandwidth | 100 Mbps |
| Backup | Weekly off-server |
| Snapshot | 1 |
| Monitoring | Server uptime monitoring included |
| Good for | Up to ~300–500 concurrent users |

Exabytes allows upgrading to a higher plan later without data loss.

---

## Cost Summary (Estimated Monthly)

| Item | Cost (MYR) |
|------|------------|
| Exabytes NVMe C2 | RM 60/month |
| Domain renewal (.com) | ~RM 50/year ≈ RM 4/month |
| SSL (Let's Encrypt) | Free |
| **Total** | **~RM 64/month** |
