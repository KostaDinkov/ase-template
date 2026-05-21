# Frontend Service

Next.js example frontend.

## Development

```bash
# From repo root
docker compose up frontend
```

Service available at `http://localhost:3000`.

| Endpoint | Description |
|----------|-------------|
| `GET /` | Home page |
| `GET /api/health` | Health check — returns `{"status": "ok"}` |

## CI Contract

```bash
make test   # jest
make lint   # next lint (eslint)
make build  # docker build --target production
```

## Adding Pages

Add files under `app/` following Next.js App Router conventions.

## Observability

Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317` and install
`@vercel/otel` for automatic Next.js instrumentation.
