# Redis and Two-Worker Deployment

This runbook deploys Redis on the same server as PM Exam Pro and changes the API from one PM2 fork to two cluster workers. It is written to be repeatable on another Ubuntu host.

## Purpose

Two API workers can execute JavaScript on both vCPUs during synchronized exam starts. Redis provides the shared state required by those workers:

- Atomic rate-limit counters shared by every API worker.
- Pub/Sub notifications that invalidate each worker's local question cache after an admin change.
- A health signal that prevents a required-Redis deployment from appearing healthy without coordination.

Question rows remain in each worker's bounded local cache. Redis does not store attempts, answers, answer keys, sessions, payments, or question content.

## Production Topology

```text
Internet -> Nginx -> PM2 cluster
                      |- pm-api worker 1 -> local question cache
                      |- pm-api worker 2 -> local question cache
                      `- pm-web

API workers -> Redis on 127.0.0.1:6379
API workers -> MySQL on 127.0.0.1:3307
```

The operating system schedules all processes across both vCPUs. The workers are not manually pinned to individual CPUs.

## Systemd or Docker?

Redis is deployed as an Ubuntu systemd service on the current PM Exam Pro host. This is deliberate:

- The API and web processes already run directly on the host under PM2.
- The API can use the loopback interface without publishing a Docker port.
- systemd supplies boot startup, restart management, logs, and package security updates.
- Redis holds only disposable coordination data, so container portability is not currently valuable enough to add another deployment layer.

Docker is not inherently faster or safer. Prefer Docker when the API and web are also containerized, when one Compose file owns the entire application, or when an exact Redis image version must be reproduced across many hosts.

An equivalent optional Docker service would bind only to loopback and still require authentication:

```yaml
services:
  redis:
    image: redis:8-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    command:
      - redis-server
      - --requirepass
      - ${REDIS_PASSWORD}
      - --maxmemory
      - 64mb
      - --maxmemory-policy
      - allkeys-lru
      - --save
      - ""
      - --appendonly
      - "no"
```

Do not run the systemd and Docker Redis services simultaneously on port 6379. Keep `REDIS_PASSWORD` outside version control and use the same protected `REDIS_URL` application setting.

## PM Exam Pro Hetzner Sizing

Observed before the rollout on 2026-08-21:

| Resource | Observation |
| --- | ---: |
| vCPU | 2 |
| RAM | 3.7 GiB |
| Available RAM | About 777 MiB |
| Swap in use | About 2.0 GiB |
| MySQL `max_connections` | 151 |
| PM API memory, one worker | About 78 MiB |
| Largest unrelated container | About 1.85 GiB |

Redis is therefore capped at 64 MB on this host. The second API worker is expected to add roughly another worker's memory, so memory and swap must be checked after deployment. A different server must be measured independently.

## Application Configuration

The API supports:

```env
REDIS_URL=redis://:REPLACE_WITH_PASSWORD@127.0.0.1:6379
REDIS_KEY_PREFIX=pmexampro
REDIS_CONNECT_TIMEOUT_MS=2000
REDIS_REQUIRED=true
MYSQL_CONNECTION_LIMIT=10
```

`REDIS_REQUIRED=true` is mandatory for the two-worker production configuration. A worker exits during startup when Redis cannot be reached. Local development can leave `REDIS_URL` empty and `REDIS_REQUIRED=false`, which uses the original process-local limiter.

The MySQL connection limit is per worker. Two workers with a limit of 10 can open at most 20 API database connections.

## 1. Pre-Deployment Checks

```bash
ssh deploy@YOUR_SERVER_IP
cd /home/deploy/pm

git status --short
git rev-parse HEAD
pm2 status
free -h
df -h /
docker stats --no-stream
```

Do not delete or overwrite unrelated local files. Record the current Git revision for rollback.

## 2. Install Redis on Ubuntu

```bash
sudo apt-get update
sudo apt-get install -y redis-server
redis-server --version
```

Back up the packaged configuration before editing it:

```bash
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.pre-pmexampro
```

Generate a password containing URI-safe hexadecimal characters:

```bash
REDIS_PASSWORD="$(openssl rand -hex 32)"
printf '%s\n' "$REDIS_PASSWORD"
```

Store this password in the project's normal secret manager or sealed handover record. Do not commit it.

Edit `/etc/redis/redis.conf` and ensure these effective settings exist only once:

```conf
bind 127.0.0.1 -::1
protected-mode yes
port 6379
supervised systemd
requirepass REPLACE_WITH_GENERATED_PASSWORD
maxmemory 64mb
maxmemory-policy allkeys-lru
save ""
appendonly no
```

This Redis instance contains disposable coordination data, so persistence is disabled. MySQL remains the system of record.

Validate and start Redis:

```bash
sudo systemctl enable redis-server
sudo systemctl restart redis-server
sudo systemctl status redis-server --no-pager
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping
ss -lntp | grep 6379
```

Expected results:

- `PONG` from `redis-cli`.
- Redis listening on `127.0.0.1:6379` and/or `::1:6379` only.
- No `0.0.0.0:6379` or public listener.

## 3. Configure the API

Append the settings only when they are not already present, or edit the existing values:

```bash
cd /home/deploy/pm
nano apps/api/.env
```

```env
REDIS_URL=redis://:REPLACE_WITH_GENERATED_PASSWORD@127.0.0.1:6379
REDIS_KEY_PREFIX=pmexampro
REDIS_CONNECT_TIMEOUT_MS=2000
REDIS_REQUIRED=true
MYSQL_CONNECTION_LIMIT=10
QUESTION_CACHE_TTL_SECONDS=300
QUESTION_CACHE_MAX_EXAMS=100
QUESTION_LOAD_SLOW_MS=2000
```

Protect the environment file:

```bash
chmod 600 apps/api/.env
```

## 4. Build Before Switching Processes

```bash
cd /home/deploy/pm
corepack pnpm install --frozen-lockfile
corepack pnpm --filter api test
corepack pnpm --filter api typecheck
corepack pnpm --filter api build
```

Do not replace the running API when any command fails.

## 5. Start Two API Workers

Changing PM2 execution mode from fork to cluster requires recreating only the API process:

```bash
pm2 delete pm-api
pm2 start ecosystem.config.cjs --only pm-api
pm2 save
pm2 status
```

Expected: two online `pm-api` entries in `cluster` mode and one existing `pm-web` process.

## 6. Verification

Check the application health endpoint:

```bash
curl -fsS http://127.0.0.1:4000/health
```

Expected Redis fields:

```json
{"status":"ok","database":true,"redis":{"configured":true,"required":true,"ready":true},"service":"api"}
```

Check startup and coordination logs:

```bash
pm2 logs pm-api --lines 100 --nostream
```

Each worker should log `redis_connected`. There must be no repeated `redis_error`, `redis_rate_limit_fallback`, or `api_start_failed` events.

Verify Redis limits without printing its password:

```bash
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli CONFIG GET bind protected-mode maxmemory maxmemory-policy save appendonly
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO memory | grep -E 'used_memory_human|maxmemory_human'
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO clients | grep connected_clients
```

Perform application checks:

1. Log in and open a normal exam.
2. Confirm questions load and contain no answer keys.
3. Save an answer and resume the attempt.
4. Submit a test attempt and confirm its score.
5. Update one question in admin.
6. Confirm both workers log `question_cache_invalidated`.
7. Load the exam again and confirm updated content.
8. Exercise an authentication rate limit and confirm the limit remains consistent across repeated requests.

## 7. Resource Checks

```bash
free -h
uptime
pm2 status
pm2 monit
docker stats --no-stream
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli INFO memory | grep used_memory_human
```

Watch the server during the same 20, 50, 200, 300, and 400-user test stages used for the baseline. Compare question p50, p95, p99, errors, both vCPU percentages, MySQL connections, memory, swap growth, and PM2 restarts.

Stop and investigate when:

- Available memory remains below 256 MB or swap grows continuously.
- Either worker repeatedly restarts or exceeds its 512 MB PM2 limit.
- Redis becomes unavailable or evicts rate-limit keys heavily.
- Error rate reaches 1%.
- Answer saves or submissions regress.

## 8. Routine Deployment

Once cluster mode is established, future releases can use zero-downtime API reloads:

```bash
cd /home/deploy/pm
git pull --ff-only
corepack pnpm install --frozen-lockfile
corepack pnpm --filter api test
corepack pnpm build
pm2 reload ecosystem.config.cjs --only pm-api --update-env
pm2 reload ecosystem.config.cjs --only pm-web --update-env
pm2 save
curl -fsS http://127.0.0.1:4000/health
```

## 9. Rollback

To return immediately to one API process while keeping the new code:

```bash
pm2 scale pm-api 1
pm2 save
```

To return to the previous code revision:

```bash
cd /home/deploy/pm
git checkout PREVIOUS_RECORDED_REVISION
corepack pnpm install --frozen-lockfile
corepack pnpm --filter api build
pm2 delete pm-api
pm2 start ecosystem.config.cjs --only pm-api
pm2 save
```

After the old single-worker release is running, remove or disable `REDIS_REQUIRED` from `apps/api/.env`. Redis may remain installed safely for a later rollout.

To restore Redis's original packaged configuration:

```bash
sudo cp /etc/redis/redis.conf.pre-pmexampro /etc/redis/redis.conf
sudo systemctl restart redis-server
```

Never use `git reset --hard` on this server because the deployment worktree may contain unrelated operational files.

## Production Deployment Record

Deployment completed on 2026-08-21:

| Check | Result |
| --- | --- |
| Application revision | `f55babe` |
| Redis version | 8.0.5, Ubuntu package |
| Redis listener | `127.0.0.1:6379` and `::1:6379` only |
| Redis memory | About 856 KB used, 64 MB maximum |
| PM2 API mode | 2 online cluster workers, 0 restarts |
| API worker memory after settling | About 111 MB per worker |
| Available system memory | About 1.5 GiB |
| Health | Database and required Redis ready |
| Public home smoke test | HTTP 200 |
| Public products smoke test | HTTP 200 |
| Shared rate-limit proof | Requests 1-10 reached authentication; 11-12 returned HTTP 429 |
| Invalidation proof | Redis reported 2 subscribers; both workers logged the event |

The unrelated server file `apps/api/src/scripts/export-users-for-import.ts` was preserved during deployment.
