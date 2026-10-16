from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Appointment, Doctor
from ..schemas import DoctorCreate, DoctorRead, DoctorUpdate

router = APIRouter(prefix="/api/doctors", tags=["doctors"])


def get_doctor_or_404(db: Session, doctor_id: int) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Doctor {doctor_id} not found")
    return doctor


def _commit_or_conflict(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "A doctor with this email already exists") from exc


@router.get("", response_model=list[DoctorRead])
def list_doctors(db: Session = Depends(get_db)) -> list[Doctor]:
    return list(db.scalars(select(Doctor).order_by(Doctor.full_name)))


@router.post("", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db)) -> Doctor:
    doctor = Doctor(**payload.model_dump())
    db.add(doctor)
    _commit_or_conflict(db)
    db.refresh(doctor)
    return doctor


@router.get("/{doctor_id}", response_model=DoctorRead)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)) -> Doctor:
    return get_doctor_or_404(db, doctor_id)


@router.put("/{doctor_id}", response_model=DoctorRead)
def update_doctor(doctor_id: int, payload: DoctorUpdate, db: Session = Depends(get_db)) -> Doctor:
    doctor = get_doctor_or_404(db, doctor_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(doctor, field, value)
    _commit_or_conflict(db)
    db.refresh(doctor)
    return doctor


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)) -> Response:
    doctor = get_doctor_or_404(db, doctor_id)
    if db.scalar(select(exists().where(Appointment.doctor_id == doctor_id))):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{doctor.full_name} still has appointments; cancel or reassign them first",
        )
    db.delete(doctor)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
