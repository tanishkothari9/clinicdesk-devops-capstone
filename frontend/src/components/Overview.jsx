import { useMemo } from 'react';
import {
  STATUSES,
  dateKeyOf,
  formatDuration,
  formatLongDate,
  formatPercent,
  formatTime,
  greeting,
  plural,
  statusLabel,
  toDateKey,
} from '../format.js';
import { IconCalendar, IconCircleX, IconClock, IconPlus, IconTrend, IconUsers } from './Icons.jsx';
import { StatusActions } from './StatusActions.jsx';
import { EmptyState, LoadingRegion, PageHeader, RefreshButton, StatusBadge, VisitBadge } from './ui.jsx';

const KpiCard = ({ label, value, hint, Icon, tone = 'teal', loading, children }) => (
  <article className={`card kpi kpi-${tone}`}>
    <div className="kpi-top">
      <span>{label}</span>
      <span className="kpi-icon">
        <Icon />
      </span>
    </div>
    {loading ? <span className="sk sk-value" aria-hidden="true" /> : <strong className="kpi-value">{value}</strong>}
    {children}
    <span className="kpi-hint">{loading ? ' ' : hint}</span>
  </article>
);

const ScheduleItem = ({ appointment, onStatusChange, busy }) => {
  const closed = ['completed', 'cancelled', 'no_show'].includes(appointment.status);
  const doctor = appointment.doctor;
  return (
    <li className={`slot ${closed ? 'is-closed' : ''}`}>
      <div className="slot-time">
        <strong>{formatTime(appointment.scheduled_at)}</strong>
        <span>{formatDuration(appointment.duration_minutes)}</span>
      </div>
      <span className={`slot-dot status-${appointment.status}`} aria-hidden="true" />
      <div className="slot-body">
        <div className="slot-title">
          <strong>{appointment.patient_name}</strong>
          <VisitBadge type={appointment.visit_type} />
        </div>
        <p className="slot-meta">
          {doctor ? `${doctor.full_name} · Room ${doctor.room}` : 'Unassigned'}
          {appointment.reason && <span className="slot-reason"> · {appointment.reason}</span>}
        </p>
      </div>
      <div className="slot-side">
        <StatusBadge status={appointment.status} />
        <StatusActions appointment={appointment} onChange={onStatusChange} busy={busy} />
      </div>
    </li>
  );
};

export const Overview = ({ stats, appointments, loaded, loading, onNew, onRefresh, onStatusChange, busyId }) => {
  const now = new Date();
  const todayKey = toDateKey(now);

  const todays = useMemo(
    () =>
      appointments
        .filter((appointment) => dateKeyOf(appointment.scheduled_at) === todayKey)
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [appointments, todayKey],
  );

  const byStatus = stats?.by_status ?? {};
  const total = stats?.total ?? 0;
  const stillToSee = todays.filter((a) => a.status === 'scheduled' || a.status === 'checked_in').length;
  const missed = (byStatus.cancelled ?? 0) + (byStatus.no_show ?? 0);
  const doctorLoad = [...(stats?.by_doctor ?? [])].sort((a, b) => b.count - a.count);
  const maxLoad = Math.max(1, ...doctorLoad.map((row) => row.count));
  const statsLoading = !stats && !loaded;

  return (
    <>
      <PageHeader
        eyebrow={greeting(now)}
        title={formatLongDate(now)}
        subtitle={
          stillToSee > 0
            ? `${stillToSee} ${stillToSee === 1 ? 'patient' : 'patients'} still to be seen today.`
            : 'Everyone booked for today has been seen.'
        }
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

      <section className="kpis" aria-label="Key metrics">
        <KpiCard
          label="Today"
          value={stats?.today ?? 0}
          hint={`${stillToSee} still to be seen`}
          Icon={IconCalendar}
          loading={statsLoading}
        />
        <KpiCard
          label="Upcoming"
          value={stats?.upcoming ?? 0}
          hint="Booked from now on"
          Icon={IconClock}
          tone="blue"
          loading={statsLoading}
        />
        <KpiCard
          label="Completion rate"
          value={formatPercent(stats?.completion_rate)}
          hint={`${byStatus.completed ?? 0} of ${plural(total, 'visit')} completed`}
          Icon={IconTrend}
          tone="green"
          loading={statsLoading}
        >
          <span className="kpi-meter" aria-hidden="true">
            <span style={{ width: formatPercent(stats?.completion_rate) }} />
          </span>
        </KpiCard>
        <KpiCard
          label="Cancelled / No-show"
          value={missed}
          hint={`${byStatus.cancelled ?? 0} cancelled · ${byStatus.no_show ?? 0} no-show`}
          Icon={IconCircleX}
          tone="rose"
          loading={statsLoading}
        />
      </section>

      <div className="overview-grid">
        <section className="card" aria-labelledby="schedule-title">
          <header className="card-header">
            <div>
              <h2 id="schedule-title">Today’s schedule</h2>
              <p>{loaded ? `${plural(todays.length, 'appointment')} · ${stillToSee} remaining` : 'Loading…'}</p>
            </div>
          </header>
          {!loaded ? (
            <LoadingRegion label="Loading today’s schedule" rows={4} />
          ) : todays.length === 0 ? (
            <EmptyState
              icon={<IconCalendar width={24} height={24} />}
              title="No appointments today"
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={onNew}>
                  <IconPlus width={16} height={16} />
                  Book an appointment
                </button>
              }
            >
              The day is clear. Book a walk-in or schedule a follow-up to fill the calendar.
            </EmptyState>
          ) : (
            <ol className="timeline">
              {todays.map((appointment) => (
                <ScheduleItem
                  key={appointment.id}
                  appointment={appointment}
                  onStatusChange={onStatusChange}
                  busy={busyId === appointment.id}
                />
              ))}
            </ol>
          )}
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="load-title">
            <header className="card-header">
              <div>
                <h2 id="load-title">Load by doctor</h2>
                <p>All appointments per doctor</p>
              </div>
            </header>
            {!loaded ? (
              <LoadingRegion label="Loading doctor load" rows={3} />
            ) : doctorLoad.length === 0 ? (
              <EmptyState icon={<IconUsers width={24} height={24} />} title="No doctors yet">
                Add doctors to see how bookings are spread across the team.
              </EmptyState>
            ) : (
              <ul className="bars">
                {doctorLoad.map((row) => (
                  <li key={row.doctor_id}>
                    <div className="bar-head">
                      <span className="bar-name">
                        {row.doctor_name}
                        <span className="bar-spec"> · {row.specialty}</span>
                      </span>
                      <span className="bar-value">{row.count}</span>
                    </div>
                    <div className="bar-track" aria-hidden="true">
                      <span className="bar-fill" style={{ width: `${(row.count / maxLoad) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="status-title">
            <header className="card-header">
              <div>
                <h2 id="status-title">Status breakdown</h2>
                <p>{plural(total, 'appointment')} in total</p>
              </div>
            </header>
            {!loaded ? (
              <LoadingRegion label="Loading status breakdown" rows={2} />
            ) : (
              <>
                <div className="stacked" aria-hidden="true">
                  {STATUSES.filter((status) => byStatus[status]).map((status) => (
                    <span
                      key={status}
                      className={`status-${status}`}
                      style={{ flexGrow: byStatus[status] }}
                      title={`${statusLabel(status)}: ${byStatus[status]}`}
                    />
                  ))}
                </div>
                <ul className="legend">
                  {STATUSES.map((status) => (
                    <li key={status}>
                      <span className={`legend-dot status-${status}`} aria-hidden="true" />
                      <span className="legend-label">{statusLabel(status)}</span>
                      <span className="legend-count">{byStatus[status] ?? 0}</span>
                      <span className="legend-pct">
                        {total ? formatPercent((byStatus[status] ?? 0) / total) : '0%'}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
};
