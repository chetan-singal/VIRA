import { useCallback, useState } from 'react';
import { emptyToNull, moneyOrNull } from '../../../lib/forms';
import { todayIso } from '../../../lib/format';
import { ChoiceGroup, DateInput, Field, MoneyInput, TextArea, TextInput } from '../../form/inputs';
import SearchSelect from '../../form/SearchSelect';
import { useForm } from '../../form/useForm';
import { FormActions, FormError } from './formParts';

const MODES = [{ value: 'CASH', label: 'Cash' }, { value: 'ONLINE', label: 'Online' }];

function initial(record) {
  return {
    party: record ? { id: record.partyId, label: record.partyName } : null,
    paymentDate: record?.paymentDate ?? todayIso(),
    amount: record ? String(record.amount) : '',
    paymentMode: record?.paymentMode ?? 'CASH',
    referenceNo: record?.referenceNo ?? '',
    remarks: record?.remarks ?? '',
  };
}

/** Party Payment Voucher: used to create (with Save & New) and, inside the Edit modal, to edit. */
export default function VoucherForm({ record, ops, onSaved, onCancel, allowSaveAndNew = false }) {
  const { values, errors, set, setErrors, applyApiError, reset } = useForm(initial(record));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const searchParties = useCallback((q) => ops.lookupParties(q), [ops]);

  async function submit(another) {
    const missing = {};
    if (!values.party) missing.partyId = 'Choose a party.';
    if (!values.paymentDate) missing.paymentDate = 'Enter the date.';
    if (!(moneyOrNull(values.amount) > 0)) missing.amount = 'Enter an amount above ₹0.';
    if (Object.keys(missing).length) {
      setErrors(missing);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const saved = await ops.save(record ?? null, {
        partyId: values.party.id,
        paymentDate: values.paymentDate,
        amount: moneyOrNull(values.amount),
        paymentMode: values.paymentMode,
        referenceNo: emptyToNull(values.referenceNo),
        remarks: emptyToNull(values.remarks),
      });
      if (another) reset(initial(null));
      onSaved?.(saved, { another });
    } catch (error) {
      if (!applyApiError(error)) setFormError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); submit(false); }}>
      <FormError error={formError} />
      <div className="form-grid">
        <Field label="Voucher No."><TextInput value={record?.voucherNo ?? ''} placeholder="Assigned when saved" readOnly disabled /></Field>
        <Field label="Date" required error={errors.paymentDate}>
          {(p) => <DateInput {...p} value={values.paymentDate} onChange={(e) => set('paymentDate', e.target.value)} />}
        </Field>
        <Field label="Party" required error={errors.partyId} className="span-2">
          {(p) => <SearchSelect id={p.id} invalid={Boolean(errors.partyId)} value={values.party} search={searchParties} placeholder="Search a party by name" onChange={(party) => set('party', party)} />}
        </Field>
        <Field label="Amount" required error={errors.amount}>
          {(p) => <MoneyInput {...p} value={values.amount} onChange={(v) => set('amount', v)} placeholder="0.00" />}
        </Field>
        <Field label="Payment Mode" hint="Both modes add to the same Cash in Hand.">
          <ChoiceGroup name="voucher-mode" label="Payment mode" value={values.paymentMode} options={MODES} onChange={(v) => set('paymentMode', v)} />
        </Field>
        <Field label="Reference No." error={errors.referenceNo} className="span-2">
          {(p) => <TextInput {...p} maxLength={50} value={values.referenceNo} onChange={(e) => set('referenceNo', e.target.value)} placeholder="Optional, for example a UTR number" />}
        </Field>
        <Field label="Remarks" error={errors.remarks} className="span-2">
          {(p) => <TextArea {...p} maxLength={500} value={values.remarks} onChange={(e) => set('remarks', e.target.value)} />}
        </Field>
      </div>
      <FormActions saving={saving} onCancel={onCancel} submitLabel={record ? 'Save changes' : 'Save'} onSaveAndNew={!record && allowSaveAndNew ? () => submit(true) : undefined} />
    </form>
  );
}
