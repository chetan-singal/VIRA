import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setupApi } from '../api/endpoints';
import { DateInput, Field, MoneyInput, TextInput } from '../components/form/inputs';
import { useForm } from '../components/form/useForm';
import Button from '../components/ui/Button';
import { InlineAlert } from '../components/ui/Feedback';
import { describeError } from '../lib/errors';
import { emptyToNull, moneyOrNull } from '../lib/forms';
import { todayIso } from '../lib/format';
import { useAppState } from '../state/AppState';

const SECTION = { fontSize: 14, fontWeight: 700, margin: '22px 0 10px', color: 'var(--text)' };

function initial() {
  return {
    shopName: '',
    cashBillPrefix: '',
    partyBillPrefix: '',
    voucherPrefix: '',
    supplierPaymentPrefix: '',
    startingBillNumber: '',
    openingCashInHand: '',
    openingCashInHandDate: todayIso(),
  };
}

/** Display text only: the real numbers are issued by the backend (one shared counter for Cash and Party bills). */
function exampleLine(values) {
  const start = values.startingBillNumber || '1001';
  const cash = `${values.cashBillPrefix.trim()}${start}`;
  const party = `${values.partyBillPrefix.trim()}${start}`;
  const bill = cash === party ? cash : `${cash} or ${party}`;
  return `Example: first bill ${bill} · first voucher ${values.voucherPrefix.trim()}1 · first supplier payment ${values.supplierPaymentPrefix.trim()}1`;
}

/**
 * First-run setup (SRS §18.3): the only screen reachable until setup is complete. Writes the shop name, the four
 * numbering prefixes, the starting bill number and the opening cash once, through POST /api/setup.
 */
export default function SetupPage() {
  const navigate = useNavigate();
  const { completeSetup, checkSetup } = useAppState();
  const { values, errors, set, setErrors, applyApiError } = useForm(initial());
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const box = (key, props = {}) => (p) => (
    <TextInput {...p} value={values[key]} onChange={(e) => set(key, e.target.value)} {...props} />
  );

  async function finish() {
    const problems = {};
    if (!values.shopName.trim()) problems.shopName = 'Shop name is required.';
    if (values.startingBillNumber === '') problems.startingBillNumber = 'Starting bill number is required.';
    if (values.openingCashInHand.trim() !== '' && moneyOrNull(values.openingCashInHand) === null) problems.openingCashInHand = 'Enter the opening cash as an amount.';
    if (values.openingCashInHandDate === '') problems.openingCashInHandDate = 'Opening cash date is required.';
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }

    setSaving(true);
    setAlert(null);
    try {
      await setupApi.run({
        shopName: values.shopName.trim(),
        cashBillPrefix: emptyToNull(values.cashBillPrefix),
        partyBillPrefix: emptyToNull(values.partyBillPrefix),
        voucherPrefix: emptyToNull(values.voucherPrefix),
        supplierPaymentPrefix: emptyToNull(values.supplierPaymentPrefix),
        startingBillNumber: Number(values.startingBillNumber),
        openingCashInHand: moneyOrNull(values.openingCashInHand) ?? 0,
        openingCashInHandDate: values.openingCashInHandDate,
        printShowShopName: true,
        printShowAddress: true,
        printShowPhone: true,
        printShowLogo: true,
        printShowThankyou: true,
        printShowMrp: true,
        printTermsConditions: null,
        topLine: null,
      });
      await completeSetup();
      navigate('/', { replace: true });
    } catch (error) {
      if (!applyApiError(error)) setAlert({ code: error?.code, message: describeError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fullscreen">
      <div className="fullscreen-card" style={{ width: 'min(760px, 100%)', textAlign: 'left' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-mark" style={{ margin: '0 auto' }}>V</div>
          <h1>Welcome to VIRA</h1>
          <p>Set up your shop once. You can change everything here later in Shop Profile except the three opening values.</p>
        </div>

        <form noValidate onSubmit={(e) => { e.preventDefault(); finish(); }}>
          {alert && (
            <InlineAlert tone="error" className="form-error">
              {alert.message}
              {alert.code === 'SETUP_ALREADY_DONE' && <div><Button onClick={checkSetup}>Go to Home</Button></div>}
            </InlineAlert>
          )}

          <h2 style={SECTION}>1. Your shop</h2>
          <div className="form-grid">
            <Field label="Shop Name" required error={errors.shopName} className="span-2">
              {box('shopName', { maxLength: 150, autoFocus: true })}
            </Field>
          </div>

          <h2 style={SECTION}>2. Document numbers</h2>
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
                  placeholder="1001"
                  value={values.startingBillNumber}
                  onChange={(e) => set('startingBillNumber', e.target.value.replace(/\D/g, ''))}
                />
              )}
            </Field>
            <p className="field-hint span-2">{exampleLine(values)}</p>
          </div>

          <h2 style={SECTION}>3. Opening money</h2>
          <div className="form-grid">
            <Field label="Opening Cash in Hand" error={errors.openingCashInHand}>
              {(p) => <MoneyInput {...p} value={values.openingCashInHand} placeholder="0.00" onChange={(v) => set('openingCashInHand', v)} />}
            </Field>
            <Field label="Opening Cash in Hand Date" required error={errors.openingCashInHandDate}>
              {(p) => <DateInput {...p} value={values.openingCashInHandDate} onChange={(e) => set('openingCashInHandDate', e.target.value)} />}
            </Field>
            <p className="field-hint span-2">These two values and the starting bill number are locked once the first bill, voucher or payment exists.</p>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" busy={saving}>Finish setup</Button>
          </div>
        </form>

        {import.meta.env.DEV && (
          <p className="subtle" style={{ marginTop: 14, fontSize: 12, textAlign: 'center' }}>
            <Link to="/dev/components">Open the component gallery</Link> (development only)
          </p>
        )}
      </div>
    </div>
  );
}