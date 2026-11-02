import { useState } from 'react';
import { bikeApi, categoryApi, itemApi } from '../../api/endpoints';
import { moneyOrNull } from '../../lib/forms';
import { Field, MoneyInput, PercentInput, Select, TextInput } from '../form/inputs';
import InlineCreate from '../form/InlineCreate';
import { useForm } from '../form/useForm';
import { FormActions, FormError } from '../records/forms/formParts';
import Button from '../ui/Button';
import ChipPicker from './ChipPicker';

const UNIT_OPTIONS = ['Pcs', 'Pkg/Pack', 'Box'].map((u) => ({ value: u, label: u }));
const TYPE_OPTIONS = [
  { value: 'MRP', label: 'MRP Item' },
  { value: 'NET_RATE', label: 'Net Rate Item' },
];

const text = (value) => (value === null || value === undefined ? '' : String(value));

function initial(item) {
  return {
    name: item?.name ?? '',
    itemType: item?.itemType ?? 'MRP',
    unit: item?.unit ?? 'Pcs',
    partCategoryId: item?.partCategory ? String(item.partCategory.id) : '',
    bikeIds: (item?.bikes ?? []).map((b) => b.id),
    mrp: text(item?.mrp),
    defaultDiscountPercent: text(item?.defaultDiscountPercent),
    defaultNetRate: text(item?.defaultNetRate),
  };
}

function mergeById(base, added) {
  const known = new Set(base.map((r) => r.id));
  return [...base, ...added.filter((r) => !known.has(r.id))];
}

/**
 * Add New Item / Edit Item. `item` is null for a new item. In Edit mode the type radios are disabled while
 * item.typeLocked is true (SRS §4.4). The browser checks only that required fields are filled; the backend
 * answers every other rule, and its field errors appear under the matching field.
 */
export default function ItemForm({ item, categories = [], bikes = [], onCategoryCreated, onBikeCreated, onSaved, onCancel }) {
  const { values, errors, set, setErrors, applyApiError } = useForm(initial(item));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategories, setNewCategories] = useState([]);
  const [newBikes, setNewBikes] = useState([]);

  const locked = item?.typeLocked === true;
  const isMrp = values.itemType === 'MRP';
  const categoryList = mergeById(categories, newCategories);
  const bikeList = mergeById(bikes, newBikes);
  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categoryList.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  function chooseType(next) {
    if (next === values.itemType) return;
    set('itemType', next);
    if (next === 'MRP') {
      set('defaultNetRate', '');
    } else {
      set('mrp', '');
      set('defaultDiscountPercent', '');
    }
  }

  function categoryCreated(created) {
    setNewCategories((list) => [...list, created]);
    onCategoryCreated?.(created);
    set('partCategoryId', String(created.id));
    setAddingCategory(false);
  }

  function bikeCreated(created) {
    setNewBikes((list) => [...list, created]);
    onBikeCreated?.(created);
  }

  async function submit() {
    const problems = {};
    if (!values.name.trim()) problems.name = 'Item name is required.';
    if (isMrp) {
      if (moneyOrNull(values.mrp) === null) problems.mrp = 'MRP is required.';
      if (moneyOrNull(values.defaultDiscountPercent) === null) problems.defaultDiscountPercent = 'Default discount is required.';
    } else if (moneyOrNull(values.defaultNetRate) === null) {
      problems.defaultNetRate = 'Default net rate is required.';
    }
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }

    const payload = {
      name: values.name.trim(),
      unit: values.unit,
      partCategoryId: values.partCategoryId === '' ? null : Number(values.partCategoryId),
      bikeIds: values.bikeIds,
      itemType: values.itemType,
      mrp: isMrp ? moneyOrNull(values.mrp) : null,
      defaultDiscountPercent: isMrp ? moneyOrNull(values.defaultDiscountPercent) : null,
      defaultNetRate: isMrp ? null : moneyOrNull(values.defaultNetRate),
    };

    setSaving(true);
    setFormError(null);
    try {
      const saved = item ? await itemApi.update(item.id, payload) : await itemApi.create(payload);
      onSaved(saved);
    } catch (error) {
      if (error?.code === 'ITEM_TYPE_LOCKED') setErrors({ itemType: error.message });
      else if (!applyApiError(error)) setFormError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <FormError error={formError} />
      <div className="form-grid">
        <Field label="Item Name" required error={errors.name} className="span-2">
          {(p) => <TextInput {...p} maxLength={150} value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter item name" />}
        </Field>

        <Field
          label="Item Type"
          required
          error={errors.itemType}
          hint={locked ? 'Locked: saved Party or Cash rates exist. Remove them from the details panel to change the type.' : undefined}
          className="span-2"
        >
          {(p) => (
            <div
              className="choice-group"
              role="radiogroup"
              aria-label="Item Type"
              aria-describedby={p['aria-describedby']}
              style={locked ? { opacity: 0.6 } : undefined}
            >
              {TYPE_OPTIONS.map((o) => (
                <label key={o.value} className="choice">
                  <input
                    type="radio"
                    name="itemType"
                    value={o.value}
                    checked={values.itemType === o.value}
                    disabled={locked}
                    onChange={() => chooseType(o.value)}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          )}
        </Field>

        <Field label="Unit" required error={errors.unit}>
          {(p) => <Select {...p} options={UNIT_OPTIONS} value={values.unit} onChange={(e) => set('unit', e.target.value)} />}
        </Field>

        <Field label="Part Category" error={errors.partCategoryId}>
          {(p) => (
            <div className="stack" style={{ gap: 8 }}>
              <div className="row">
                <Select
                  {...p}
                  className="grow"
                  options={categoryOptions}
                  value={values.partCategoryId}
                  onChange={(e) => set('partCategoryId', e.target.value)}
                />
                <Button icon="plus" disabled={addingCategory} onClick={() => setAddingCategory(true)}>Add New Category</Button>
              </div>
              {addingCategory && (
                <InlineCreate
                  label="New category name"
                  placeholder="New category name"
                  onCreate={(name) => categoryApi.create(name)}
                  onCreated={categoryCreated}
                  onCancel={() => setAddingCategory(false)}
                />
              )}
            </div>
          )}
        </Field>

        <Field label="Compatible Bikes" error={errors.bikeIds} className="span-2">
          {(p) => (
            <ChipPicker
              {...p}
              options={bikeList}
              value={values.bikeIds}
              onChange={(ids) => set('bikeIds', ids)}
              prompt="Select a bike to add"
              createLabel="Add New Bike"
              createPlaceholder="New bike name"
              onCreate={(name) => bikeApi.create(name)}
              onCreated={bikeCreated}
            />
          )}
        </Field>

        <h3 className="span-2" style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>Default Pricing</h3>
        {isMrp ? (
          <>
            <Field label="MRP" required error={errors.mrp}>
              {(p) => <MoneyInput {...p} value={values.mrp} onChange={(v) => set('mrp', v)} placeholder="0.00" />}
            </Field>
            <Field label="Default Discount %" required error={errors.defaultDiscountPercent}>
              {(p) => <PercentInput {...p} value={values.defaultDiscountPercent} onChange={(v) => set('defaultDiscountPercent', v)} placeholder="0" />}
            </Field>
          </>
        ) : (
          <Field label="Default Net Rate" required error={errors.defaultNetRate}>
            {(p) => <MoneyInput {...p} value={values.defaultNetRate} onChange={(v) => set('defaultNetRate', v)} placeholder="0.00" />}
          </Field>
        )}
        <p className="field-hint span-2">
          This is the base price for Cash and every Party. Party or Cash prices are saved later from a bill or the party’s Item Rates tab.
        </p>
      </div>
      <FormActions saving={saving} onCancel={onCancel} submitLabel={item ? 'Save changes' : 'Save Item'} />
    </form>
  );
}