# Platform Conventions

## Environment Defaults

- API port: `4000`
- Web port: `3000`
- MySQL database: `pm_exam`
- Access duration default: `90` days
- Primary payment gateway target: `iPay88`

## Implementation Notes

- Use feature flags for secondary payment providers.
- Keep request and audit logging enabled in local development.
- Treat Dockerized MySQL as the baseline integration target, even when using in-memory fallbacks for early UI iteration.
