import { useRef, useState } from 'react';
import { shopApi } from '../../api/endpoints';
import { describeError, fieldErrorMap } from '../../lib/errors';
import { initialOf } from '../../lib/format';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';

/**
 * The shop logo: preview, Upload or Change, and Remove. The logo is saved at once; it does not wait for the
 * form's Save button. A refused file shows the backend's message under the box. `onChanged` runs after an
 * upload or a removal so the page can reload the profile (hasLogo).
 */
export default function LogoUploader({ hasLogo, shopName, onChanged }) {
  const toast = useToast();
  const fileInput = useRef(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await shopApi.uploadLogo(file);
      setVersion((v) => v + 1);
      toast.success('Logo saved.');
      onChanged?.();
    } catch (e) {
      setError(fieldErrorMap(e).file ?? describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await shopApi.removeLogo();
    setConfirmingRemove(false);
    toast.success('Logo removed.');
    onChanged?.();
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div
        style={{
          width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)', overflow: 'hidden',
        }}
      >
        {hasLogo ? (
          <img src={shopApi.logoUrl(version)} alt="Shop logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 56, fontWeight: 700, color: 'var(--primary)' }}>{initialOf(shopName)}</span>
        )}
      </div>

      <div className="row">
        <input
          ref={fileInput}
          type="file"
          hidden
          aria-label="Logo file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          onChange={upload}
        />
        <Button icon="plus" busy={busy} onClick={() => fileInput.current.click()}>{hasLogo ? 'Change' : 'Upload'}</Button>
        {hasLogo && <Button icon="delete" disabled={busy} onClick={() => setConfirmingRemove(true)}>Remove</Button>}
      </div>

      {error && <div className="field-error" role="alert">{error}</div>}
      <div className="field-hint">PNG or JPEG, up to 2 MB. It is printed on bills when Show logo is on.</div>

      {confirmingRemove && (
        <ConfirmDialog
          open
          tone="danger"
          title="Remove the shop logo?"
          confirmLabel="Remove logo"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={remove}
        >
          <p>The logo file is deleted from this PC and bills print without it. You can upload a logo again at any time.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}