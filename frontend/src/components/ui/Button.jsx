import { cx } from '../../lib/cx';
import Icon from './Icon';

/** variant: primary | secondary | danger | ghost. busy shows a spinner and blocks double clicks. */
export default function Button({ variant = 'secondary', size, icon, busy = false, disabled, className, children, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)}
      disabled={disabled || busy}
      {...rest}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}
