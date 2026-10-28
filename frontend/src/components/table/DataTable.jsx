import { cx } from '../../lib/cx';
import { EmptyState, ErrorPanel, LoadingRow } from '../ui/Feedback';

/**
 * columns: [{ key, header, align?: 'right' | 'center', width?, wrap?: boolean, render?: (row, index) => node }]
 * cells never wrap unless the column sets wrap: true (use it for long names)
 * rows with row.deleted get the muted "row-deleted" style. onRowClick makes rows selectable
 * (master-detail screens); selectedKey highlights the open one.
 */
export default function DataTable({
  columns, rows, rowKey = (row) => row.id, loading = false, error = null, onRetry,
  emptyTitle = 'Nothing to show', emptyHint, onRowClick, selectedKey, rowClassName, dense = false, caption,
}) {
  if (error && (!rows || rows.length === 0)) return <ErrorPanel error={error} onRetry={onRetry} />;
  if (loading && (!rows || rows.length === 0)) return <LoadingRow />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle}>{emptyHint}</EmptyState>;

  return (
    <div className="table-wrap">
      <table className={cx('table', dense && 'dense')}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={col.align ? `align-${col.align}` : undefined} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                className={cx(
                  onRowClick && 'clickable',
                  selectedKey !== undefined && selectedKey === key && 'selected',
                  row.deleted && 'row-deleted',
                  rowClassName?.(row),
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cx(col.align && `align-${col.align}`, col.wrap && 'wrap')}>
                    {col.render ? col.render(row, index) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
