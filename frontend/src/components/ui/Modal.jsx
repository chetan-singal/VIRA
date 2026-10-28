import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';
import Icon from './Icon';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal: Esc closes, Tab stays inside, focus returns to the opener.
 * Initial focus: an element marked data-autofocus, else the first control in the body, else the dialog.
 * `dismissible={false}` blocks Esc while a save is running.
 */
export default function Modal({ open, title, subtitle, onClose, dismissible = true, size = 'md', footer, children }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const target =
      dialog?.querySelector('[data-autofocus]') ??
      dialog?.querySelector('.modal-body input:not([disabled]), .modal-body select:not([disabled]), .modal-body textarea:not([disabled])') ??
      dialog?.querySelector('.modal-body button:not([disabled])') ??
      dialog;
    target?.focus();
    return () => {
      if (previous?.isConnected) previous.focus?.();
    };
  }, [open]);

  if (!open) return null;

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (dismissible) onClose?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
    if (nodes.length === 0) {
      event.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="modal-backdrop" onKeyDown={onKeyDown}>
      <div ref={dialogRef} className={cx('modal', `modal-${size}`)} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="modal-head">
          <div>
            <h2 id={titleId} className="modal-title">{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => dismissible && onClose()} disabled={!dismissible}>
              <Icon name="close" size={16} />
            </button>
          )}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
