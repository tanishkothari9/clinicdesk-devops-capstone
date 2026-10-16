import { useMemo, useState } from 'react';
import { avatarTone, dateKeyOf, initials, plural, toDateKey } from '../format.js';
import { IconDoor, IconMail, IconPlus, IconStethoscope, IconTrash } from './Icons.jsx';
import { ConfirmDialog } from './Modal.jsx';
import { EmptyState, LoadingRegion, PageHeader } from './ui.jsx';

export const Doctors = ({ doctors, stats, appointments, loaded, onAdd, onBook, onDelete }) => {
  const [pendingDelete, setPendingDelete] = useState(null);

  const totals = useMemo(
    () => new Map((stats?.by_doctor ?? []).map((row) => [String(row.doctor_id), row.count])),
    [stats],
  );

  const todayKey = toDateKey(new Date());
  const todayCounts = useMemo(
    () =>
      appointments.reduce((map, a) => {
        if (dateKeyOf(a.scheduled_at) !== todayKey || a.status === 'cancelled') return map;
        const key = String(a.doctor_id);
        return map.set(key, (map.get(key) ?? 0) + 1);
      }, new Map()),
    [appointments, todayKey],
  );

  return (
    <>
      <PageHeader
        eyebrow="Care team"
        title="Doctors"
        subtitle={loaded ? `${plural(doctors.length, 'doctor')} on the roster` : 'Loading doctors…'}
        actions={
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <IconPlus />
            Add doctor
          </button>
        }
      />

      {!loaded ? (
        <section className="card">
          <LoadingRegion label="Loading doctors" rows={3} />
        </section>
      ) : doctors.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={<IconStethoscope width={24} height={24} />}
            title="No doctors yet"
            action={
              <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
                <IconPlus width={16} height={16} />
                Add the first doctor
              </button>
            }
          >
            Add your care team so the front desk can start booking appointments.
          </EmptyState>
        </section>
      ) : (
        <div className="doctor-grid">
          {doctors.map((doctor) => {
            const key = String(doctor.id);
            return (
              <article key={doctor.id} className="card doctor-card">
                <div className="doctor-head">
                  <span className={`avatar tone-${avatarTone(doctor.full_name)}`} aria-hidden="true">
                    {initials(doctor.full_name)}
                  </span>
                  <div className="doctor-id">
                    <h2>{doctor.full_name}</h2>
                    <p className="specialty">{doctor.specialty}</p>
                  </div>
                  {doctor.is_active === false && <span className="tag">Inactive</span>}
                </div>

                <dl className="doctor-meta">
                  <div>
                    <dt>
                      <IconDoor width={16} height={16} />
                      <span className="sr-only">Room</span>
                    </dt>
                    <dd>Room {doctor.room}</dd>
                  </div>
                  <div>
                    <dt>
                      <IconMail width={16} height={16} />
                      <span className="sr-only">Email</span>
                    </dt>
                    <dd>
                      {doctor.email ? (
                        <a className="link-quiet" href={`mailto:${doctor.email}`}>
                          {doctor.email}
                        </a>
                      ) : (
                        <span className="muted">No email on file</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="doctor-stats">
                  <div className="stat-box">
                    <strong>{totals.get(key) ?? 0}</strong>
                    <span>appointments</span>
                  </div>
                  <div className="stat-box">
                    <strong>{todayCounts.get(key) ?? 0}</strong>
                    <span>booked today</span>
                  </div>
                </div>

                <footer className="doctor-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onBook(doctor)}>
                    <IconPlus width={16} height={16} />
                    Book appointment
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => setPendingDelete(doctor)}
                    aria-label={`Remove ${doctor.full_name}`}
                    title="Remove doctor"
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Remove doctor?"
          message={`Remove ${pendingDelete.full_name} (${pendingDelete.specialty}) from ClinicDesk? This can’t be undone.`}
          confirmLabel="Remove doctor"
          conflictTitle={`${pendingDelete.full_name} still has appointments`}
          conflictHint="Delete or move their appointments first, then try again."
          onConfirm={() => onDelete(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </>
  );
};
