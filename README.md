# ase-template

A **polyglot monorepo template** optimised for single-developer + agentic (GitHub Copilot) development. Clone it, follow the quick-start, and you get:

- **Two example services** — Python/FastAPI API + Next.js 15 frontend
- **Docker-first CI** — `make test`, `make lint`, `make build` run inside containers; no local runtime required in CI
- **GitHub-native automation** — commitlint, paths-filtered CI, SSH CD, auto-merge, security scanning, release-please
- **Observability** — LGTM stack (Grafana, Loki, Tempo, Prometheus) + OTEL Collector, zero service-side config
- **Production proxy** — Traefik with Let's Encrypt ACME
- **Copilot-ready** — per-context instruction files, MCP servers (Context7, Playwright, fetch), VS Code settings

---

## Quick Start

### 1. Use this template

Click **"Use this template"** on GitHub, or clone directly:

```bash
git clone https://github.com/<you>/ase-template.git my-project
cd my-project
```

### 2. Configure your environment

```bash
npm install           # install root tools (zx, lefthook, commitlint)
npx lefthook install  # register pre-commit hooks
node scripts/setup.js # copy .env.example → .env everywhere
```

Edit the generated `.env` files:

| File                     | Key variables                                  |
| ------------------------ | ---------------------------------------------- |
| `.env`                   | `COMPOSE_PROJECT_NAME`, `DOMAIN`, `ACME_EMAIL` |
| `services/api/.env`      | service-specific vars                          |
| `services/frontend/.env` | `NEXT_PUBLIC_API_URL`                          |

### 3. Start the stack locally

```bash
docker compose up --build
```

| Service  | URL                                              |
| -------- | ------------------------------------------------ |
| API      | http://localhost:8000                            |
| Frontend | http://localhost:3000                            |
| Grafana  | http://localhost:3001 (with observability stack) |

### 4. Add GitHub Secrets for CD

| Secret            | Value                           |
| ----------------- | ------------------------------- |
| `VPS_HOST`        | IP or hostname of your VPS      |
| `VPS_USER`        | SSH user                        |
| `VPS_SSH_KEY`     | Private SSH key (no passphrase) |
| `VPS_DEPLOY_PATH` | Absolute path to project on VPS |

Create a `production` environment in **Settings → Environments** and add the secrets there.

---

## Repository Structure

```
.github/
  workflows/         # CI, CD, security, release automation
  instructions/      # Per-context Copilot instructions
  ISSUE_TEMPLATE/    # feature_spec, agent_task, bug_report, adr
.vscode/             # MCP servers, workspace settings, extensions
services/
  api/               # Python / FastAPI (Dockerfile + Makefile + tests)
  frontend/          # Next.js 15 App Router (Dockerfile + Makefile + tests)
scripts/             # zx ESM scripts: setup, deploy, validate-env
observability/       # LGTM stack compose + configs
proxy/               # Traefik config
docker-compose.yml           # Base
docker-compose.override.yml  # Dev (auto-loaded)
docker-compose.prod.yml      # Production
```

---

## Customisation Guide

### Add a new service

1. Create `services/<name>/` with a `Dockerfile`, `Makefile` (with `test`, `lint`, `build` targets), and `.env.example`.
2. Add the service to `docker-compose.yml`.
3. Add a `paths-filter` entry in `.github/workflows/ci.yml` so CI runs automatically.
4. Add a Dependabot entry in `.github/dependabot.yml`.

### Change the tech stack

The `services/api/` and `services/frontend/` directories are **examples**. Replace them with any language or framework — as long as the `Makefile` exposes `make test`, `make lint`, and `make build`, the CI pipeline works unchanged.

### Enable observability

```bash
docker compose \
  -f docker-compose.yml \
  -f observability/docker-compose.observability.yml \
  up --build
```

Then open Grafana at http://localhost:3001 (default credentials: `admin` / `admin`).

### Enable production proxy

Requires a domain and a server reachable from the internet (for ACME HTTP-01 challenge):

```bash
# On your VPS
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f proxy/docker-compose.proxy.yml \
  up -d
```

Set `DOMAIN` and `ACME_EMAIL` in `.env` before running.

---

## CI/CD Overview

| Workflow               | Trigger        | Purpose                                       |
| ---------------------- | -------------- | --------------------------------------------- |
| `ci.yml`               | PR             | Path-filtered per-service test + lint + build |
| `commitlint.yml`       | PR             | Enforce Conventional Commits                  |
| `compose-validate.yml` | PR             | Validate Docker Compose merges                |
| `codeql.yml`           | PR / weekly    | Static security analysis                      |
| `security-scan.yml`    | PR             | Trivy CVE + gitleaks secret scan              |
| `cd.yml`               | push to `main` | SSH deploy to VPS                             |
| `release-please.yml`   | push to `main` | Automated release PRs + CHANGELOG             |
| `pr-automation.yml`    | PR             | Label agent PRs, enable auto-merge            |

---

## Agentic Workflow

The template is optimised for working with **GitHub Copilot as an agent**:

1. Open a GitHub Issue using the `feature_spec` or `agent_task` template.
2. Assign the issue to GitHub Copilot.
3. Copilot opens a PR — review the **Agent Implementation Report** in the PR description.
4. All CI checks pass → squash-merge.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

---

## License

MIT
