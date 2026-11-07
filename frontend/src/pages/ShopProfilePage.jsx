import { useState } from 'react';
import { shopApi } from '../api/endpoints';
import { Checkbox, DateInput, Field, MoneyInput, TextArea, TextInput } from '../components/form/inputs';
import { useForm } from '../components/form/useForm';
import LogoUploader from '../components/shop/LogoUploader';
import Button from '../components/ui/Button';
import { Panel } from '../components/ui/Cards';
import { ErrorPanel, InlineAlert, LoadingRow } from '../components/ui/Feedback';
import { useToast } from '../components/ui/Toast';
import { useApi } from '../hooks/useApi';
import { describeError } from '../lib/errors';
import { emptyToNull, moneyOrNull } from '../lib/forms';
import { useAppState } from '../state/AppState';

const PRINT_FLAGS = [
  ['printShowShopName', 'Show shop name'],
  ['printShowAddress', 'Show address'],
  ['printShowPhone', 'Show phone'],
  ['printShowLogo', 'Show logo'],
  ['printShowThankyou', 'Show thank-you message'],
  ['printShowMrp', 'Show MRP'],
];

const text = (value) => (value === null || value === undefined ? '' : String(value));

/** Form values (all text, plus the print flags as booleans) from a ShopProfileResponse. */
function toForm(p) {
  return {
    shopName: text(p.shopName),
    address: text(p.address),
    city: text(p.city),
    state: text(p.state),
    pinCode: text(p.pinCode),
    phone: text(p.phone),
    alternatePhone: text(p.alternatePhone),
    email: text(p.email),
    topLine: text(p.topLine),
    notes: text(p.notes),
    cashBillPrefix: text(p.cashBillPrefix),
    partyBillPrefix: text(p.partyBillPrefix),
    voucherPrefix: text(p.voucherPrefix),
    supplierPaymentPrefix: text(p.supplierPaymentPrefix),
    startingBillNumber: text(p.startingBillNumber),
    openingCashInHand: text(p.openingCashInHand),
    openingCashInHandDate: text(p.openingCashInHandDate),
    printShowShopName: Boolean(p.printShowShopName),
    printShowAddress: Boolean(p.printShowAddress),
    printShowPhone: Boolean(p.printShowPhone),
    printShowLogo: Boolean(p.printShowLogo),
    printShowThankyou: Boolean(p.printShowThankyou),
    printShowMrp: Boolean(p.printShowMrp),
    printTermsConditions: text(p.printTermsConditions),
  };
}

function ShopProfileForm({ profile, onReload }) {
  const toast = useToast();
  const { reloadShop } = useAppState();
  const hasTopLine = 'topLine' in profile; // absent when the backend has no top-line field
  const locked = profile.setupValuesLocked === true;
  const [baseline, setBaseline] = useState(() => toForm(profile));
  const { values, errors, set, setErrors, applyApiError, reset } = useForm(baseline);
  const [saving, setSaving] = useState(false);
  const [topError, setTopError] = useState(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const box = (key, props = {}) => (p) => (
    <TextInput {...p} value={values[key]} onChange={(e) => set(key, e.target.value)} {...props} />
  );

  async function save() {
    const problems = {};
    if (!values.shopName.trim()) problems.shopName = 'Shop name is required.';
    if (values.startingBillNumber === '') problems.startingBillNumber = 'Starting bill number is required.';
    if (moneyOrNull(values.openingCashInHand) === null) problems.openingCashInHand = 'Opening cash in hand is required.';
    if (values.openingCashInHandDate === '') problems.openingCashInHandDate = 'Opening cash date is required.';
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }

    const payload = {
      shopName: values.shopName.trim(),
      address: emptyToNull(values.address),
      phone: emptyToNull(values.phone),
      alternatePhone: emptyToNull(values.alternatePhone),
      email: emptyToNull(values.email),
      city: emptyToNull(values.city),
      state: emptyToNull(values.state),
      pinCode: emptyToNull(values.pinCode),
      notes: emptyToNull(values.notes),
      cashBillPrefix: emptyToNull(values.cashBillPrefix),
      partyBillPrefix: emptyToNull(values.partyBillPrefix),
      voucherPrefix: emptyToNull(values.voucherPrefix),
      supplierPaymentPrefix: emptyToNull(values.supplierPaymentPrefix),
      startingBillNumber: Number(values.startingBillNumber),
      openingCashInHand: moneyOrNull(values.openingCashInHand),
      openingCashInHandDate: values.openingCashInHandDate,
      printShowShopName: values.printShowShopName,
      printShowAddress: values.printShowAddress,
      printShowPhone: values.printShowPhone,
      printShowLogo: values.printShowLogo,
      printShowThankyou: values.printShowThankyou,
      printShowMrp: values.printShowMrp,
      printTermsConditions: emptyToNull(values.printTermsConditions),
    };
    if (hasTopLine) payload.topLine = emptyToNull(values.topLine);

    setSaving(true);
    setTopError(null);
    try {
      const saved = await shopApi.update(payload);
      const next = toForm(saved);
      setBaseline(next);
      reset(next);
      toast.success('Shop profile saved.');
      await reloadShop();
      onReload();
    } catch (error) {
      if (error?.code === 'SETUP_VALUES_LOCKED') setTopError(error.message);
      else if (!applyApiError(error)) setTopError(describeError(error));
    } finally {
      setSaving(false);
    }
  }

  function logoChanged() {
    onReload();
    reloadShop();
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); save(); }} className="stack" style={{ gap: 16 }}>
      {topError && <InlineAlert tone="error">{topError}</InlineAlert>}

      <div className="split">
        <Panel title="Shop Information" icon="shop">
          <div className="form-grid">
            <Field label="Shop Name" required error={errors.shopName} className="span-2">
              {box('shopName', { maxLength: 150 })}
            </Field>
            <Field label="Address" error={errors.address} className="span-2">
              {box('address', { maxLength: 255 })}
            </Field>
            <Field label="City" error={errors.city}>{box('city', { maxLength: 100 })}</Field>
            <Field label="State" error={errors.state}>{box('state', { maxLength: 100 })}</Field>
            <Field label="PIN Code" error={errors.pinCode}>{box('pinCode', { maxLength: 10 })}</Field>
            <Field label="Phone" error={errors.phone}>{box('phone', { maxLength: 20 })}</Field>
            <Field label="Alternate Phone" error={errors.alternatePhone}>{box('alternatePhone', { maxLength: 20 })}</Field>
            <Field label="Email" error={errors.email}>{box('email', { maxLength: 150 })}</Field>
            {hasTopLine && (
              <Field label="Bill Top Line" error={errors.topLine} hint="Printed above the shop name on bills." className="span-2">
                {box('topLine', { maxLength: 100 })}
              </Field>
            )}
            <Field label="Notes" error={errors.notes} className="span-2">
              {(p) => <TextArea {...p} rows={3} maxLength={500} value={values.notes} onChange={(e) => set('notes', e.target.value)} />}
            </Field>
          </div>
        </Panel>

        <Panel title="Logo" icon="items">
          <LogoUploader hasLogo={profile.hasLogo} shopName={profile.shopName} onChanged={logoChanged} />
        </Panel>
      </div>

      <Panel title="Numbering and Opening Values" icon="receipt">
        <div className="form-grid">
          <Field label="Cash Bill Prefix" error={errors.cashBillPrefix}>{box('cashBillPrefix', { maxLength: 20, placeholder: 'C-' })}</Field>
          <Field label="Party Bill Prefix" error={errors.partyBillPrefix}>{box('partyBillPrefix', { maxLength: 20, placeholder: 'P-' })}</Field>
          <Field label="Voucher Prefix" error={errors.voucherPrefix}>{box('voucherPrefix', { maxLength: 20, placeholder: 'PV-' })}</Field>
          <Field label="Supplier Payment Prefix" error={errors.supplierPaymentPrefix}>
            {box('supplierPaymentPrefix', { maxLength: 20, placeholder: 'SP-' })}
          </Field>
          <Field label="Starting Bill Number" required error={errors.startingBillNumber}>
            {(p) => (
              <TextInput
                {...p}
                inputMode="numeric"
                maxLength={9}
                value={values.startingBillNumber}
                disabled={locked}
                readOnly={locked}
                onChange={(e) => set('startingBillNumber', e.target.value.replace(/\D/g, ''))}
              />
            )}
          </Field>
          <Field label="Opening Cash in Hand" required error={errors.openingCashInHand}>
            {(p) => (
              <MoneyInput
                {...p}
                value={values.openingCashInHand}
                disabled={locked}
                readOnly={locked}
                onChange={(v) => set('openingCashInHand', v)}
              />
            )}
          </Field>
          <Field label="Opening Cash in Hand Date" required error={errors.openingCashInHandDate}>
            {(p) => (
              <DateInput
                {...p}
                value={values.openingCashInHandDate}
                disabled={locked}
                readOnly={locked}
                onChange={(e) => set('openingCashInHandDate', e.target.value)}
              />
            )}
          </Field>
          <p className="field-hint span-2">Changing a prefix affects only future numbers; numbers already issued keep their text.</p>
          {locked && (
            <InlineAlert tone="info" className="span-2">
              Locked because bills, vouchers or payments exist (deleted ones count).
            </InlineAlert>
          )}
        </div>
      </Panel>

      <Panel title="Bill Print Settings" icon="print">
        <div className="form-grid">
          {PRINT_FLAGS.map(([key, label]) => (
            <Checkbox key={key} label={label} checked={values[key]} onChange={(checked) => set(key, checked)} />
          ))}
          <Field label="Terms and Conditions" error={errors.printTermsConditions} className="span-2">
            {(p) => (
              <TextArea
                {...p}
                rows={4}
                maxLength={1000}
                value={values.printTermsConditions}
                onChange={(e) => set('printTermsConditions', e.target.value)}
              />
            )}
          </Field>
        </div>
      </Panel>

      <div className="form-actions">
        <Button onClick={() => { reset(baseline); setTopError(null); }} disabled={!dirty || saving}>Reset</Button>
        <Button type="submit" variant="primary" busy={saving} disabled={!dirty}>Save changes</Button>
      </div>
    </form>
  );
}

/** Shop Profile (SRS §18): shop information, logo, numbering and opening values, and bill print settings. */
export default function ShopProfilePage() {
  const profile = useApi((signal) => shopApi.get({ signal }), []);
  if (!profile.data) {
    return profile.error ? <ErrorPanel error={profile.error} onRetry={profile.reload} /> : <LoadingRow />;
  }
  return <ShopProfileForm profile={profile.data} onReload={profile.reload} />;
}