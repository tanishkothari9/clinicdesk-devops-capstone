from datetime import datetime
from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ClinicDesk API"
    app_version: str = "dev"
    database_url: str = "postgresql+psycopg://clinicdesk:clinicdesk@localhost:5432/clinicdesk"
    clinic_timezone: str = "Asia/Kolkata"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clinic_now() -> datetime:
    """Current wall-clock time in the clinic's timezone, as a naive datetime.

    Appointments are stored as naive local clinic time, so "today" and
    "upcoming" must be computed in the same frame of reference regardless of
    the container's own timezone (UTC in Kubernetes).
    """
    return datetime.now(ZoneInfo(get_settings().clinic_timezone)).replace(tzinfo=None)
