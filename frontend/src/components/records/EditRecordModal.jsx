import Modal from '../ui/Modal';
import { RECORD_TYPES } from './recordTypes';

/**
 * The Edit (or New) modal for Payment Voucher, Supplier Payment, Party and Supplier.
 * Title follows SRS §25.2: "Edit Payment Voucher — PV-0023". Bills edit on the New Bill screen instead.
 * `preset` fills (and locks) a field of a NEW record: { party: { id, label } } for a voucher,
 * { supplier: { id, label } } for a supplier payment.
 */
export default function EditRecordModal({ type, record, open, onClose, onSaved, ops, preset }) {
  const def = RECORD_TYPES[type];
  const Form = def.Form;
  if (!Form) return null;
  const title = record ? `Edit ${def.label} — ${def.numberOf(record)}` : `New ${def.label}`;
  return (
    <Modal open={open} title={title} onClose={onClose} size="md">
      <Form record={record} ops={ops ?? def.ops} preset={preset} onSaved={onSaved} onCancel={onClose} />
    </Modal>
  );
}