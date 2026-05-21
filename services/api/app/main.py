from fastapi import FastAPI

app = FastAPI(title="API Service", version="0.1.0")


@app.get("/healthz")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/")
async def root() -> dict:
    return {"message": "API is running"}
