# Hetzner Cloud — Deployment Guide

> **Target**: Hetzner Cloud VPS (e.g. CX22 — 2 vCPU / 4 GB RAM / 40 GB SSD, or higher)
> **OS**: Ubuntu 24.04 LTS (x86_64)
> **Cost**: Starting from ~€4.51/month (CX22)
> **Audience**: First-time Hetzner and VPS setup

---

## Table of Contents

1. [Why Hetzner?](#why-hetzner)
2. [Recommended Plans](#recommended-plans)
3. [Create Your Hetzner Account](#1-create-your-hetzner-account)
4. [Generate an SSH Key Pair](#2-generate-an-ssh-key-pair)
5. [Create a Server](#3-create-a-server)
6. [Connect to Your Server via SSH](#4-connect-to-your-server-via-ssh)
7. [Secure the Server](#5-secure-the-server)
8. [Install System Dependencies](#6-install-system-dependencies)
9. [Install Docker (for MySQL)](#7-install-docker-for-mysql)
10. [Install Node.js 22 & pnpm](#8-install-nodejs-22--pnpm)
11. [Deploy the Application Code](#9-deploy-the-application-code)
12. [Configure Environment Variables](#10-configure-environment-variables)
13. [Start the Database](#11-start-the-database)
14. [Build & Start the Application](#12-build--start-the-application)
15. [Set Up Nginx Reverse Proxy](#13-set-up-nginx-reverse-proxy)
16. [Enable HTTPS with Let's Encrypt](#14-enable-https-with-lets-encrypt)
17. [Point Your Domain](#15-point-your-domain)
18. [Post-Deployment Checklist](#16-post-deployment-checklist)
19. [Maintenance & Operations](#17-maintenance--operations)
20. [Troubleshooting](#18-troubleshooting)
21. [Hetzner-Specific Tips](#19-hetzner-specific-tips)
22. [Quick Reference Commands](#quick-reference-commands)

---

## Why Hetzner?

Hetzner is a German hosting company known for **excellent price-to-performance ratio**, reliable infrastructure, and straightforward pricing. Their Cloud VPS offering is one of the best value options in Europe with data centres in Germany, Finland, Singapore, and the US.

Key advantages:
- **Simple pricing** — no surprise bills, hourly billing, cancel anytime
- **Fast provisioning** — server ready in ~30 seconds
- **No complex networking setup** — public IP assigned automatically
- **No extra firewall layers** — just standard UFW/iptables
- **Good connectivity to Asia** — Singapore data centre option
- **Excellent uptime** (99.9% SLA)

---

## Recommended Plans

| Plan | vCPU | RAM | Storage | Traffic | Price |
|------|------|-----|---------|---------|-------|
| **CX22** | 2 (shared) | 4 GB | 40 GB | 20 TB | €4.51/mo |
| **CX32** | 4 (shared) | 8 GB | 80 GB | 20 TB | €8.39/mo |
| **CX42** | 8 (shared) | 16 GB | 160 GB | 20 TB | €16.19/mo |
| **CPX21** | 3 (dedicated AMD) | 4 GB | 80 GB | 20 TB | €7.59/mo |

> **Recommendation**: Start with **CX32** (4 vCPU / 8 GB RAM) for comfortable builds and runtime. You can upgrade later without downtime via Hetzner's "Rescale" feature.
>
> If budget is tight, **CX22** works but you'll need swap for builds.

---

## 1. Create Your Hetzner Account

1. Go to https://www.hetzner.com/cloud/
2. Click **"Sign up"** / **"Get Started"**
3. Fill in your details and verify your email
4. Add a payment method (credit card or PayPal)
5. You'll be taken to the **Hetzner Cloud Console**: https://console.hetzner.cloud

> **Note**: Hetzner may ask for identity verification (passport/ID upload) for new accounts. This is normal and usually approved within hours.

---

## 2. Generate an SSH Key Pair

If you already have an SSH key from the Oracle Cloud setup, you can reuse it. Otherwise:

**On your Mac**, open Terminal:

```bash
# Generate a new SSH key pair
ssh-keygen -t ed25519 -f ~/.ssh/hetzner -C "your-email@example.com"
# Press Enter twice to skip passphrase (or set one for extra security)
```

This creates two files:
- `~/.ssh/hetzner` — your **private key** (never share this)
- `~/.ssh/hetzner.pub` — your **public key** (you'll add this to Hetzner)

Copy the public key to your clipboard:

```bash
cat ~/.ssh/hetzner.pub | pbcopy
```

### Add SSH Key to Hetzner Console

1. In the Hetzner Cloud Console, go to your **project** (or create one, e.g. "pm-exam")
2. Click **Security** in the left sidebar → **SSH Keys**
3. Click **"Add SSH Key"**
4. Paste your public key and give it a name (e.g. `mac-key`)
5. Click **"Add SSH key"**

---

## 3. Create a Server

1. In the Hetzner Cloud Console, click **"Add Server"** (or **Servers** → **"Create Server"**)

2. **Location**: Choose the data centre closest to your users
   - For Malaysia/SEA: **Singapore** (`sin`)
   - For Europe: **Falkenstein** (`fsn1`) or **Nuremberg** (`nbg1`)

3. **Image**: Select **Ubuntu** → **24.04**

4. **Type**: Select your plan (e.g. **CX32** for 4 vCPU / 8 GB)
   - Shared vCPU is fine for our workload

5. **Networking**: Leave defaults (Public IPv4 + IPv6)

6. **SSH Keys**: Select the SSH key you added in Step 2

7. **Volumes**: Skip (not needed — boot disk is sufficient)

8. **Firewalls**: Skip for now (we'll use UFW on the server)

9. **Backups**: Enable (optional, adds ~20% to server cost for automated weekly backups)

10. **Name**: `pm-server`

11. Click **"Create & Buy now"**

The server will be ready in ~30 seconds. You'll see the **public IP address** on the server details page.

**Copy the IP address** — you'll need it for every step going forward.

---

## 4. Connect to Your Server via SSH

### 4.1 — First Connection

On your Mac:

```bash
ssh -i ~/.ssh/hetzner root@YOUR_SERVER_IP
```

> **Note**: Hetzner's default user is `root`. We'll create a `deploy` user in the next step.

Type `yes` when asked about the fingerprint.

You should see:

```
Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.x.x x86_64)
...
root@pm-server:~#
```

You're in!

### 4.2 — Make SSH More Convenient

On **your Mac**, create/edit the SSH config:

```bash
nano ~/.ssh/config
```

Add:

```
Host pm-hetzner
    HostName YOUR_SERVER_IP
    User deploy
    IdentityFile ~/.ssh/hetzner
    IdentitiesOnly yes

Host pm-hetzner-root
    HostName YOUR_SERVER_IP
    User root
    IdentityFile ~/.ssh/hetzner
    IdentitiesOnly yes
```

Now you can just type:

```bash
ssh pm-hetzner-root   # Before creating the deploy user
ssh pm-hetzner        # After creating the deploy user (Step 5)
```

---

## 5. Secure the Server

### 5.1 — Update System Packages

```bash
apt update && apt upgrade -y
```

> **Note**: You mentioned you've already done this. Skip to 5.2.

### 5.2 — Create a Non-Root User

Never run your application as `root`. Create a dedicated `deploy` user:

```bash
adduser deploy
# Enter a strong password when prompted, skip the rest with Enter

usermod -aG sudo deploy
```

### 5.3 — Set Up SSH Key for the Deploy User

```bash
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Test from **your Mac** (new terminal tab):

```bash
ssh pm-hetzner
# Should log in WITHOUT asking for a password
```

### 5.4 — Disable Root Login & Password Authentication

```bash
nano /etc/ssh/sshd_config
```

Find and change (or add) these lines:

```
PermitRootLogin no
PasswordAuthentication no
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`) and restart SSH:

```bash
systemctl restart sshd
```

> **Warning**: Before closing your current terminal, open a **new terminal tab** and test `ssh pm-hetzner` to make sure it works. If it doesn't, fix it from the still-open session.

### 5.5 — Configure UFW Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Type `y` to confirm.

Verify:

```bash
ufw status
```

Should show:

```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

> **Unlike Oracle Cloud**, Hetzner doesn't have extra iptables rules blocking traffic. UFW is the only firewall you need.

### 5.6 — Set the Timezone

```bash
timedatectl set-timezone Asia/Kuala_Lumpur
```

### 5.7 — Enable Swap (Recommended for CX22/CX32)

Especially important for smaller plans where builds may consume lots of memory:

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
```

Verify:

```bash
free -h
```

---

## 6. Install System Dependencies

**From now on, always log in as the `deploy` user:**

```bash
ssh pm-hetzner
```

Install required packages:

```bash
sudo apt install -y git curl wget build-essential
```

---

## 7. Install Docker (for MySQL)

We use Docker only for MySQL — it makes database setup, backups, and upgrades much easier.

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
ssh pm-hetzner
```

Verify Docker works:

```bash
docker --version
docker compose version
```

---

## 8. Install Node.js 22 & pnpm

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

## 9. Deploy the Application Code

### 9.1 — Clone the Repository

```bash
cd ~
git clone YOUR_REPO_URL pm
cd pm
```

> **If using a private GitHub repo**: Set up a deploy key:
> ```bash
> ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "deploy@hetzner" -N ""
> cat ~/.ssh/github_deploy.pub
> # Add this key at: GitHub → repo → Settings → Deploy keys → "Add deploy key" (read-only)
>
> # Configure SSH to use this key for GitHub
> cat >> ~/.ssh/config << 'EOF'
> Host github.com
>     IdentityFile ~/.ssh/github_deploy
>     IdentitiesOnly yes
> EOF
>
> # Clone with SSH
> git clone git@github.com:YOUR_USER/YOUR_REPO.git pm
> ```

### 9.2 — Install Dependencies

```bash
cd ~/pm
pnpm install
```

### 9.3 — Create the Uploads Directory

```bash
mkdir -p apps/api/uploads/questions
```

---

## 10. Configure Environment Variables

### 10.1 — Root .env

```bash
nano ~/pm/.env
```

```env
MYSQL_DATABASE=pm_exam
MYSQL_USER=pm_user
MYSQL_PASSWORD=GENERATE_A_STRONG_PASSWORD_HERE
MYSQL_ROOT_PASSWORD=GENERATE_ANOTHER_STRONG_PASSWORD_HERE
MYSQL_PORT=3307
API_PORT=4000
NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN/api
```

> **Generate strong passwords**: Run `openssl rand -base64 24` on the server.

### 10.2 — API .env

```bash
nano ~/pm/apps/api/.env
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
API_BASE_URL=https://YOUR_DOMAIN/api
```

> **Important values to change**:
> - `APP_URL` = your full domain with `https://` (e.g. `https://exam.pmadvance.com`)
> - `JWT_SECRET` = generate with `openssl rand -base64 48`
> - `COOKIE_SECURE` = **must be `true`** in production (requires HTTPS)
> - `MYSQL_PASSWORD` = must match what you set in root `.env`

### 10.3 — Web .env

```bash
nano ~/pm/apps/web/.env
```

```env
NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN/api
```

> **Note**: `NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at **build time**. If you change this value later, you must rebuild: `pnpm --filter web build`.

---

## 11. Start the Database

### 11.1 — Start MySQL

```bash
cd ~/pm
docker compose -f infra/docker/docker-compose.yml --env-file .env up -d
```

Wait ~30 seconds for MySQL to initialise and run the schema files, then verify:

```bash
docker logs pm-mysql 2>&1 | tail -5
# Should show "ready for connections"

# Test connection
docker exec pm-mysql mysql -u pm_user -p"YOUR_MYSQL_PASSWORD" pm_exam -e "SHOW TABLES;"
```

You should see all the tables listed (users, products, exams, questions, etc.).

---

## 12. Build & Start the Application

### 12.1 — Build Both Apps

```bash
cd ~/pm
pnpm build
```

This runs:
1. `tsc` for the API → outputs to `apps/api/dist/`
2. `next build` for the web → outputs to `apps/web/.next/`

> **Note**: On CX22 (4 GB RAM), builds may use swap. On CX32 (8 GB RAM), builds are comfortable.

### 12.2 — Seed the Database (Optional)

If you want demo data (products, test questions):

```bash
pnpm seed
```

### 12.3 — Start with PM2

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

### 12.4 — Auto-Start PM2 on Server Reboot

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

## 13. Set Up Nginx Reverse Proxy

Nginx sits in front of both apps and routes traffic based on the URL path.

### 13.1 — Install Nginx

```bash
sudo apt install -y nginx
```

### 13.2 — Create the Site Config

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

### 13.3 — Enable the Site

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

At this point, `http://YOUR_DOMAIN` should show your site (once DNS is pointed — see Step 15).

---

## 14. Enable HTTPS with Let's Encrypt

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

## 15. Point Your Domain

### 15.1 — DNS Configuration

At your domain registrar (e.g. Namecheap, Cloudflare, Exabytes), add an **A record**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` (or subdomain like `exam`) | `YOUR_SERVER_IP` | 300 |

If your domain is something like `exam.pmadvance.com`:
- **Type**: A
- **Name**: `exam`
- **Value**: your Hetzner server public IP

DNS propagation takes 5 minutes to 48 hours (usually under 30 minutes).

### 15.2 — Using Hetzner DNS (Optional)

Hetzner offers free DNS hosting. You can manage DNS records directly from the Hetzner Console:

1. Go to **DNS** in the Hetzner Console (https://dns.hetzner.com)
2. Add your domain zone
3. Point your domain's nameservers to Hetzner's:
   - `hydrogen.ns.hetzner.com`
   - `oxygen.ns.hetzner.com`
   - `helium.ns.hetzner.de`
4. Add your A record pointing to the server IP

### 15.3 — Verify

```bash
# From your Mac
dig YOUR_DOMAIN +short
# Should return your Hetzner server IP

# Then test in a browser
https://YOUR_DOMAIN
```

---

## 16. Post-Deployment Checklist

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

# 3. Verify firewall is correct
sudo ufw status

# 4. Verify only SSH, HTTP, HTTPS ports are open
sudo ss -tlnp
```

---

## 17. Maintenance & Operations

### 17.1 — Deploying Updates

When you push new code and want to update the server:

```bash
ssh pm-hetzner
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

One-liner alias:

```bash
echo 'alias deploy="cd ~/pm && git pull && pnpm install && pnpm build && pm2 reload ecosystem.config.cjs"' >> ~/.bashrc
source ~/.bashrc
```

Now just SSH in and type `deploy`.

### 17.2 — Viewing Logs

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

### 17.3 — Database Backups

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
gunzip < ~/backups/pm_exam_20260523.sql.gz | docker exec -i pm-mysql mysql -u pm_user -p"YOUR_PASSWORD" pm_exam
```

### 17.4 — Database Migrations

When new SQL migration files are added (e.g. `016_new_feature.sql`):

```bash
# Run the migration manually
docker exec -i pm-mysql mysql -u pm_user -p"YOUR_PASSWORD" pm_exam < infra/docker/mysql/init/016_new_feature.sql

# The API also applies runtime ALTER statements automatically on health check
curl http://localhost:4000/health
```

### 17.5 — Monitoring Resources

```bash
# Current memory usage
free -h

# Per-process memory
pm2 monit

# Docker memory
docker stats pm-mysql --no-stream

# CPU usage
top -bn1 | head -5

# Disk usage
df -h
```

### 17.6 — System Updates

Run monthly:

```bash
sudo apt update && sudo apt upgrade -y

# If the kernel was updated
sudo reboot
```

> **Important**: After reboot, verify PM2 processes come back online:
> ```bash
> pm2 status
> docker ps  # MySQL should auto-restart too
> ```

### 17.7 — Scaling Up (Resize Server)

If you need more resources:

1. Go to Hetzner Cloud Console → your server
2. Power off the server (or use **Rescale** for live migration on some plans)
3. Click **"Rescale"** → choose a larger plan
4. Power on

> The server keeps the same IP address after rescaling. No DNS changes needed.

---

## 18. Troubleshooting

### Site shows "502 Bad Gateway"

The Node.js processes aren't running:

```bash
pm2 status          # Check if processes are online
pm2 restart all     # Restart everything
pm2 logs --lines 30 # Check for errors
```

### Can't connect to the site at all (connection refused/timeout)

Check the firewall:

```bash
# Check UFW
sudo ufw status
# Must show 80/tcp and 443/tcp ALLOW

# Check if Nginx is running
sudo systemctl status nginx

# Check if ports are listening
sudo ss -tlnp | grep -E ':(80|443|3000|4000)'
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

### Server runs out of disk

```bash
df -h                                  # Check disk usage
docker system prune -f                 # Clean Docker cache
find ~/pm/logs -name "*.log" -size +50M -delete  # Clean large logs
pm2 flush                              # Clear PM2 logs
```

### Out of memory during build

If `pnpm build` fails on a smaller server:

```bash
# Increase swap temporarily
sudo fallocate -l 8G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2

# Run build
pnpm build

# Remove extra swap
sudo swapoff /swapfile2
sudo rm /swapfile2
```

Or set Node.js memory limit:

```bash
NODE_OPTIONS="--max-old-space-size=2048" pnpm build
```

---

## 19. Hetzner-Specific Tips

| Topic | Details |
|-------|---------|
| **Simple firewall** | Only UFW needed — no extra iptables rules like Oracle Cloud |
| **Default user is `root`** | Create a `deploy` user immediately |
| **x86_64 architecture** | Standard AMD/Intel — all packages work without ARM considerations |
| **Rescale without data loss** | Upgrade/downgrade server plan and keep same IP + data |
| **Hetzner Firewall (optional)** | You can add a cloud-level firewall in the Console for extra security |
| **Snapshots** | Take server snapshots before major changes (€0.012/GB/month) |
| **Automated backups** | Enable in Console for automatic weekly full-server backups |
| **20 TB traffic included** | Very generous — no overage fees for normal web apps |
| **Floating IPs** | Available if you need a static IP that can be moved between servers |
| **Load Balancers** | Available if you need to scale horizontally later |

### Hetzner Cloud Firewall (Optional Extra Layer)

You can add a cloud-level firewall in addition to UFW:

1. Go to **Firewalls** in the Hetzner Console
2. Click **"Create Firewall"**
3. Add inbound rules:
   - TCP 22 (SSH) from your IP only (or `0.0.0.0/0` if dynamic IP)
   - TCP 80 (HTTP) from `0.0.0.0/0`
   - TCP 443 (HTTPS) from `0.0.0.0/0`
4. Apply to your server

This gives you two firewall layers (cloud + UFW), similar to Oracle Cloud's setup.

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| SSH into server | `ssh pm-hetzner` |
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
| Deploy update | `deploy` (alias) or `cd ~/pm && git pull && pnpm install && pnpm build && pm2 reload ecosystem.config.cjs` |

---

## Architecture Overview

```
Internet
   │
   ▼
┌──────────────────────────────────────────────┐
│  Hetzner Cloud Firewall (optional)            │
│  Allows: 22, 80, 443                         │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  Hetzner CX32 (4 vCPU / 8 GB RAM)            │
│  Ubuntu 24.04 LTS (x86_64)                   │
│                                               │
│  ┌──────────────┐                             │
│  │     UFW      │  (firewall)                 │
│  └──────┬───────┘                             │
│         │                                     │
│  ┌──────▼───────┐                             │
│  │   Nginx      │  :80 / :443                 │
│  │   (proxy)    │  (reverse proxy + SSL)      │
│  └──┬───────┬───┘                             │
│     │       │                                 │
│     ▼       ▼                                 │
│  ┌──────┐ ┌──────┐                            │
│  │ Web  │ │ API  │                            │
│  │:3000 │ │:4000 │  (PM2 managed)             │
│  └──────┘ └──┬───┘                            │
│              │                                │
│              ▼                                │
│         ┌─────────┐                           │
│         │ MySQL   │                           │
│         │ 8.4     │  (Docker, port 3307)      │
│         └─────────┘                           │
└──────────────────────────────────────────────┘
```

---

## Cost Summary

| Item | Cost |
|------|------|
| Hetzner CX32 (4 vCPU / 8 GB RAM / 80 GB) | €8.39/mo (~RM 40/mo) |
| Automated Backups (optional) | ~€1.68/mo |
| Domain renewal (.com) | ~RM 50/year ≈ RM 4/month |
| SSL (Let's Encrypt) | **Free** |
| Hetzner DNS | **Free** |
| **Total** | **~RM 44–52/month** |

> **Compared to Oracle Cloud Always Free**: You're paying ~RM 40/month, but you get:
> - No capacity issues (Oracle Ampere A1 can be hard to get)
> - No triple-firewall complexity
> - Simpler setup and management
> - Reliable rescaling without server recreation
> - Better support (paid customers get priority)
> - x86_64 architecture (broader compatibility)

---

## Migrating from Oracle Cloud

If you're moving from an existing Oracle Cloud deployment:

1. **Backup the database** on Oracle:
   ```bash
   docker exec pm-mysql mysqldump -u pm_user -p"PASSWORD" pm_exam | gzip > pm_exam_migration.sql.gz
   ```

2. **Copy the backup to Hetzner**:
   ```bash
   scp pm_exam_migration.sql.gz deploy@HETZNER_IP:~/
   ```

3. **Copy uploaded files**:
   ```bash
   scp -r ~/pm/apps/api/uploads deploy@HETZNER_IP:~/pm/apps/api/
   ```

4. **Restore database on Hetzner** (after MySQL is running):
   ```bash
   gunzip < ~/pm_exam_migration.sql.gz | docker exec -i pm-mysql mysql -u pm_user -p"PASSWORD" pm_exam
   ```

5. **Update DNS** to point to Hetzner IP

6. **Re-issue SSL certificate** on Hetzner:
   ```bash
   sudo certbot --nginx -d YOUR_DOMAIN
   ```
