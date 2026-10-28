import { useState } from 'react';
import { emptyToNull, moneyOrNull } from '../../../lib/forms';
import { Field, MoneyInput, TextArea, TextInput } from '../../form/inputs';
import { useForm } from '../../form/useForm';
import { FormActions, FormError } from './formParts';

function initial(record) {
  return {
    name: record?.name ?? '',
    phone: record?.phone ?? '',
    address: record?.address ?? '',
    city: record?.city ?? '',
    state: record?.state ?? '',
    remarks: record?.remarks ?? '',
    openingBalance: '',
  };
}

/**
 * New / Edit Party. Opening Balance exists only when creating: it is set once, and the backend's update
 * request does not even have the field (SRS §9.1). Current Balance is never editable.
 */
export default function PartyForm({ record, ops, onSaved, onCancel }) {
  const { values, errors, set, setErrors, applyApiError } = useForm(initial(record));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  async function submit() {
    if (!values.name.trim()) {
      setErrors({ name: 'Party name is required.' });
      return;
    }
    const payload = {
      name: values.name.trim(),
      phone: emptyToNull(values.phone),
      address: emptyToNull(values.address),
      city: emptyToNull(values.city),
      state: emptyToNull(values.state),
      remarks: emptyToNull(values.remarks),
    };
    if (!record) payload.openingBalance = moneyOrNull(values.openingBalance);
    setSaving(true);
    setFormError(null);
    try {
      onSaved?.(await ops.save(record ?? null, payload), { another: false });
    } catch (error) {
      if (!applyApiError(error)) setFormError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <FormError error={formError} />
      <div className="form-grid">
        <Field label="Party Name" required error={errors.name} className="span-2">
          {(p) => <TextInput {...p} maxLength={150} value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter party name" />}
        </Field>
        <Field label="Phone" error={errors.phone}>
          {(p) => <TextInput {...p} maxLength={20} value={values.phone} onChange={(e) => set('phone', e.target.value)} placeholder="One phone number" />}
        </Field>
        <Field label="City" error={errors.city}>
          {(p) => <TextInput {...p} maxLength={100} value={values.city} onChange={(e) => set('city', e.target.value)} />}
        </Field>
        <Field label="Address" error={errors.address} className="span-2">
          {(p) => <TextInput {...p} maxLength={255} value={values.address} onChange={(e) => set('address', e.target.value)} />}
        </Field>
        <Field label="State" error={errors.state}>
          {(p) => <TextInput {...p} maxLength={100} value={values.state} onChange={(e) => set('state', e.target.value)} />}
        </Field>
        {!record && (
          <Field label="Opening Balance" error={errors.openingBalance} hint="Set once, when the party is created. Positive = the party owes you; negative = advance.">
            {(p) => <MoneyInput {...p} allowNegative value={values.openingBalance} onChange={(v) => set('openingBalance', v)} placeholder="0.00" />}
          </Field>
        )}
        <Field label="Remarks" error={errors.remarks} className="span-2">
          {(p) => <TextArea {...p} maxLength={500} value={values.remarks} onChange={(e) => set('remarks', e.target.value)} />}
        </Field>
      </div>
      <FormActions saving={saving} onCancel={onCancel} submitLabel={record ? 'Save changes' : 'Save Party'} />
    </form>
  );
}
