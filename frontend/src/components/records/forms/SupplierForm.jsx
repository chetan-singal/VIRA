import { useState } from 'react';
import { emptyToNull } from '../../../lib/forms';
import { Field, TextInput } from '../../form/inputs';
import { useForm } from '../../form/useForm';
import { FormActions, FormError } from './formParts';

function initial(record) {
  return { name: record?.name ?? '', phone: record?.phone ?? '', city: record?.city ?? '' };
}

/** New / Edit Supplier: name, phone and city only. No code, e-mail, notes or balance exist in VIRA (SRS §14.1). */
export default function SupplierForm({ record, ops, onSaved, onCancel }) {
  const { values, errors, set, setErrors, applyApiError } = useForm(initial(record));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  async function submit() {
    if (!values.name.trim()) {
      setErrors({ name: 'Supplier name is required.' });
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const saved = await ops.save(record ?? null, {
        name: values.name.trim(),
        phone: emptyToNull(values.phone),
        city: emptyToNull(values.city),
      });
      onSaved?.(saved, { another: false });
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
        <Field label="Supplier Name" required error={errors.name} className="span-2">
          {(p) => <TextInput {...p} maxLength={150} value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter supplier name" />}
        </Field>
        <Field label="Phone" error={errors.phone}>
          {(p) => <TextInput {...p} maxLength={20} value={values.phone} onChange={(e) => set('phone', e.target.value)} />}
        </Field>
        <Field label="City" error={errors.city}>
          {(p) => <TextInput {...p} maxLength={100} value={values.city} onChange={(e) => set('city', e.target.value)} />}
        </Field>
      </div>
      <FormActions saving={saving} onCancel={onCancel} submitLabel={record ? 'Save changes' : 'Save Supplier'} />
    </form>
  );
}
