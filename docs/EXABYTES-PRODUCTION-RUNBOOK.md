# Exabytes Production Runbook

Current live production server details:

- Provider: Exabytes VPS
- Hostname: `exabytes-87357858`
- IP: `45.127.7.104`
- SSH user: `deploy`
- SSH port: `8288`
- Canonical domain: `https://www.pmexampro.com`
- Apex redirect: `https://pmexampro.com` -> `https://www.pmexampro.com`

## Connect

```bash
ssh -p 8288 deploy@45.127.7.104
```

After the initial hardening, direct SSH login as `root` is disabled.

Use the `deploy` account for normal access:

```bash
ssh exabytes-87357858
```

If you need a root shell after logging in as `deploy`, elevate locally with:

```bash
sudo -i
```

Examples:

```bash
ssh -p 8288 deploy@45.127.7.104
sudo systemctl status nginx
sudo docker ps
pm2 status
```

## Server Runtime

- App checkout: `/home/deploy/pm`
- API process: `pm-api`
- Web process: `pm-web`
- PM2 boot service: `pm2-deploy.service`
- MySQL container: `pm-mysql`
- MySQL bind: `127.0.0.1:3307`

## Deploy Helper

The server has a deploy helper script installed at:

```bash
/home/deploy/bin/pm-deploy
```

Shell-independent command wrapper:

```bash
deploy-pm
```

Shell alias for the `deploy` user:

```bash
deploy-pm
```

What it does:

1. `git pull --ff-only origin main`
2. `pnpm install --frozen-lockfile`
3. `pnpm build`
4. `pm2 reload ecosystem.config.cjs`
5. `pm2 save`
6. `curl http://127.0.0.1:4000/health`

## Nightly Backups

The server has a nightly backup script installed at:

```bash
/home/deploy/bin/pm-nightly-backup.sh
```

Cron schedule:

```cron
0 3 * * * /home/deploy/bin/pm-nightly-backup.sh
```

Behavior:

- Runs `pnpm db:export`
- Produces export archives under `/home/deploy/pm/backups`
- Writes logs to `/home/deploy/backups/logs/backup.log`
- Deletes export archives older than 14 days

Run manually:

```bash
/home/deploy/bin/pm-nightly-backup.sh
```

## Production Validation

```bash
pm2 status
systemctl status pm2-deploy --no-pager
sudo docker ps --filter name=pm-mysql
curl -sS https://www.pmexampro.com/health
curl -sS https://www.pmexampro.com/api/products | head
```

## TLS

- Nginx terminates TLS
- Certificates are managed by Certbot
- Renewal dry-run command:

```bash
sudo certbot renew --dry-run
```

## Production Admin Bootstrap

Current owner admin:

- Email: `syahrizan.ali@gmail.com`
- Role: `super_admin`

Known demo accounts were neutralized for production by suspending them and removing their public example.com addresses.

## Important Env Convention

Use the public site origin only for these values:

```env
NEXT_PUBLIC_API_URL=https://www.pmexampro.com
APP_URL=https://www.pmexampro.com
API_BASE_URL=https://www.pmexampro.com
```

Do not append `/api` to `NEXT_PUBLIC_API_URL` or `API_BASE_URL` in this project. The app already appends the necessary path segments internally.