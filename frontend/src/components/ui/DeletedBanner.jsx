import { useAppState } from '../../state/AppState';
import { formatDateTime } from '../../lib/format';
import Button from './Button';

/**
 * The "Deleted" banner at the top of a deleted Party's or Supplier's page (SRS §9.3, §14.2).
 * `children` is the explanatory sentence; onRestore wires the Restore Party / Restore Supplier action.
 */
export default function DeletedBanner({ label, deletedAt, onRestore, busy = false, children }) {
  const { settings } = useAppState();
  return (
    <div className="banner" role="status">
      <div>
        <div className="banner-title">
          This {label} is deleted{deletedAt ? ` (${formatDateTime(deletedAt, settings.dateFormat)})` : ''}
        </div>
        <div className="banner-text">
          {children ?? `Its records stay visible, but cannot be edited, deleted or restored until the ${label} is restored.`}
        </div>
      </div>
      {onRestore && (
        <Button variant="primary" icon="restore" busy={busy} onClick={onRestore}>
          Restore {label}
        </Button>
      )}
    </div>
  );
}
