const TRANSITIONS = {
  scheduled: [
    { to: 'checked_in', label: 'Check in', variant: 'primary' },
    { to: 'no_show', label: 'No-show', variant: 'secondary' },
    { to: 'cancelled', label: 'Cancel', variant: 'ghost-danger' },
  ],
  checked_in: [
    { to: 'completed', label: 'Complete', variant: 'primary' },
    { to: 'cancelled', label: 'Cancel', variant: 'ghost-danger' },
  ],
  cancelled: [{ to: 'scheduled', label: 'Reopen', variant: 'secondary' }],
  no_show: [{ to: 'scheduled', label: 'Reopen', variant: 'secondary' }],
  completed: [],
};

export const StatusActions = ({ appointment, onChange, busy }) => {
  const actions = TRANSITIONS[appointment.status] ?? [];
  if (!actions.length) return null;

  return (
    <div className="status-actions">
      {actions.map(({ to, label, variant }) => (
        <button
          key={to}
          type="button"
          className={`btn btn-sm btn-${variant}`}
          disabled={busy}
          onClick={() => onChange(appointment, to)}
          aria-label={`${label} ${appointment.patient_name}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
