from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

AppointmentStatus = Literal["scheduled", "checked_in", "completed", "cancelled", "no_show"]
VisitType = Literal["consultation", "follow_up", "procedure", "emergency"]

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
PHONE_PATTERN = r"^\+?[0-9 ()-]{7,20}$"


def _to_naive(value: datetime | None) -> datetime | None:
    # Appointments are stored as naive clinic-local time; drop any offset the
    # client sends instead of silently shifting the slot.
    return value.replace(tzinfo=None) if value is not None and value.tzinfo else value


class DoctorBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    specialty: str = Field(min_length=2, max_length=80)
    room: str = Field(min_length=1, max_length=20)
    email: str | None = Field(default=None, max_length=160, pattern=EMAIL_PATTERN)


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    specialty: str | None = Field(default=None, min_length=2, max_length=80)
    room: str | None = Field(default=None, min_length=1, max_length=20)
    email: str | None = Field(default=None, max_length=160, pattern=EMAIL_PATTERN)
    is_active: bool | None = None


class DoctorRead(DoctorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


class DoctorSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    specialty: str
    room: str


class AppointmentBase(BaseModel):
    patient_name: str = Field(min_length=2, max_length=120)
    patient_phone: str = Field(pattern=PHONE_PATTERN)
    doctor_id: int
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, ge=5, le=240)
    visit_type: VisitType = "consultation"
    reason: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)

    _naive_scheduled_at = field_validator("scheduled_at")(_to_naive)


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    patient_name: str | None = Field(default=None, min_length=2, max_length=120)
    patient_phone: str | None = Field(default=None, pattern=PHONE_PATTERN)
    doctor_id: int | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=5, le=240)
    visit_type: VisitType | None = None
    status: AppointmentStatus | None = None
    reason: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)

    _naive_scheduled_at = field_validator("scheduled_at")(_to_naive)


class AppointmentRead(AppointmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: AppointmentStatus
    doctor: DoctorSummary
    created_at: datetime
    updated_at: datetime


class StatusCounts(BaseModel):
    scheduled: int = 0
    checked_in: int = 0
    completed: int = 0
    cancelled: int = 0
    no_show: int = 0


class DoctorLoad(BaseModel):
    doctor_id: int
    doctor_name: str
    specialty: str
    count: int


class AppointmentStats(BaseModel):
    total: int
    today: int
    upcoming: int
    completion_rate: float
    by_status: StatusCounts
    by_doctor: list[DoctorLoad]
