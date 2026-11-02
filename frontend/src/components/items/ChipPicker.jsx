import { useState } from 'react';
import { Select } from '../form/inputs';
import InlineCreate from '../form/InlineCreate';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

/**
 * Multi-select chips, used for Compatible Bikes. A select adds a chip, the cross removes it, and the
 * create button adds a brand-new record through onCreate(name) and selects it.
 *   options: [{ id, name }]   value: [id, ...]   onChange(ids)   onCreated(record) tells the parent about a new record.
 * Any other props (id, aria-*) go to the select, so a Field label points at it.
 */
export default function ChipPicker({
  options, value, onChange, prompt, createLabel, createPlaceholder, onCreate, onCreated, ...rest
}) {
  const [creating, setCreating] = useState(false);
  const chosen = value.map((id) => options.find((o) => o.id === id)).filter(Boolean);
  const available = options.filter((o) => !value.includes(o.id));

  return (
    <div className="stack" style={{ gap: 8 }}>
      {chosen.length > 0 && (
        <div className="chip-list">
          {chosen.map((o) => (
            <span key={o.id} className="chip">
              {o.name}
              <button type="button" aria-label={`Remove ${o.name}`} onClick={() => onChange(value.filter((id) => id !== o.id))}>
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="row">
        <Select
          className="grow"
          options={[{ value: '', label: prompt }, ...available.map((o) => ({ value: String(o.id), label: o.name }))]}
          value=""
          disabled={available.length === 0}
          onChange={(e) => {
            if (e.target.value !== '') onChange([...value, Number(e.target.value)]);
          }}
          {...rest}
        />
        <Button icon="plus" disabled={creating} onClick={() => setCreating(true)}>{createLabel}</Button>
      </div>
      {creating && (
        <InlineCreate
          label={createPlaceholder}
          placeholder={createPlaceholder}
          onCreate={onCreate}
          onCreated={(record) => {
            onCreated?.(record);
            onChange([...value, record.id]);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  );
}