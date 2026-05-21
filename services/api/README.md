# API Service

Python / FastAPI example service.

## Development

```bash
# From repo root
docker compose up api
```

Service available at `http://localhost:8000`.

| Endpoint | Description |
|----------|-------------|
| `GET /healthz` | Health check — returns `{"status": "ok"}` |
| `GET /` | Root endpoint |
| `GET /docs` | Auto-generated Swagger UI |

## CI Contract

```bash
make test   # pytest
make lint   # ruff
make build  # docker build --target production
```

## Adding Dependencies

```bash
uv add <package>   # updates pyproject.toml
```

## Observability

Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317` to enable
metrics, logs, and traces. Install `opentelemetry-sdk` and the FastAPI
instrumentation package when ready.
