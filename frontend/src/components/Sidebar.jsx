import { useState } from 'react';
import { formatVersion } from '../format.js';
import { IconCalendar, IconClose, IconMenu, IconOverview, IconStethoscope, Logo } from './Icons.jsx';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
const APP_ENV = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', Icon: IconOverview },
  { id: 'appointments', label: 'Appointments', Icon: IconCalendar },
  { id: 'doctors', label: 'Doctors', Icon: IconStethoscope },
];

const PILL_TEXT = {
  online: 'API online',
  offline: 'API offline',
  degraded: 'API degraded',
  checking: 'Checking API…',
};

const ApiPill = ({ health, className = '' }) => (
  <span
    className={`pill pill-${health.state} ${className}`}
    title={health.version ? `Backend ${formatVersion(health.version)}` : undefined}
  >
    <span className="pill-dot" aria-hidden="true" />
    {PILL_TEXT[health.state]}
  </span>
);

export const Sidebar = ({ view, health, counts }) => {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-top">
        <a className="brand" href="#/overview" onClick={() => setOpen(false)}>
          <Logo />
          <span>
            ClinicDesk
            <small>Appointment desk</small>
          </span>
        </a>
        <ApiPill health={health} className="pill-compact" />
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="sidebar-panel"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      <div className="sidebar-panel" id="sidebar-panel">
        <nav className="nav" aria-label="Primary">
          <p className="nav-label">Workspace</p>
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <a
              key={id}
              href={`#/${id}`}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon />
              <span>{label}</span>
              {counts[id] !== undefined && <span className="nav-count">{counts[id]}</span>}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status" role="status" aria-live="polite">
            <ApiPill health={health} />
          </div>
          <dl className="build-meta">
            <div>
              <dt>Environment</dt>
              <dd>
                <span className="env-badge">{APP_ENV}</span>
              </dd>
            </div>
            <div>
              <dt>Frontend</dt>
              <dd>
                <code>{formatVersion(APP_VERSION)}</code>
              </dd>
            </div>
            <div>
              <dt>Backend</dt>
              <dd>
                <code>{health.version ? formatVersion(health.version) : '—'}</code>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </aside>
  );
};
