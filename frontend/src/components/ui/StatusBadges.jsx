import { useAppState } from '../../state/AppState';
import { formatDateTime } from '../../lib/format';
import Badge from './Badge';

/**
 * The shared "Revised" / "Deleted" tags (SRS §11, §20.8). Renders either, both, or nothing.
 * Pass a whole record (anything with edited / deleted flags) or the individual props.
 */
export default function StatusBadges({
  record,
  edited = record?.edited,
  deleted = record?.deleted,
  lastEditedAt = record?.lastEditedAt,
  deletedAt = record?.deletedAt,
}) {
  const { settings } = useAppState();
  if (!edited && !deleted) return null;
  return (
    <span className="status-badges">
      {edited && (
        <Badge tone="amber" title={lastEditedAt ? `Revised on ${formatDateTime(lastEditedAt, settings.dateFormat)}` : 'Revised'}>
          Revised
        </Badge>
      )}
      {deleted && (
        <Badge tone="muted" title={deletedAt ? `Deleted on ${formatDateTime(deletedAt, settings.dateFormat)}` : 'Deleted'}>
          Deleted
        </Badge>
      )}
    </span>
  );
}
