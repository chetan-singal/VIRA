import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { describeError } from '../../lib/errors';
import IconButton from '../ui/IconButton';
import { useToast } from '../ui/Toast';
import DeleteRecordDialog from './DeleteRecordDialog';
import EditRecordModal from './EditRecordModal';
import { getRowState, RECORD_TYPES } from './recordTypes';

/**
 * THE row-action control (SRS §20, roadmap Phase 7). Used on every screen that shows a Bill, Payment
 * Voucher, Supplier Payment, Party or Supplier:
 *   active record   -> Edit + Delete
 *   deleted record  -> Restore (the "Deleted" badge is StatusBadges, shown beside it)
 *   locked record   -> the same icons, disabled, with the server's reason as the tooltip
 * `children` render before the icons (View / Print). `ops` overrides the API calls (component gallery, tests).
 * onChanged({ action: 'updated' | 'deleted' | 'restored', record }) tells the screen to reload.
 */
export default function RowActions({ type, record, onChanged, ops, children }) {
  const def = RECORD_TYPES[type];
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const calls = ops ? { ...def.ops, ...ops } : def.ops;
  const state = getRowState(type, record);
  const number = def.numberOf(record);

  function edit() {
    if (def.editMode === 'route') navigate(def.editPath(record));
    else setEditing(true);
  }

  async function restore() {
    setRestoring(true);
    try {
      const result = await calls.restore(record);
      toast.success(`${def.label} ${number} restored`);
      onChanged?.({ action: 'restored', record: result ?? record });
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setRestoring(false);
    }
  }

  async function confirmDelete() {
    await calls.remove(record); // a failure stays inside the dialog
    setDeleting(false);
    toast.success(`${def.label} ${number} deleted`);
    onChanged?.({ action: 'deleted', record });
  }

  function saved(result) {
    setEditing(false);
    toast.success(`${def.label} ${number} updated`);
    onChanged?.({ action: 'updated', record: result ?? record });
  }

  return (
    <span className="row-actions" onClick={(event) => event.stopPropagation()}>
      {children}
      {state.deleted ? (
        <IconButton icon="restore" tone="restore" label={`Restore ${def.label} ${number}`} disabled={!state.canRestore} reason={state.restoreReason} busy={restoring} onClick={restore} />
      ) : (
        <>
          <IconButton icon="edit" tone="edit" label={`Edit ${def.label} ${number}`} disabled={!state.canEdit} reason={state.editReason} onClick={edit} />
          <IconButton icon="delete" tone="delete" label={`Delete ${def.label} ${number}`} disabled={!state.canDelete} reason={state.deleteReason} onClick={() => setDeleting(true)} />
        </>
      )}
      {def.Form && editing && <EditRecordModal type={type} record={record} open ops={calls} onClose={() => setEditing(false)} onSaved={saved} />}
      {deleting && <DeleteRecordDialog type={type} record={record} open onCancel={() => setDeleting(false)} onConfirm={confirmDelete} />}
    </span>
  );
}
