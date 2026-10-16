import { useEffect } from 'react';
import { STATUS_META, VISIT_TYPES } from '../format.js';
import { IconAlert, IconCheck, IconClose, IconRefresh } from './Icons.jsx';

export const PageHeader = ({ eyebrow, title, subtitle, actions }) => (
  <header className="page-header">
    <div className="page-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>
);

export const Spinner = () => <span className="spinner" aria-hidden="true" />;

export const RefreshButton = ({ onClick, busy }) => (
  <button type="button" className="btn btn-secondary" onClick={onClick} disabled={busy} aria-label="Refresh data">
    {busy ? <Spinner /> : <IconRefresh />}
    <span className="hide-sm">Refresh</span>
  </button>
);

export const StatusBadge = ({ status }) => (
  <span className={`badge status-${status}`}>
    <span className="badge-dot" aria-hidden="true" />
    {STATUS_META[status]?.label ?? status}
  </span>
);

export const VisitBadge = ({ type }) => <span className={`tag visit-${type}`}>{VISIT_TYPES[type] ?? type}</span>;

export const EmptyState = ({ icon, title, children, action }) => (
  <div className="empty">
    {icon && <div className="empty-icon">{icon}</div>}
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

export const SkeletonList = ({ rows = 4 }) => (
  <div className="skeleton-list" aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="skeleton-row">
        <span className="sk sk-avatar" />
        <span className="sk sk-line" />
        <span className="sk sk-line short" />
      </div>
    ))}
  </div>
);

export const LoadingRegion = ({ label, rows }) => (
  <div role="status" aria-live="polite">
    <span className="sr-only">{label}</span>
    <SkeletonList rows={rows} />
  </div>
);

export const ErrorBanner = ({ error, onRetry, retrying, stale }) => (
  <div className="banner" role="alert">
    <IconAlert width={20} height={20} />
    <div className="banner-body">
      <strong>{error.unreachable ? 'Can’t reach the ClinicDesk API' : 'Some clinic data failed to load'}</strong>
      <span>
        {error.message}
        {stale && ' Showing the last data we received.'}
      </span>
    </div>
    <button type="button" className="btn btn-sm btn-light" onClick={onRetry} disabled={retrying}>
      {retrying ? <Spinner /> : <IconRefresh width={16} height={16} />}
      Retry
    </button>
  </div>
);

export const FormAlert = ({ title, error, hint }) => (
  <div className="form-alert" role="alert">
    <IconAlert width={18} height={18} />
    <div>
      <strong>{title}</strong>
      <p>{error.message}</p>
      {hint && <p className="form-alert-hint">{hint}</p>}
    </div>
  </div>
);

export const Field = ({ id, label, error, hint, className = '', children }) => (
  <div className={`field ${error ? 'has-error' : ''} ${className}`}>
    <label htmlFor={id}>{label}</label>
    {children}
    {error ? (
      <span className="field-error" id={`${id}-error`}>
        {error}
      </span>
    ) : (
      hint && <span className="field-hint">{hint}</span>
    )}
  </div>
);

export const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, toast.tone === 'error' ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          {toast.tone === 'error' ? <IconAlert width={18} height={18} /> : <IconCheck width={18} height={18} />}
          <span>{toast.message}</span>
          <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss notification">
            <IconClose width={16} height={16} />
          </button>
        </div>
      )}
    </div>
  );
};
