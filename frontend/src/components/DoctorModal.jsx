import { useState } from 'react';
import { Modal } from './Modal.jsx';
import { Field, FormAlert, Spinner } from './ui.jsx';

const SPECIALTIES = [
  'General Practice',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Gynecology',
  'ENT',
  'Neurology',
  'Ophthalmology',
  'Psychiatry',
  'Dentistry',
  'Physiotherapy',
];

const EMPTY_FORM = { full_name: '', specialty: '', room: '', email: '' };

export const DoctorModal = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fieldErrors = error?.fieldErrors ?? {};

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const email = form.email.trim();
    try {
      await onSubmit({
        full_name: form.full_name.trim(),
        specialty: form.specialty.trim(),
        room: form.room.trim(),
        ...(email && { email }),
      });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  const fieldProps = (name) => ({
    id: `doctor-${name}`,
    'aria-invalid': fieldErrors[name] ? true : undefined,
    'aria-describedby': fieldErrors[name] ? `doctor-${name}-error` : undefined,
  });

  return (
    <Modal title="Add doctor" description="Add a member of the care team so they can take bookings." onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && (
            <FormAlert
              title={error.status === 409 ? 'Doctor already exists' : 'Could not add the doctor'}
              error={error}
            />
          )}
          <div className="form-grid">
            <Field id="doctor-full_name" label="Full name" error={fieldErrors.full_name} className="span-2">
              <input
                {...fieldProps('full_name')}
                className="input"
                value={form.full_name}
                onChange={update('full_name')}
                placeholder="Dr. Asha Menon"
                autoComplete="off"
                maxLength={120}
                required
              />
            </Field>
            <Field id="doctor-specialty" label="Specialty" error={fieldErrors.specialty}>
              <input
                {...fieldProps('specialty')}
                className="input"
                list="specialty-options"
                value={form.specialty}
                onChange={update('specialty')}
                placeholder="Cardiology"
                maxLength={80}
                required
              />
              <datalist id="specialty-options">
                {SPECIALTIES.map((specialty) => (
                  <option key={specialty} value={specialty} />
                ))}
              </datalist>
            </Field>
            <Field id="doctor-room" label="Room" error={fieldErrors.room}>
              <input
                {...fieldProps('room')}
                className="input"
                value={form.room}
                onChange={update('room')}
                placeholder="A-102"
                maxLength={20}
                required
              />
            </Field>
            <Field
              id="doctor-email"
              label="Email (optional)"
              error={fieldErrors.email}
              hint="Used for schedule notifications."
              className="span-2"
            >
              <input
                {...fieldProps('email')}
                className="input"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="asha.menon@clinic.example"
                autoComplete="off"
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
            Add doctor
          </button>
        </footer>
      </form>
    </Modal>
  );
};
