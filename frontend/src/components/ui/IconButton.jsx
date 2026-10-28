import { cx } from '../../lib/cx';
import Icon from './Icon';

/**
 * Icon-only button. `label` is the accessible name; `reason` is shown as the tooltip when the button is
 * disabled (a disabled button cannot show its own tooltip, so the wrapper carries it).
 */
export default function IconButton({ icon, label, tone, disabled = false, busy = false, reason, onClick, ...rest }) {
  const tooltip = disabled && reason ? `${label} — ${reason}` : label;
  return (
    <span className="icon-btn-wrap" title={tooltip}>
      <button
        type="button"
        className={cx('icon-btn', tone && `tone-${tone}`)}
        aria-label={label}
        disabled={disabled || busy}
        onClick={onClick}
        {...rest}
      >
        {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name={icon} size={16} />}
      </button>
    </span>
  );
}
