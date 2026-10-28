import Icon from '../ui/Icon';

/** page is 0-based, exactly as the backend's PageResponse (page, size, totalElements, totalPages). */
export default function Pagination({ page, size, totalElements, totalPages, onPageChange, onSizeChange, sizes = [10, 20, 50] }) {
  if (!totalElements) return null;
  const from = page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  const first = Math.max(0, Math.min(page - 2, totalPages - 5));
  const last = Math.min(totalPages - 1, first + 4);
  const numbers = [];
  for (let i = first; i <= last; i += 1) numbers.push(i);

  return (
    <div className="pagination">
      <span>Showing {from} to {to} of {totalElements} entries</span>
      <nav className="pager" aria-label="Pagination">
        <button type="button" aria-label="Previous page" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
          <Icon name="chevronLeft" size={14} />
        </button>
        {numbers.map((n) => (
          <button key={n} type="button" className={n === page ? 'current' : undefined} aria-current={n === page ? 'page' : undefined} onClick={() => onPageChange(n)}>
            {n + 1}
          </button>
        ))}
        <button type="button" aria-label="Next page" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
          <Icon name="chevronRight" size={14} />
        </button>
      </nav>
      {onSizeChange ? (
        <label className="page-size">
          Items per page
          <select value={size} onChange={(e) => onSizeChange(Number(e.target.value))}>
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      ) : <span />}
    </div>
  );
}
