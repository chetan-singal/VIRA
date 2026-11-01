import { useAppState } from '../../state/AppState';
import { formatDate, formatDateTime, formatMoney, isZeroMoney } from '../../lib/format';
import Badge from './Badge';

export function Money({ value, className }) {
  return <span className={`num ${className ?? ''}`.trim()}>{formatMoney(value)}</span>;
}

/**
 * A Party's Current Balance. Positive = the party owes us (with `showDue`, shown red with a Due tag).
 * Negative = the party has paid ahead, shown as "Advance / Credit" wherever a balance appears (SRS §9.4, §25.3).
 */
export function Balance({ value, showDue = false }) {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n)) return <span className="num">—</span>;
  if (!isZeroMoney(n) && n < 0) {
    return (
      <span className="row" style={{ gap: 6 }}>
        <span className="num">{formatMoney(Math.abs(n))}</span>
        <Badge tone="green">Advance / Credit</Badge>
      </span>
    );
  }
  if (showDue && !isZeroMoney(n) && n > 0) {
    return (
      <span className="row" style={{ gap: 6 }}>
        <span className="num balance-due">{formatMoney(n)}</span>
        <Badge tone="red">Due</Badge>
      </span>
    );
  }
  return <span className="num">{formatMoney(n)}</span>;
}

/** A date (or date-time) in the format chosen in Settings. */
export function DateText({ value, withTime = false }) {
  const { settings } = useAppState();
  return <span className="num">{withTime ? formatDateTime(value, settings.dateFormat) : formatDate(value, settings.dateFormat)}</span>;
}