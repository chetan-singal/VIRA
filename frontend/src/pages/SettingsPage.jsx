import { useState } from 'react';
import { settingsApi } from '../api/endpoints';
import { ChoiceGroup, Field, Select, TextInput } from '../components/form/inputs';
import { useForm } from '../components/form/useForm';
import RecalculatePanel from '../components/settings/RecalculatePanel';
import Button from '../components/ui/Button';
import { Panel } from '../components/ui/Cards';
import { ErrorPanel, InlineAlert, LoadingRow } from '../components/ui/Feedback';
import { useToast } from '../components/ui/Toast';
import { useApi } from '../hooks/useApi';
import { describeError } from '../lib/errors';
import { formatDate, todayIso } from '../lib/format';
import { useAppState } from '../state/AppState';

const BILL_TYPES = [
  { value: 'CASH', label: 'Cash Bill' },
  { value: 'PARTY', label: 'Party Bill' },
];
const FOCUS_FIELDS = [
  { value: 'item_search', label: 'Item search' },
  { value: 'customer', label: 'Customer or Party' },
  { value: 'bill_date', label: 'Bill date' },
];
const DATE_FORMATS = ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'].map((value) => ({ value, label: value }));
const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const text = (value) => (value === null || value === undefined ? '' : String(value));

/** Form values (all text) from a SettingsResponse. */
function toForm(s) {
  return {
    defaultBillType: text(s.defaultBillType),
    defaultFocusField: text(s.defaultFocusField),
    defaultPrinter: text(s.defaultPrinter),
    dateFormat: text(s.dateFormat),
    theme: text(s.theme),
  };
}

function SettingsForm({ settings }) {
  const toast = useToast();
  const { reloadSettings } = useAppState();
  const [baseline, setBaseline] = useState(() => toForm(settings));
  const { values, errors, set, applyApiError, reset } = useForm(baseline);
  const [saving, setSaving] = useState(false);
  const [topError, setTopError] = useState(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);

  async function save() {
    const payload = {
      defaultBillType: values.defaultBillType,
      defaultFocusField: values.defaultFocusField,
      defaultPrinter: values.defaultPrinter.trim(), // blank means the system default printer
      dateFormat: values.dateFormat,
      theme: values.theme,
    };

    setSaving(true);
    setTopError(null);
    try {
      const saved = await settingsApi.update(payload);
      const next = toForm(saved);
      setBaseline(next);
      reset(next);
      toast.success('Settings saved.');
      await reloadSettings(); // the new date format and theme apply to the whole app at once
    } catch (error) {
      if (!applyApiError(error)) setTopError(describeError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); save(); }} className="stack" style={{ gap: 16 }}>
      {topError && <InlineAlert tone="error">{topError}</InlineAlert>}

      <Panel title="Billing Defaults" icon="receipt">
        <div className="form-grid">
          <Field label="Default Bill Type" error={errors.defaultBillType} hint="The bill type New Bill opens with.">
            <ChoiceGroup
              name="settings-bill-type"
              label="Default bill type"
              value={values.defaultBillType}
              options={BILL_TYPES}
              onChange={(v) => set('defaultBillType', v)}
            />
          </Field>
          <Field label="Default Starting Focus Field" error={errors.defaultFocusField} hint="Where the cursor starts when New Bill opens.">
            {(p) => (
              <Select {...p} value={values.defaultFocusField} options={FOCUS_FIELDS} onChange={(e) => set('defaultFocusField', e.target.value)} />
            )}
          </Field>
        </div>
      </Panel>

      <Panel title="Printing" icon="print">
        <div className="form-grid">
          <Field
            label="Default Printer"
            error={errors.defaultPrinter}
            hint="Leave blank for the system default. The desktop app will list your printers in a later phase."
            className="span-2"
          >
            {(p) => <TextInput {...p} maxLength={255} value={values.defaultPrinter} onChange={(e) => set('defaultPrinter', e.target.value)} />}
          </Field>
        </div>
      </Panel>

      <Panel title="Display" icon="dashboard">
        <div className="form-grid">
          <Field label="Date Format" error={errors.dateFormat} hint={`Example: today shows as ${formatDate(todayIso(), values.dateFormat)}.`}>
            {(p) => <Select {...p} value={values.dateFormat} options={DATE_FORMATS} onChange={(e) => set('dateFormat', e.target.value)} />}
          </Field>
          <Field label="Theme" error={errors.theme}>
            <ChoiceGroup
              name="settings-theme"
              label="Theme"
              value={values.theme}
              options={THEMES}
              onChange={(v) => set('theme', v)}
            />
          </Field>
        </div>
      </Panel>

      <div className="form-actions" style={{ marginTop: 0 }}>
        <Button onClick={() => { reset(baseline); setTopError(null); }} disabled={!dirty || saving}>Reset</Button>
        <Button type="submit" variant="primary" busy={saving} disabled={!dirty}>Save changes</Button>
      </div>
    </form>
  );
}

/** Settings (SRS §19): the five preferences, then the Recalculate Balances maintenance card (SRS §20.9). */
export default function SettingsPage() {
  const settings = useApi((signal) => settingsApi.get({ signal }), []);

  let preferences;
  if (settings.data) preferences = <SettingsForm settings={settings.data} />;
  else if (settings.error) preferences = <ErrorPanel error={settings.error} onRetry={settings.reload} />;
  else preferences = <LoadingRow />;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {preferences}
      <RecalculatePanel />
    </div>
  );
}