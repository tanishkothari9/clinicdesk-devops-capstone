from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import clinic_now
from ..db import get_db
from ..models import INACTIVE_STATUSES, Appointment, Doctor
from ..schemas import (
    AppointmentCreate,
    AppointmentRead,
    AppointmentStats,
    AppointmentStatus,
    AppointmentUpdate,
    DoctorLoad,
    StatusCounts,
)
from .doctors import get_doctor_or_404

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

MAX_DURATION = timedelta(minutes=240)


def _get_appointment_or_404(db: Session, appointment_id: int) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Appointment {appointment_id} not found")
    return appointment


def _ensure_slot_free(
    db: Session,
    doctor: Doctor,
    start: datetime,
    duration_minutes: int,
    exclude_id: int | None = None,
) -> None:
    """Reject the booking if it overlaps another active appointment for the same doctor."""
    end = start + timedelta(minutes=duration_minutes)
    query = select(Appointment).where(
        Appointment.doctor_id == doctor.id,
        Appointment.status.not_in(INACTIVE_STATUSES),
        # Coarse window in SQL, exact overlap check below (portable across SQLite and Postgres).
        Appointment.scheduled_at > start - MAX_DURATION,
        Appointment.scheduled_at < end,
    )
    if exclude_id is not None:
        query = query.where(Appointment.id != exclude_id)

    for other in db.scalars(query):
        other_end = other.scheduled_at + timedelta(minutes=other.duration_minutes)
        if other.scheduled_at < end and start < other_end:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"{doctor.full_name} already has an appointment from "
                f"{other.scheduled_at:%H:%M} to {other_end:%H:%M} on {other.scheduled_at:%d %b}",
            )


@router.get("", response_model=list[AppointmentRead])
def list_appointments(
    status_filter: AppointmentStatus | None = Query(default=None, alias="status"),
    doctor_id: int | None = None,
    on_date: date | None = Query(default=None, alias="date"),
    db: Session = Depends(get_db),
) -> list[Appointment]:
    query = select(Appointment).order_by(Appointment.scheduled_at)
    if status_filter is not None:
        query = query.where(Appointment.status == status_filter)
    if doctor_id is not None:
        query = query.where(Appointment.doctor_id == doctor_id)
    if on_date is not None:
        day_start = datetime.combine(on_date, datetime.min.time())
        query = query.where(
            Appointment.scheduled_at >= day_start,
            Appointment.scheduled_at < day_start + timedelta(days=1),
        )
    return list(db.scalars(query))


# Declared before "/{appointment_id}" so "stats" is not parsed as an id.
@router.get("/stats", response_model=AppointmentStats)
def appointment_stats(db: Session = Depends(get_db)) -> AppointmentStats:
    now = clinic_now()
    day_start = datetime.combine(now.date(), datetime.min.time())

    by_status = StatusCounts(
        **dict(db.execute(select(Appointment.status, func.count()).group_by(Appointment.status)).all())
    )
    total = sum(by_status.model_dump().values())
    today = db.scalar(
        select(func.count()).where(
            Appointment.scheduled_at >= day_start,
            Appointment.scheduled_at < day_start + timedelta(days=1),
        )
    )
    upcoming = db.scalar(
        select(func.count()).where(
            Appointment.scheduled_at >= now,
            Appointment.status.in_(("scheduled", "checked_in")),
        )
    )
    closed = by_status.completed + by_status.cancelled + by_status.no_show
    by_doctor = [
        DoctorLoad(doctor_id=row.id, doctor_name=row.full_name, specialty=row.specialty, count=row.count)
        for row in db.execute(
            select(Doctor.id, Doctor.full_name, Doctor.specialty, func.count(Appointment.id).label("count"))
            .outerjoin(Appointment, Appointment.doctor_id == Doctor.id)
            .group_by(Doctor.id, Doctor.full_name, Doctor.specialty)
            .order_by(func.count(Appointment.id).desc(), Doctor.full_name)
        )
    ]
    return AppointmentStats(
        total=total,
        today=today or 0,
        upcoming=upcoming or 0,
        completion_rate=round(by_status.completed / closed, 3) if closed else 0.0,
        by_status=by_status,
        by_doctor=by_doctor,
    )


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)) -> Appointment:
    doctor = get_doctor_or_404(db, payload.doctor_id)
    if not doctor.is_active:
        raise HTTPException(status.HTTP_409_CONFLICT, f"{doctor.full_name} is not taking appointments")
    _ensure_slot_free(db, doctor, payload.scheduled_at, payload.duration_minutes)
    appointment = Appointment(**payload.model_dump(), status="scheduled")
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("/{appointment_id}", response_model=AppointmentRead)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)) -> Appointment:
    return _get_appointment_or_404(db, appointment_id)


@router.put("/{appointment_id}", response_model=AppointmentRead)
def update_appointment(
    appointment_id: int, payload: AppointmentUpdate, db: Session = Depends(get_db)
) -> Appointment:
    appointment = _get_appointment_or_404(db, appointment_id)
    changes = payload.model_dump(exclude_unset=True)

    doctor = get_doctor_or_404(db, changes.get("doctor_id", appointment.doctor_id))
    new_status = changes.get("status", appointment.status)
    slot_changed = {"doctor_id", "scheduled_at", "duration_minutes"} & changes.keys()
    reactivated = appointment.status in INACTIVE_STATUSES and new_status not in INACTIVE_STATUSES
    if new_status not in INACTIVE_STATUSES and (slot_changed or reactivated):
        _ensure_slot_free(
            db,
            doctor,
            changes.get("scheduled_at", appointment.scheduled_at),
            changes.get("duration_minutes", appointment.duration_minutes),
            exclude_id=appointment.id,
        )

    for field, value in changes.items():
        setattr(appointment, field, value)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)) -> Response:
    appointment = _get_appointment_or_404(db, appointment_id)
    db.delete(appointment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
