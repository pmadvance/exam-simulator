# Question-Loading Performance

This implementation optimizes `GET /api/attempts/:id/questions` while preserving attempt authorization, deterministic question order, training feedback, and durable answer storage.

## Implemented Changes

- Measures session validation, pool acquisition, SQL, cache loading, transformation, serialization, and total server time.
- Uses a normal-exam query that never retrieves `correct_answer` or `explanation`.
- Retains the extended fields for training mode only.
- Caches safe published question rows in process by exam ID.
- Coalesces simultaneous cache misses into one database load.
- Uses TTL, LRU bounds, and generation-safe invalidation.
- Invalidates after question create, update, delete, CSV/XLSX upload, import apply, direct import, and rollback.
- Pre-warms published exams after API startup without blocking the server from listening.
- Makes the MySQL application connection limit configurable.

Attempts, enrollment decisions, answers, submissions, correct answers, and personalized results are not stored in the normal-question cache.

## Configuration

Defaults are conservative and preserve the previous pool size:

```env
MYSQL_CONNECTION_LIMIT=10
QUESTION_CACHE_TTL_SECONDS=300
QUESTION_CACHE_MAX_EXAMS=100
QUESTION_LOAD_SLOW_MS=2000
```

Start with `MYSQL_CONNECTION_LIMIT=10`. Compare 10, 15, and 20 in separate load tests. Do not raise it directly to MySQL's server maximum.

## Diagnostics

Question responses include:

```http
Cache-Control: private, no-cache
X-Question-Cache: hit
Server-Timing: session;dur=..., attempt-pool;dur=..., attempt-sql;dur=..., question-pool;dur=..., question-load;dur=..., question-sql;dur=..., transform;dur=..., serialize;dur=..., total;dur=...
```

`X-Question-Cache` values:

- `miss`: this request loaded published questions from MySQL.
- `coalesced`: this request awaited another request loading the same exam.
- `hit`: safe rows came from memory.
- `training-bypass`: training fields were loaded from MySQL and were not cached.

Every completed question load emits a `question_load_timing` JSON log. Loads at or above `QUESTION_LOAD_SLOW_MS` use `console.warn`; faster loads use `console.info`. Logs contain timing and counts, not tokens, answers, answer keys, or question text.

## Local Verification

```bash
corepack pnpm --filter api test
corepack pnpm --filter api typecheck
corepack pnpm --filter api build
```

Verify manually:

1. Start a normal exam and confirm the response contains no `correctAnswer` or `explanation`.
2. Start training mode and confirm its intended feedback remains available.
3. Request the same normal attempt twice and confirm `miss` then `hit`.
4. Start simultaneous attempts for the same exam and look for `coalesced` responses.
5. Edit a question in admin and confirm the next request is a `miss` with updated content.
6. Repeat create, delete, CSV/XLSX import, import apply, direct import, and rollback checks.

## Hetzner Deployment

Before deployment, record the current revision and retain the previous release artifact. The server currently has unrelated local files, so do not use `git reset --hard`.

```bash
ssh 178.105.197.154
cd /home/deploy/pm

git status --short
git rev-parse HEAD
corepack pnpm --filter api test
corepack pnpm --filter api typecheck
corepack pnpm --filter api build
pm2 reload ecosystem.config.cjs --only pm-api --update-env
pm2 save
pm2 describe pm-api
```

Run one authenticated smoke test immediately after reload.

## Performance Rollout

1. Deploy with the default 10-connection pool.
2. Run 20 users as a same-time baseline.
3. Run a synchronized 50-user exam-start spike.
4. Run 200, 300, and 400 concurrent exam users.
5. Compare cache state, `Server-Timing`, p50, p95, p99, errors, answer saves, and submissions.
6. Repeat the series with pool size 15.
7. Test pool size 20 only when pool acquisition remains material and MySQL is healthy.
8. Keep the lowest pool size that removes queueing without harming writes or submissions.

Target question-load thresholds:

| Metric | Target |
| --- | ---: |
| p50 | Below 1 second |
| p95 | Below 2 seconds |
| p99 | Below 4 seconds |
| Error rate | Below 1% |

## Rollback

Rollback the optimization release when:

- Correct answers appear in normal-exam responses.
- Admin question changes remain stale.
- Question errors reach 1%.
- Progress saves or submissions regress materially.
- API/MySQL CPU remains saturated, memory grows continuously, or PM2 restarts.
- Database connections remain queued after test load falls.

Deploy the previously recorded release or revert only this optimization commit, rebuild, reload `pm-api`, and rerun the authenticated smoke test.

## Two-Worker Deployment

Redis-backed shared rate limiting and cache invalidation now make the question-loading path safe to run with two PM2 API workers. Follow [Redis and Two-Worker Deployment](./REDIS-CLUSTER-DEPLOYMENT.md) for installation, configuration, validation, and rollback.
