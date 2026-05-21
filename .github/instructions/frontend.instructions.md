---
applyTo: "services/frontend/**"
---

# Frontend (Next.js 15) Instructions

## Project Layout

```
services/frontend/
├── app/
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (Server Component)
│   └── api/
│       └── health/
│           └── route.ts   # GET /api/health → { status: "ok" }
├── __tests__/
│   └── page.test.tsx      # Jest + React Testing Library
├── public/                # Static assets
├── jest.config.js
├── jest.setup.ts
├── eslint.config.mjs
├── next.config.ts
├── tsconfig.json
├── Dockerfile
├── Makefile               # make test | make lint | make build
└── package.json
```

## TypeScript

- `strict: true` in `tsconfig.json` — no implicit `any`
- Use explicit return types on all exported functions and components
- Prefer `type` over `interface` for object shapes; use `interface` for extendable contracts

## Next.js Conventions

- App Router only — no `pages/` directory
- Default to **Server Components**; add `"use client"` only when the component needs browser APIs, event handlers, or React hooks
- Data fetching: `async` Server Components with `fetch()` — no `useEffect` data fetching
- Route handlers in `app/api/<route>/route.ts`; return `Response` or `NextResponse`
- Every deployment must expose `GET /api/health → 200 { status: "ok" }`

## Styling

- Tailwind CSS (if added) — no inline `style` props
- Class names via `clsx` / `cn` helper
- Do not use CSS Modules alongside Tailwind

## Testing

- Framework: Jest 29 + React Testing Library
- Setup file: `jest.setup.ts` (imported via `setupFilesAfterEnv`)
- Test files in `__tests__/`; filename mirrors the component (`page.test.tsx`)
- Prefer `getByRole` queries over `getByTestId`
- Always run `make test` before opening a PR

## Linting

- ESLint with `next/core-web-vitals` + `next/typescript` (flat config in `eslint.config.mjs`)
- Always run `make lint` before opening a PR
- No `@ts-ignore` or `eslint-disable` without an explaining comment

## Docker

- Multi-stage build: `base` → `deps` → `development` → `builder` → `production`
- `development` stage used by `make test` / `make lint`
- `production` stage uses Next.js standalone output (`output: "standalone"` in `next.config.ts`)
- Non-root user `app`; `HEALTHCHECK` calls `GET /api/health`
