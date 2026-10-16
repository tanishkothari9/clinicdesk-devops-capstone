import { useMemo, useState } from 'react';
import { STATUSES, dateKeyOf, dayLabel, formatDuration, formatTime, plural, statusLabel } from '../format.js';
import { IconCalendar, IconPlus, IconSearch, IconTrash } from './Icons.jsx';
import { ConfirmDialog } from './Modal.jsx';
import { StatusActions } from './StatusActions.jsx';
import { EmptyState, LoadingRegion, PageHeader, RefreshButton, StatusBadge, VisitBadge } from './ui.jsx';

export const Appointments = ({
  appointments,
  doctors,
  loaded,
  loading,
  onNew,
  onRefresh,
  onStatusChange,
  onDelete,
  busyId,
}) => {
  const [status, setStatus] = useState('all');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const scoped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return appointments.filter(
      (a) =>
        (!doctorId || String(a.doctor_id) === doctorId) &&
        (!date || dateKeyOf(a.scheduled_at) === date) &&
        (!needle ||
          a.patient_name.toLowerCase().includes(needle) ||
          (a.patient_phone ?? '').toLowerCase().includes(needle)),
    );
  }, [appointments, doctorId, date, query]);

  const counts = useMemo(
    () => scoped.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }), {}),
    [scoped],
  );
  const rows = status === 'all' ? scoped : scoped.filter((a) => a.status === status);
  const hasFilters = status !== 'all' || doctorId || date || query;

  const clearFilters = () => {
    setStatus('all');
    setDoctorId('');
    setDate('');
    setQuery('');
  };

  return (
    <>
      <PageHeader
        eyebrow="Front desk"
        title="Appointments"
        subtitle={loaded ? `${plural(appointments.length, 'appointment')} on the books` : 'Loading appointments…'}
        actions={
          <>
            <RefreshButton onClick={onRefresh} busy={loading} />
            <button type="button" className="btn btn-primary" onClick={onNew}>
              <IconPlus />
              New appointment
            </button>
          </>
        }
      />

      <section className="card" aria-label="Appointment list">
        <div className="toolbar">
          <div className="chips" role="group" aria-label="Filter by status">
            <button type="button" className="chip" aria-pressed={status === 'all'} onClick={() => setStatus('all')}>
              All <span className="chip-count">{scoped.length}</span>
            </button>
            {STATUSES.map((value) => (
              <button
                key={value}
                type="button"
                className={`chip status-${value}`}
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                <span className="badge-dot" aria-hidden="true" />
                {statusLabel(value)} <span className="chip-count">{counts[value] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="filters">
            <div className="field field-search">
              <label htmlFor="filter-query">Search</label>
              <div className="input-icon">
                <IconSearch width={16} height={16} />
                <input
                  id="filter-query"
                  className="input"
                  type="search"
                  placeholder="Patient name or phone"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="filter-doctor">Doctor</label>
              <select
                id="filter-doctor"
                className="select"
                value={doctorId}
                onChange={(event) => setDoctorId(event.target.value)}
              >
                <option value="">All doctors</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={String(doctor.id)}>
                    {doctor.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="filter-date">Date</label>
              <input
                id="filter-date"
                className="input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <button type="button" className="btn btn-ghost filters-clear" onClick={clearFilters} disabled={!hasFilters}>
              Clear filters
            </button>
          </div>
        </div>

        {!loaded ? (
          <LoadingRegion label="Loading appointments" rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconCalendar width={24} height={24} />}
            title={appointments.length ? 'No appointments match these filters' : 'No appointments yet'}
            action={
              appointments.length ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={onNew}>
                  <IconPlus width={16} height={16} />
                  Book the first appointment
                </button>
              )
            }
          >
            {appointments.length
              ? 'Try another status, doctor or date, or clear the filters to see everything.'
              : 'Bookings you create will show up here with their status and quick actions.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Doctor</th>
                  <th scope="col">Date &amp; time</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="cell-lead">
                      <div className="cell-primary">{a.patient_name}</div>
                      {a.reason && <div className="cell-secondary">{a.reason}</div>}
                    </td>
                    <td data-label="Phone">
                      <a className="link-quiet" href={`tel:${a.patient_phone}`}>
                        {a.patient_phone}
                      </a>
                    </td>
                    <td data-label="Doctor">
                      <div className="cell-primary">{a.doctor?.full_name ?? `Doctor #${a.doctor_id}`}</div>
                      {a.doctor && (
                        <div className="cell-secondary">
                          {a.doctor.specialty} · Room {a.doctor.room}
                        </div>
                      )}
                    </td>
                    <td data-label="When">
                      <div className="cell-primary">{dayLabel(a.scheduled_at)}</div>
                      <div className="cell-secondary">{formatTime(a.scheduled_at)}</div>
                    </td>
                    <td data-label="Duration">{formatDuration(a.duration_minutes)}</td>
                    <td data-label="Type">
                      <VisitBadge type={a.visit_type} />
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="cell-actions">
                      <div className="row-actions">
                        <StatusActions appointment={a} onChange={onStatusChange} busy={busyId === a.id} />
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => setPendingDelete(a)}
                          aria-label={`Delete appointment for ${a.patient_name}`}
                          title="Delete appointment"
                        >
                          <IconTrash width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete appointment?"
          message={`This permanently removes ${pendingDelete.patient_name}’s ${dayLabel(
            pendingDelete.scheduled_at,
          ).toLowerCase()} ${formatTime(pendingDelete.scheduled_at)} appointment. To keep a record, cancel it instead.`}
          confirmLabel="Delete appointment"
          onConfirm={() => onDelete(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </>
  );
};
