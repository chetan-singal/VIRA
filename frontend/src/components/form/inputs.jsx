import { forwardRef, useId } from 'react';
import { cx } from '../../lib/cx';
import { sanitizeMoney } from '../../lib/forms';

/** Label + control + hint + inline error. children is a function (controlProps) => control, or a node. */
export function Field({ label, required = false, hint, error, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const controlProps = { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy };
  return (
    <div className={cx('field', className)}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {typeof children === 'function' ? children(controlProps) : children}
      {error ? <div id={`${id}-error`} className="field-error" role="alert">{error}</div> : hint ? <div id={`${id}-hint`} className="field-hint">{hint}</div> : null}
    </div>
  );
}

export const TextInput = forwardRef(function TextInput({ className, ...rest }, ref) {
  return <input ref={ref} type="text" className={cx('input', className)} {...rest} />;
});

export const TextArea = forwardRef(function TextArea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx('textarea', className)} {...rest} />;
});

export function DateInput({ className, ...rest }) {
  return <input type="date" className={cx('input', className)} {...rest} />;
}

export function Select({ className, options, ...rest }) {
  return (
    <select className={cx('select', className)} {...rest}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Text box that only lets a money amount through: digits, one dot, two decimals. onChange gets the clean string. */
export function MoneyInput({ value, onChange, allowNegative = false, className, ...rest }) {
  return (
    <div className="input-adorn">
      <span>₹</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cx('input', 'num', className)}
        value={value}
        onChange={(e) => onChange(sanitizeMoney(e.target.value, allowNegative))}
        {...rest}
      />
    </div>
  );
}

/** Segmented radio group, e.g. Cash | Online. options: [{ value, label }]. */
export function ChoiceGroup({ name, value, onChange, options, label }) {
  return (
    <div className="choice-group" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className="choice">
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}
