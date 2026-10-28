import Button from '../../ui/Button';
import { InlineAlert } from '../../ui/Feedback';
import { describeError } from '../../../lib/errors';

/** The error banner and the button row every record form ends with. */
export function FormError({ error }) {
  return error ? <InlineAlert tone="error" className="form-error">{describeError(error)}</InlineAlert> : null;
}

export function FormActions({ saving, onCancel, submitLabel = 'Save', onSaveAndNew }) {
  return (
    <div className="form-actions">
      <Button onClick={onCancel} disabled={saving}>Cancel</Button>
      {onSaveAndNew && <Button onClick={onSaveAndNew} disabled={saving}>Save &amp; New</Button>}
      <Button type="submit" variant="primary" busy={saving}>{submitLabel}</Button>
    </div>
  );
}
