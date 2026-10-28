import { cx } from '../../lib/cx';
import { describeError } from '../../lib/errors';
import Button from './Button';
import Icon from './Icon';

export function Spinner({ large = false, label }) {
  return <span className={cx('spinner', large && 'lg')} role={label ? 'status' : undefined} aria-label={label} />;
}

export function LoadingRow({ label = 'Loading…' }) {
  return (
    <div className="loading-row" role="status">
      <Spinner large /> <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, children }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={22} /></div>
      <div className="empty-title">{title}</div>
      {children && <div className="empty-hint">{children}</div>}
    </div>
  );
}

const ALERT_ICONS = { error: 'error', info: 'info', warning: 'warning', success: 'success' };

/** tone: error | info | warning | success */
export function InlineAlert({ tone = 'error', title, children, className }) {
  return (
    <div className={cx('alert', `alert-${tone}`, className)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICONS[tone]} size={18} />
      <div>
        {title && <div className="alert-title">{title}</div>}
        {children && <div className="alert-body">{children}</div>}
      </div>
    </div>
  );
}

/** What a list or page shows when its request failed. */
export function ErrorPanel({ error, onRetry }) {
  return (
    <div className="empty">
      <InlineAlert tone="error" title={error?.isNetwork ? 'Backend not reachable' : 'Could not load this'}>
        {describeError(error)}
      </InlineAlert>
      {onRetry && (
        <Button size="sm" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
