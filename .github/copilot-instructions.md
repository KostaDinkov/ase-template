# GitHub Copilot Instructions

## Project Overview

This is a **polyglot monorepo template** for single-developer + agentic (GitHub Copilot) development workflows. It contains two example services:

- `services/api/` — Python / FastAPI
- `services/frontend/` — Next.js 15 (App Router)

## Repository Structure

```
services/          # Containerised services (one folder = one service)
scripts/           # zx ESM scripts: setup.js, deploy.js, validate-env.js
observability/     # LGTM stack (Grafana, Loki, Tempo, Prometheus, OTEL Collector)
proxy/             # Traefik reverse proxy config
.github/
  workflows/       # CI (paths-filter fan-out), CD (SSH deploy), security, release
  instructions/    # Per-context Copilot instructions (applyTo patterns)
  ISSUE_TEMPLATE/  # feature_spec, agent_task, bug_report, adr
.vscode/           # MCP servers, workspace settings, recommended extensions
```

## Build / Test Contract

Every service has a `Makefile` with three targets that run **inside Docker**:

```bash
make test    # Run tests in the development container
make lint    # Run linter in the development container
make build   # Build the production image
```

Never invoke language runtimes (python, node, npm, pytest, ruff, etc.) directly in CI or scripts — always go through `make`.

## Code Style Rules

### General

- Conventional Commits enforced: `type(scope): description` — types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`
- No secrets or credentials committed — use `.env` files (gitignored) backed by `.env.example`
- All Dockerfiles must: use multi-stage builds, non-root user (`app`), Alpine or slim base, `HEALTHCHECK`, and expose `GET /healthz → 200`

### Python (`services/api/`)

- Formatter/linter: `ruff` (select E, F, I, UP; line-length 88)
- Tests: `pytest` with `asyncio_mode = auto`
- Framework: FastAPI; async handlers preferred
- Dependencies managed via `uv` + `pyproject.toml`

### TypeScript/Next.js (`services/frontend/`)

- Strict TypeScript (`strict: true` in tsconfig)
- Next.js 15 App Router — use Server Components by default, `"use client"` only when needed
- Tests: Jest + React Testing Library; setup file: `jest.setup.ts`
- Linter: ESLint with `next/core-web-vitals` + `next/typescript`
- CSS: Tailwind (if added); no inline styles

### Scripts (`scripts/`)

- Written with [zx](https://github.com/google/zx) v8, ESM (`.js` files)
- Root `package.json` has `"type": "module"`

## Agentic Workflow

1. Work starts from a GitHub Issue (feature spec, agent task, or bug report)
2. Create a short-lived `feature/<slug>` branch
3. Open a PR — description must include the **Agent Implementation Report** section from the PR template
4. All CI checks must pass before merge
5. Squash merge to `main` — commit message follows Conventional Commits

## What NOT to Touch

- `.github/workflows/` — only modify if the task explicitly targets CI/CD
- `docker-compose.yml` base file — service topology changes require explicit discussion
- `CODEOWNERS` — managed by the human developer
- Branch protection rules and ruleset configuration — managed via GitHub UI
