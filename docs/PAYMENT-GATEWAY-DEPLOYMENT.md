# Payment Gateway Deployment Runbook

This runbook covers the payment changes added after commit `9bf2882` (`successful payment with stripe`) up to the current payment gateway branch.

## What Changed

- Payment gateway selection is now dynamic from the database-backed Admin Settings page.
- Stripe was refactored to read credentials from Admin Settings first, then `.env`.
- PayPal was added.
- Billplz was added, but still needs sandbox/account setup before it should be enabled.
- Checkout now exposes enabled/configured gateways through `GET /api/payment-gateways`.
- Gateway readiness is checked before creating a checkout payment.

## Database Impact

There is no new table or column migration in this commit range.

The new payment settings are stored as key/value rows in the existing `app_settings` table:

```text
payment.toyyibpay.*
payment.stripe.*
payment.paypal.*
payment.billplz.*
```

You do not need to run a new SQL migration just for these payment-gateway changes. If the `app_settings` table has no payment rows yet, the API falls back to values in `apps/api/.env`.

Before deploying, confirm the older payment tables/columns already exist on the server:

```bash
docker exec pm-mysql mysql -u pm_user -p"YOUR_MYSQL_PASSWORD" pm_exam -e "
SHOW TABLES LIKE 'app_settings';
SHOW TABLES LIKE 'payment_events';
SHOW COLUMNS FROM orders LIKE 'gateway_provider';
SHOW COLUMNS FROM orders LIKE 'gateway_bill_code';
SHOW COLUMNS FROM orders LIKE 'cart_group_id';
"
```

If `cart_group_id` is missing, run the existing migration:

```bash
docker exec -i pm-mysql mysql -u pm_user -p"YOUR_MYSQL_PASSWORD" pm_exam < infra/docker/mysql/init/004_add_cart_group.sql
```

The API also applies existing runtime table/column guards when it starts and receives traffic:

```bash
curl http://localhost:4000/health
```

## Required Environment Variables

Update `apps/api/.env` on the server before rebuilding/restarting:

```env
TOYYIBPAY_SECRET_KEY=
TOYYIBPAY_CATEGORY_CODE=
TOYYIBPAY_SANDBOX=true

STRIPE_SANDBOX=true
STRIPE_TEST_SECRET_KEY=
STRIPE_TEST_WEBHOOK_SECRET=
STRIPE_LIVE_SECRET_KEY=
STRIPE_LIVE_WEBHOOK_SECRET=

PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_SANDBOX=true

BILLPLZ_API_KEY=
BILLPLZ_COLLECTION_ID=
BILLPLZ_X_SIGNATURE_KEY=
BILLPLZ_SANDBOX=true

API_BASE_URL=https://YOUR_DOMAIN
APP_URL=https://YOUR_DOMAIN
```

Use sandbox values only while testing. For production, replace gateway credentials with live credentials and set the sandbox flags to `false` where applicable.

## Gateway Callback URLs

Configure these URLs in the payment-provider dashboards where webhooks/callbacks are required:

| Gateway | Callback URL |
|---|---|
| ToyyibPay | `https://YOUR_DOMAIN/api/payments/callbacks/toyyibpay` |
| Stripe | `https://YOUR_DOMAIN/api/payments/callbacks/stripe` |
| PayPal | `https://YOUR_DOMAIN/api/payments/callbacks/paypal` |
| Billplz | `https://YOUR_DOMAIN/api/payments/callbacks/billplz` |

For PM Exam Pro, the Stripe destination is
`https://www.pmexampro.com/api/payments/callbacks/stripe`.

Stripe test and live endpoints have different signing secrets. Store them as
`STRIPE_TEST_WEBHOOK_SECRET` and `STRIPE_LIVE_WEBHOOK_SECRET`; `STRIPE_SANDBOX`
selects the active credential pair without deleting the other one. Subscribe the
endpoint to `checkout.session.completed`, `checkout.session.expired`,
`checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`.

## Deploy Steps

Run these on the server:

```bash
cd /home/deploy/pm

# 1. Backup first
mkdir -p ~/backups
docker exec pm-mysql mysqldump -u pm_user -p"YOUR_MYSQL_PASSWORD" --no-tablespaces pm_exam > ~/backups/pm_exam_before_payment_gateways_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull and install
git pull --ff-only origin main
pnpm install --frozen-lockfile

# 3. Build and reload
pnpm build
pm2 reload ecosystem.config.cjs
pm2 save

# 4. Trigger API schema guard and check logs
curl http://localhost:4000/health
pm2 logs pm-api --lines 80 --nostream
```

If `pnpm install --frozen-lockfile` fails because the lockfile changed, run `pnpm install`, then rebuild.

## Enable Gateways

After deployment:

1. Open `https://YOUR_DOMAIN/admin/settings`.
2. Go to the Payment settings section.
3. Confirm each gateway credential is present.
4. Enable only the gateways that are fully configured.
5. Keep Billplz disabled until sandbox creation and callback verification are confirmed.
6. Save settings.

Settings saved in Admin Settings override `.env` values. If a credential is blank in Admin Settings, save the real value there or remove that setting row so the API can fall back to `.env`.

To inspect saved payment settings:

```bash
docker exec pm-mysql mysql -u pm_user -p"YOUR_MYSQL_PASSWORD" pm_exam -e "
SELECT setting_key, IF(setting_value = '', '(blank)', '(set)') AS value_state
FROM app_settings
WHERE setting_key LIKE 'payment.%'
ORDER BY setting_key;
"
```

## Post-Deploy Checks

```bash
curl https://YOUR_DOMAIN/api/payment-gateways
curl https://YOUR_DOMAIN/health
pm2 status
```

Then test checkout with one low-value sandbox purchase per enabled gateway:

- Gateway appears on checkout.
- Payment redirects to the provider.
- Provider redirects back to `/checkout/result`.
- Order becomes `paid`.
- Enrollment becomes active.
- A row is created in `payment_events`.

Check recent orders and payment events:

```bash
docker exec pm-mysql mysql -u pm_user -p"YOUR_MYSQL_PASSWORD" pm_exam -e "
SELECT id, status, gateway_provider, gateway_bill_code, gateway_reference, created_at
FROM orders
ORDER BY id DESC
LIMIT 10;

SELECT id, order_id, provider, event_type, created_at
FROM payment_events
ORDER BY id DESC
LIMIT 10;
"
```

## Rollback

If checkout breaks after deployment:

```bash
cd /home/deploy/pm
git log --oneline -5
git checkout 9bf2882
pnpm install
pnpm build
pm2 reload ecosystem.config.cjs
```

Only restore the database backup if data was corrupted. A normal code rollback should not require database restore because this payment update does not add destructive schema changes.
