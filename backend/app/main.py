import logging

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .routers import appointments, doctors

logger = logging.getLogger("clinicdesk")
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Appointment scheduling API for ClinicDesk: doctors, bookings and clinic stats.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(doctors.router)
app.include_router(appointments.router)

Instrumentator(excluded_handlers=["/metrics", "/health", "/ready", "/api/health"]).instrument(app).expose(
    app, include_in_schema=False
)


@app.get("/", tags=["meta"])
def root() -> dict[str, str]:
    return {"service": settings.app_name, "version": settings.app_version, "docs": "/docs"}


@app.get("/health", tags=["meta"])
@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    """Liveness: the process is up and serving HTTP."""
    return {"status": "ok", "version": settings.app_version}


@app.get("/ready", tags=["meta"])
def ready(db: Session = Depends(get_db)) -> JSONResponse:
    """Readiness: only accept traffic when the database answers."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Readiness check failed: database unreachable")
        return JSONResponse({"status": "not ready", "database": "unreachable"}, status.HTTP_503_SERVICE_UNAVAILABLE)
    return JSONResponse({"status": "ready", "database": "ok"})
