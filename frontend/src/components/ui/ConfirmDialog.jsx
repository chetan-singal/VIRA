import { useEffect, useState } from 'react';
import { describeError } from '../../lib/errors';
import Button from './Button';
import { InlineAlert } from './Feedback';
import Icon from './Icon';
import Modal from './Modal';

/**
 * Confirmation dialog. onConfirm may be async: while it runs the buttons are locked, and if it throws
 * the error is shown inside the dialog and the dialog stays open. The parent closes it on success.
 * The safe button (Cancel) takes the initial focus. tone: primary | danger.
 */
export default function ConfirmDialog({
  open, title, tone = 'primary', icon, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, children,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setBusy(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setBusy(false);
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      dismissible={!busy}
      onClose={onCancel}
      footer={
        <>
          <Button data-autofocus onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} busy={busy} onClick={handleConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="confirm-row">
        <div className={tone === 'danger' ? 'confirm-icon' : 'confirm-icon primary'}>
          <Icon name={icon ?? (tone === 'danger' ? 'delete' : 'info')} size={18} />
        </div>
        <div className="confirm-body">{children}</div>
      </div>
      {error && <InlineAlert tone="error" className="form-error">{describeError(error)}</InlineAlert>}
    </Modal>
  );
}
