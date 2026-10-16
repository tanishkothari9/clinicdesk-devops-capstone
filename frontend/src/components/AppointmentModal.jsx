import { useState } from 'react';
import { VISIT_TYPES, nextSlot, toDateKey, toTimeValue } from '../format.js';
import { IconPlus, IconStethoscope } from './Icons.jsx';
import { Modal } from './Modal.jsx';
import { EmptyState, Field, FormAlert, Spinner } from './ui.jsx';

const DURATIONS = [10, 15, 20, 30, 45, 60, 90, 120];

const alertTitle = (error) => {
  if (error.status === 409) return 'Scheduling conflict';
  if (error.status === 404) return 'Doctor not found';
  if (error.status === 422) return 'Please check the highlighted fields';
  return 'Could not book the appointment';
};

const alertHint = (error) => {
  if (error.status === 409) return 'Pick another time or a different doctor.';
  if (error.status === 404) return 'The doctor may have been removed. Refresh and choose another doctor.';
  return undefined;
};

const initialForm = (doctors, defaultDoctorId) => {
  const slot = nextSlot();
  const fallback = doctors.find((doctor) => doctor.is_active !== false) ?? doctors[0];
  return {
    patient_name: '',
    patient_phone: '',
    doctor_id: String(defaultDoctorId ?? fallback?.id ?? ''),
    date: toDateKey(slot),
    time: toTimeValue(slot),
    duration_minutes: '30',
    visit_type: 'consultation',
    reason: '',
  };
};

export const AppointmentModal = ({ doctors, defaultDoctorId, onSubmit, onClose, onAddDoctor }) => {
  const [form, setForm] = useState(() => initialForm(doctors, defaultDoctorId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fieldErrors = error?.fieldErrors ?? {};

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const doctor = doctors.find((item) => String(item.id) === form.doctor_id);
    if (!doctor) {
      setError(Object.assign(new Error('Choose a doctor for this appointment.'), { status: 422, fieldErrors: {} }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        patient_name: form.patient_name.trim(),
        patient_phone: form.patient_phone.trim(),
        doctor_id: doctor.id,
        scheduled_at: `${form.date}T${form.time.slice(0, 5)}:00`,
        duration_minutes: Number(form.duration_minutes),
        visit_type: form.visit_type,
        ...(form.reason.trim() && { reason: form.reason.trim() }),
      });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  const fieldProps = (name) => ({
    id: `appt-${name}`,
    'aria-invalid': fieldErrors[name] ? true : undefined,
    'aria-describedby': fieldErrors[name] ? `appt-${name}-error` : undefined,
  });

  if (!doctors.length) {
    return (
      <Modal title="New appointment" onClose={onClose}>
        <div className="modal-body">
          <EmptyState
            icon={<IconStethoscope width={24} height={24} />}
            title="Add a doctor first"
            action={
              <button type="button" className="btn btn-primary btn-sm" onClick={onAddDoctor}>
                <IconPlus width={16} height={16} />
                Add doctor
              </button>
            }
          >
            Appointments are booked against a doctor. Add at least one doctor to start scheduling.
          </EmptyState>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="New appointment" description="Book a patient visit with a doctor." onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <FormAlert title={alertTitle(error)} error={error} hint={alertHint(error)} />}

          <div className="form-grid">
            <Field id="appt-patient_name" label="Patient name" error={fieldErrors.patient_name}>
              <input
                {...fieldProps('patient_name')}
                className="input"
                value={form.patient_name}
                onChange={update('patient_name')}
                autoComplete="off"
                maxLength={120}
                required
              />
            </Field>
            <Field id="appt-patient_phone" label="Phone" error={fieldErrors.patient_phone}>
              <input
                {...fieldProps('patient_phone')}
                className="input"
                type="tel"
                inputMode="tel"
                value={form.patient_phone}
                onChange={update('patient_phone')}
                placeholder="+91 98765 43210"
                autoComplete="off"
                maxLength={32}
                required
              />
            </Field>
            <Field id="appt-doctor_id" label="Doctor" error={fieldErrors.doctor_id} className="span-2">
              <select
                {...fieldProps('doctor_id')}
                className="select"
                value={form.doctor_id}
                onChange={update('doctor_id')}
                required
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={String(doctor.id)} disabled={doctor.is_active === false}>
                    {doctor.full_name} · {doctor.specialty} · Room {doctor.room}
                    {doctor.is_active === false ? ' (inactive)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="appt-date" label="Date" error={fieldErrors.scheduled_at} className="half">
              <input
                id="appt-date"
                className="input"
                type="date"
                value={form.date}
                onChange={update('date')}
                aria-invalid={fieldErrors.scheduled_at ? true : undefined}
                required
              />
            </Field>
            <Field id="appt-time" label="Time" className="half">
              <input
                id="appt-time"
                className="input"
                type="time"
                step={300}
                value={form.time}
                onChange={update('time')}
                aria-invalid={fieldErrors.scheduled_at ? true : undefined}
                required
              />
            </Field>
            <Field id="appt-duration_minutes" label="Duration" error={fieldErrors.duration_minutes} className="half">
              <select
                {...fieldProps('duration_minutes')}
                className="select"
                value={form.duration_minutes}
                onChange={update('duration_minutes')}
              >
                {DURATIONS.map((minutes) => (
                  <option key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </Field>
            <Field id="appt-visit_type" label="Visit type" error={fieldErrors.visit_type} className="half">
              <select
                {...fieldProps('visit_type')}
                className="select"
                value={form.visit_type}
                onChange={update('visit_type')}
              >
                {Object.entries(VISIT_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="appt-reason"
              label="Reason for visit (optional)"
              error={fieldErrors.reason}
              className="span-2"
            >
              <textarea
                {...fieldProps('reason')}
                className="textarea"
                rows={3}
                value={form.reason}
                onChange={update('reason')}
                placeholder="e.g. Persistent cough for two weeks"
                maxLength={500}
              />
            </Field>
          </div>
        </div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <Spinner />}
            Book appointment
          </button>
        </footer>
      </form>
    </Modal>
  );
};
