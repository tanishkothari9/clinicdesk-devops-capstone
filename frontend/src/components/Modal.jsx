import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './Icons.jsx';
import { FormAlert, Spinner } from './ui.jsx';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = ({ title, description, onClose, size = 'md', children }) => {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    const initial =
      panel.querySelector('[data-autofocus]') ?? panel.querySelector('input, select, textarea') ?? panel.querySelector(FOCUSABLE);
    initial?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('has-modal');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('has-modal');
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button type="button" className="icon-btn icon-btn-quiet" onClick={onClose} aria-label="Close dialog">
            <IconClose />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
};

export const ConfirmDialog = ({ title, message, confirmLabel, conflictTitle, conflictHint, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  const isConflict = error?.status === 409;

  return (
    <Modal title={title} onClose={busy ? () => {} : onClose} size="sm">
      <div className="modal-body">
        <p className="confirm-message">{message}</p>
        {error && (
          <FormAlert
            title={isConflict ? conflictTitle ?? 'Conflict' : 'That didn’t work'}
            error={error}
            hint={isConflict ? conflictHint : undefined}
          />
        )}
      </div>
      <footer className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy} data-autofocus>
          {isConflict ? 'Close' : 'Cancel'}
        </button>
        {!isConflict && (
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={busy}>
            {busy && <Spinner />}
            {confirmLabel}
          </button>
        )}
      </footer>
    </Modal>
  );
};
