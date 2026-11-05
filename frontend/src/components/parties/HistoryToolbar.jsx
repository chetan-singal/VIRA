import { Checkbox, DateInput } from '../form/inputs';
import Button from '../ui/Button';

/**
 * The filter bar shared by the Selected Party tabs: From, To, any extra controls (`children`), the
 * Show deleted records check box and Clear. `actions` sit at the far right (for example Record Payment).
 */
export default function HistoryToolbar({
  from, to, onFrom, onTo, showDeleted, onShowDeleted, onClear, canClear, actions, children,
}) {
  return (
    <div className="toolbar">
      <label className="toolbar-field">
        From
        <DateInput aria-label="From date" value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} />
      </label>
      <label className="toolbar-field">
        To
        <DateInput aria-label="To date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} />
      </label>
      {children}
      <Checkbox checked={showDeleted} onChange={onShowDeleted} label="Show deleted records" />
      <Button onClick={onClear} disabled={!canClear}>Clear</Button>
      {actions && <div className="toolbar-end">{actions}</div>}
    </div>
  );
}