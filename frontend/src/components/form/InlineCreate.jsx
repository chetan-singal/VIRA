import { useState } from 'react';
import { describeError } from '../../lib/errors';
import Button from '../ui/Button';
import { TextInput } from './inputs';

/**
 * One line of name plus Save and Cancel, used for Add New Category and Add New Bike.
 * onCreate(name) calls the API and resolves with the new record; onCreated(record) receives it and the
 * parent closes this line. A duplicate name shows the backend's message under the box.
 */
export default function InlineCreate({ label, placeholder, onCreate, onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    const text = name.trim();
    if (!text) {
      setError('Enter a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onCreated(await onCreate(text));
    } catch (e) {
      setError(describeError(e));
      setSaving(false);
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row">
        <TextInput
          className="grow"
          autoFocus
          maxLength={100}
          aria-label={label}
          aria-invalid={error ? 'true' : undefined}
          placeholder={placeholder}
          value={name}
          disabled={saving}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
        />
        <Button variant="primary" busy={saving} onClick={save}>Save</Button>
        <Button disabled={saving} onClick={onCancel}>Cancel</Button>
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}