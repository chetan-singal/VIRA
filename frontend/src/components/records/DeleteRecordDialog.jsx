import ConfirmDialog from '../ui/ConfirmDialog';
import { RECORD_TYPES } from './recordTypes';

/** The Delete confirmation for every record type; the wording comes from the registry (SRS §20.6). */
export default function DeleteRecordDialog({ type, record, open, onCancel, onConfirm }) {
  const wording = RECORD_TYPES[type].deleteWording(record);
  return (
    <ConfirmDialog open={open} tone="danger" title={wording.title} confirmLabel={wording.confirmLabel} onCancel={onCancel} onConfirm={onConfirm}>
      <p>{wording.intro}</p>
      <ul className="effect-list">
        {wording.effects.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </ConfirmDialog>
  );
}
