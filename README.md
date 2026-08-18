# PM Exam Pro

PM Exam Pro is a practice exam platform for PMP, CAPM, PMI-RMP, PMI-ACP, and related project management certification preparation.

## Tech Stack

- Next.js web app in `apps/web`
- Express API in `apps/api`
- MySQL 8.4 via Docker Compose
- pnpm workspace with shared packages in `packages`

## Local Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start MySQL:

   ```bash
   pnpm db:up
   ```

3. Copy environment files and adjust values as needed:

   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

4. Start the development servers:

   ```bash
   pnpm dev
   ```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- MySQL: `localhost:3307`

## Useful Commands

```bash
pnpm --filter api typecheck
pnpm --filter web typecheck
pnpm build
pnpm db:up
pnpm db:down
pnpm seed
```

## Deployment Docs

- Main deployment guide: `docs/DEPLOYMENT.md`
- Quick deployment guide: `docs/QUICK-DEPLOY-INSTRUCTIONS.md`
- Database import/export: `docs/DATABASE-EXPORT-IMPORT.md`
- Payment gateway deployment: `docs/PAYMENT-GATEWAY-DEPLOYMENT.md`
- Admin guide: `docs/ADMIN-GUIDE.md`

## Notes

- Do not commit real `.env` files or production secrets.
- Use `apps/api/scripts/create-super-admin.ts` to create an initial admin account when needed.
- Maintenance and launch teaser mode can be configured from Admin Settings.
