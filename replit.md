# FraudGuard

AI-powered credit card fraud detection dashboard for real-time transaction monitoring, risk scoring, and fraud analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/fraud-dashboard run dev` — run the frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing key

## Demo Credentials

- **Admin**: `admin@fraudguard.io` / `password`
- **Analyst**: `analyst@fraudguard.io` / `password`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, Recharts, Wouter
- API: Express 5 + JWT auth (SESSION_SECRET)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — database schema files (one per table)
- `lib/api-zod/` — generated Zod schemas (from openapi.yaml)
- `lib/api-client-react/` — generated React Query hooks + custom fetch
- `artifacts/api-server/src/` — Express backend (routes, middleware, fraud engine)
- `artifacts/fraud-dashboard/src/` — React frontend (pages, components, hooks)
- `artifacts/api-server/src/lib/fraud-engine.ts` — ML-style fraud scoring engine
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware
- `artifacts/api-server/src/types/express.d.ts` — Express Request augmentation for `req.auth`

## Architecture decisions

- Contract-first API: OpenAPI spec drives Zod validation + React Query hooks via Orval codegen
- JWT stored in localStorage under key `fraud_token`; injected via `setAuthTokenGetter` from `@workspace/api-client-react`
- Fraud scoring is a rules-based engine (not ML) in `fraud-engine.ts` — scores 0–100, levels: low/medium/high/critical
- Transactions auto-flagged (>= high) or declined (critical) at creation time; alerts created for high/critical
- Admin users see all data; regular users see only their own transactions/cards/alerts

## Product

- **Dashboard**: live stats, fraud trend chart (30 days), risk distribution pie, recent high-risk transactions
- **Transactions**: paginated list with filters, inline fraud submission, transaction detail with risk meter
- **Cards**: card management with block/unblock, visual credit card UI
- **Alerts**: real-time fraud notifications with mark-as-read
- **Admin**: user management (role/status changes), fraud log viewer, system stats

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing OpenAPI spec, run codegen: `pnpm --filter @workspace/api-spec run codegen`
- After changing DB schema, run: `pnpm --filter @workspace/db run push`
- `req.auth` type augmentation is in `artifacts/api-server/src/types/express.d.ts` using `global namespace Express`
- The seeded password hash (`$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`) is bcrypt of `"password"`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
