# Contributing Guide

This project is designed for **single-developer + agentic (GitHub Copilot)** workflows.
All meaningful work flows through GitHub Issues → feature branches → Pull Requests.

---

## Workflow

### 1. Create or find an Issue

Use one of the [issue templates](.github/ISSUE_TEMPLATE/):

| Template           | Use for                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `feature_spec.yml` | New features (PRD-style with acceptance criteria)                       |
| `agent_task.yml`   | Direct Copilot task — focused, unambiguous, Definition of Done included |
| `bug_report.yml`   | Bugs with reproduction steps                                            |
| `adr.yml`          | Architecture decisions you want to record                               |

### 2. Assign the issue

- Assign to **yourself** if you're implementing it directly.
- Assign to **GitHub Copilot** (or use the _"Assign to Copilot"_ button) for agentic implementation.

### 3. Branch

Create a short-lived feature branch from `main`:

```bash
git checkout main && git pull
git checkout -b feature/<short-slug>
```

### 4. Implement

- Read the full issue before writing any code.
- Follow the language-specific conventions below.
- Run `make test && make lint` in every service you touched before committing.
- Use [Conventional Commits](https://www.conventionalcommits.org/):

  ```
  feat(api): add /users endpoint
  fix(frontend): correct heading level in Home component
  chore(ci): pin actions to SHA
  ```

### 5. Open a Pull Request

- PR title = a valid Conventional Commit subject line.
- Fill in all sections of the [PR template](.github/PULL_REQUEST_TEMPLATE.md),
  including the **Agent Implementation Report** if Copilot did the work.
- Link the issue: `Closes #<issue-number>`.
- All CI checks must be green before merging.

### 6. Review and merge

- Squash-merge to `main`.
- Delete the feature branch after merge.

---

## Build / Test Contract

Every service has a `Makefile` that runs commands **inside Docker** — no local runtime needed.

```bash
# From services/<name>/
make test    # run test suite in the development container
make lint    # run linter in the development container
make build   # build the production image
```

---

## Language-Specific Conventions

### Python (`services/api/`)

- **Runtime**: Python 3.13, FastAPI, uvicorn
- **Dependencies**: `uv` + `pyproject.toml` — never edit `requirements.txt`
- **Linter**: `ruff check app/ tests/` (rules: E, F, I, UP; line-length 88)
- **Tests**: `pytest` with `asyncio_mode = auto`; use `httpx.AsyncClient` + `ASGITransport`
- **OTEL**: instrument with `opentelemetry-sdk`; export to `OTEL_EXPORTER_OTLP_ENDPOINT`

### TypeScript / Next.js (`services/frontend/`)

- **Runtime**: Node 22, Next.js 15 App Router
- **Strict TypeScript**: `strict: true` — no implicit `any`
- **Server Components** by default; `"use client"` only when needed
- **Linter**: `next lint` (ESLint with `next/core-web-vitals` + `next/typescript`)
- **Tests**: Jest 29 + React Testing Library; `setupFilesAfterEnv: jest.setup.ts`
- **OTEL**: instrument with `@opentelemetry/sdk-node`; export to `OTEL_EXPORTER_OTLP_ENDPOINT`

---

## Environment Variables

1. Copy `.env.example` → `.env` at root and in each service:
   ```bash
   node scripts/setup.js
   ```
2. Never commit `.env` files — they are gitignored.
3. Keep `.env.example` up to date whenever a new variable is introduced.

---

## Docker Compose

| File                                             | Purpose                                              |
| ------------------------------------------------ | ---------------------------------------------------- |
| `docker-compose.yml`                             | Base service definitions                             |
| `docker-compose.override.yml`                    | Dev overrides (auto-loaded, bind mounts, hot reload) |
| `docker-compose.prod.yml`                        | Production overrides (standalone, resource limits)   |
| `observability/docker-compose.observability.yml` | LGTM observability stack                             |
| `proxy/docker-compose.proxy.yml`                 | Traefik reverse proxy                                |

Start everything locally:

```bash
docker compose up          # services only (override auto-loaded)
docker compose -f docker-compose.yml -f observability/docker-compose.observability.yml up
```

---

## Pre-commit Hooks (lefthook)

After cloning, install hooks:

```bash
npm install          # installs lefthook from root package.json
npx lefthook install
```

Hooks run automatically on `git commit`:

- `commitlint` — validates the commit message format
- `gitleaks` — scans the staged diff for secrets

---

## CI Checks (required for merge)

| Check           | Trigger     | What it does                                 |
| --------------- | ----------- | -------------------------------------------- |
| `commitlint`    | PR          | Validates all commit messages in the PR      |
| `ci-gate`       | PR          | Passes only when all per-service jobs pass   |
| `codeql`        | PR / weekly | Static analysis for security vulnerabilities |
| `security-scan` | PR          | Trivy CVE scan + gitleaks secret scan        |

---

## Release Process

Releases are automated by `release-please`:

1. Conventional commits on `main` are parsed by `release-please`.
2. A **Release PR** is automatically opened with a bumped version and updated `CHANGELOG.md`.
3. Merge the Release PR → a GitHub Release is created.

---

## What NOT to Change Directly

| Area                        | Reason                                             |
| --------------------------- | -------------------------------------------------- |
| `.github/workflows/`        | Only modify when the task explicitly targets CI/CD |
| `docker-compose.yml` (base) | Service topology changes need explicit discussion  |
| `CODEOWNERS`                | Managed by the human developer                     |
| Branch protection / ruleset | Managed via GitHub UI                              |
