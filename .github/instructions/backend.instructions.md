---
applyTo: "services/api/**"
---

# Backend (Python / FastAPI) Instructions

## Project Layout

```
services/api/
├── app/
│   └── main.py          # FastAPI application entry point
├── tests/
│   └── test_main.py     # pytest test suite
├── Dockerfile
├── Makefile             # make test | make lint | make build
└── pyproject.toml       # dependencies + ruff + pytest config
```

## Dependencies

- Managed via `uv` + `pyproject.toml`; never edit `requirements.txt` directly
- Add runtime deps under `[project] dependencies`
- Add dev/test deps under `[project.optional-dependencies] dev`

## Code Style

- Linter/formatter: `ruff` — runs as `ruff check app/ tests/`
- Enabled rules: `E`, `F`, `I` (isort), `UP` (pyupgrade)
- Line length: 88 characters
- Always run `make lint` before committing

## FastAPI Conventions

- Use `async def` for all route handlers
- Define Pydantic models for request and response bodies
- Return meaningful HTTP status codes; use `HTTPException` for errors
- Every router must have a `GET /healthz` endpoint that returns `{"status": "ok"}`

## Testing

- Framework: `pytest` with `asyncio_mode = auto`
- Use `httpx.AsyncClient` with `ASGITransport` for integration tests
- Test files live in `tests/`; mirror the module structure of `app/`
- Always run `make test` before opening a PR

## Docker

- Multi-stage build: `base` → `deps` → `development` → `production`
- `development` stage installs test/lint tools and is used by `make test` / `make lint`
- `production` stage runs `uvicorn` with 2 workers, non-root user `app`
- `HEALTHCHECK` must be present; calls `GET /healthz`
