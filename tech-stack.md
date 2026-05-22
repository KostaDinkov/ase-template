# Tech Stack

A study reference listing every technology used in this project, grouped by category.

---

## Backend

| Technology         | Description                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Python 3.13**    | The runtime for the API service; 3.13 brings free-threaded mode and improved performance.     |
| **FastAPI**        | Async Python web framework that auto-generates OpenAPI docs from type annotations.            |
| **Uvicorn**        | ASGI server that runs FastAPI; uses `uvloop` and `httptools` for high throughput.             |
| **uv**             | Ultra-fast Python package and virtual-environment manager that replaces pip/venv/pip-tools.   |
| **Ruff**           | Extremely fast Python linter and formatter (replaces flake8 + isort + black) written in Rust. |
| **pytest**         | Python test runner used for all unit and integration tests in the API service.                |
| **pytest-asyncio** | pytest plugin that lets async test functions run without boilerplate event-loop setup.        |
| **HTTPX**          | Async-capable HTTP client used in tests to send requests to the FastAPI app.                  |

---

## Frontend

| Technology                    | Description                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| **Node.js 22 (Alpine)**       | JavaScript runtime used to build and serve the Next.js frontend inside Docker.                     |
| **Next.js 15 (App Router)**   | React meta-framework with file-based routing, RSC, and built-in API routes.                        |
| **React 19**                  | UI library; Server Components are the default, `"use client"` used only when needed.               |
| **TypeScript 5**              | Strict static typing across the entire frontend (`strict: true` in tsconfig).                      |
| **ESLint 9**                  | JavaScript/TypeScript linter configured with `next/core-web-vitals` + `next/typescript` rule sets. |
| **Jest 29**                   | JavaScript test runner used with `jsdom` environment to test React components.                     |
| **jest-environment-jsdom**    | Simulates a browser DOM inside Node.js so React components can be rendered in tests.               |
| **@testing-library/react**    | Test utilities that encourage testing components the way users interact with them.                 |
| **@testing-library/jest-dom** | Custom Jest matchers for asserting DOM state (e.g., `toBeInTheDocument()`).                        |

---

## Infrastructure & Containerization

| Technology                    | Description                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Docker**                    | Containerizes every service using multi-stage builds to keep production images small.                    |
| **Docker Compose**            | Orchestrates all services locally with three compose files: base, override (dev), and prod.              |
| **Alpine Linux**              | Minimal Linux base image used for the frontend container to reduce attack surface and size.              |
| **Python Slim**               | Minimal Debian-based Python base image used for the API container.                                       |
| **Non-root container user**   | Every container runs as a user named `app` (not root) to follow least-privilege security.                |
| **`HEALTHCHECK` instruction** | Every Dockerfile includes a Docker health check pointing at `GET /healthz` to enable liveness detection. |

---

## Observability (LGTM Stack)

| Technology                            | Description                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **OpenTelemetry Collector (contrib)** | Vendor-agnostic telemetry pipeline that receives, processes, and exports metrics, logs, and traces. |
| **Prometheus**                        | Time-series database that scrapes and stores metrics; queried by Grafana.                           |
| **Loki**                              | Log aggregation system optimized for storing and querying structured logs alongside traces.         |
| **Promtail**                          | Log shipping agent that tails container logs and pushes them to Loki.                               |
| **Tempo**                             | Distributed tracing backend that stores and queries traces (compatible with Jaeger/Zipkin).         |
| **Grafana**                           | Visualization platform used to build dashboards over Prometheus, Loki, and Tempo data.              |

---

## Proxy & Networking

| Technology                        | Description                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Traefik v3**                    | Reverse proxy and ingress controller that auto-discovers Docker services via labels.            |
| **Let's Encrypt (ACME)**          | Free TLS certificate authority; Traefik requests certificates automatically via HTTP challenge. |
| **TLS with modern cipher suites** | Traefik is configured to enforce HTTPS with hardened cipher and protocol settings.              |

---

## CI/CD

| Technology              | Description                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **GitHub Actions**      | Cloud CI/CD platform; all pipelines are defined as YAML workflows in `.github/workflows/`.                        |
| **dorny/paths-filter**  | GitHub Action that detects which service directories changed so only affected services are tested.                |
| **release-please**      | Google's GitHub Action that automates semantic versioning, changelogs, and release PRs from Conventional Commits. |
| **CodeQL**              | GitHub's static analysis engine that scans source code for security vulnerabilities.                              |
| **Gitleaks**            | Secret-scanning tool that runs as a pre-commit hook to block accidental credential commits.                       |
| **SSH deploy workflow** | GitHub Actions CD job that SSH-es into a server and runs `docker compose up` to deploy.                           |

---

## Dev Tooling

| Technology               | Description                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Lefthook**             | Fast Git hooks manager; runs commitlint and Gitleaks on every commit.                                   |
| **Commitlint**           | Enforces the Conventional Commits format (`type(scope): description`) on every commit message.          |
| **zx**                   | Google's library for writing shell-like scripts in modern ESM JavaScript using tagged templates.        |
| **Make**                 | Every service exposes `make test`, `make lint`, and `make build` targets that run inside Docker.        |
| **Conventional Commits** | Commit message standard (`feat`, `fix`, `chore`, etc.) that drives automated changelogs and versioning. |

---

## Copilot & Agentic Workflow

| Technology                                                   | Description                                                                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **GitHub Copilot**                                           | AI pair-programming extension wired into VS Code; used for code completion and chat.                                       |
| **GitHub Copilot Chat**                                      | Conversational AI interface inside VS Code; used with agent mode for multi-step tasks.                                     |
| **Copilot Instructions (`.github/copilot-instructions.md`)** | Workspace-level instructions that shape Copilot's behavior for this specific repo.                                         |
| **Per-context instruction files**                            | `applyTo` pattern files in `.github/instructions/` that inject rules only for matching file paths.                         |
| **Context7 MCP (Upstash)**                                   | MCP server that gives Copilot access to up-to-date library documentation during coding sessions.                           |
| **Playwright MCP**                                           | MCP server that lets Copilot control a real browser for front-end validation and automation tasks.                         |
| **Fetch MCP**                                                | MCP server that lets Copilot make HTTP requests to external APIs during agentic tasks.                                     |
| **Spec-first agentic workflow**                              | Convention: every task starts as a GitHub Issue, is implemented on a `feature/<slug>` branch, and lands via a reviewed PR. |

---

## VS Code Extensions (recommended)

| Extension                             | Description                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **ms-python.python**                  | Microsoft's Python extension providing IntelliSense, debugging, and test discovery.              |
| **charliermarsh.ruff**                | VS Code integration for the Ruff linter/formatter with on-save auto-fix support.                 |
| **dbaeumer.vscode-eslint**            | Surfaces ESLint errors inline and applies auto-fixes on save.                                    |
| **esbenp.prettier-vscode**            | Opinionated code formatter for JS/TS/JSON/Markdown files.                                        |
| **ms-azuretools.vscode-docker**       | Docker extension for building images, managing containers, and browsing registries from VS Code. |
| **github.vscode-pull-request-github** | Manage GitHub pull requests and issues directly inside VS Code.                                  |
| **editorconfig.editorconfig**         | Reads `.editorconfig` files to enforce consistent indent style and line endings across editors.  |
