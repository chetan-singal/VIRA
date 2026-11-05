import RowActions from '../records/RowActions';
import Badge from '../ui/Badge';
import DeletedBanner from '../ui/DeletedBanner';
import { ErrorPanel, LoadingRow } from '../ui/Feedback';
import { Money } from '../ui/Money';

const dash = (value) => (value && String(value).trim() ? value : '—');

/**
 * The Supplier Details panel (SRS §14.2): contact details, status, payment totals and the shared
 * Edit / Delete / Restore control. `totals` is { paymentCount, paymentTotal } from GET /api/suppliers/{id}/summary.
 */
export default function SupplierDetails({ selected, supplier, loading, error, onRetry, totals, onChanged }) {
  if (!selected) return <p className="muted">Select a supplier to see its details.</p>;
  if (!supplier) {
    if (error?.status === 404) return <p className="muted">This supplier does not exist, or the link is wrong.</p>;
    return error ? <ErrorPanel error={error} onRetry={onRetry} /> : loading ? <LoadingRow /> : null;
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      {supplier.deleted && <DeletedBanner label="supplier" deletedAt={supplier.deletedAt} />}
      <div className="detail-head">
        <div className="stack" style={{ gap: 6 }}>
          <div className="detail-title">{supplier.name}</div>
          <div>
            <Badge tone={supplier.deleted ? 'muted' : 'green'}>{supplier.deleted ? 'Deleted' : 'Active'}</Badge>
          </div>
        </div>
      </div>
      <dl className="kv-grid">
        <dt>City</dt>
        <dd>{dash(supplier.city)}</dd>
        <dt>Phone</dt>
        <dd>{dash(supplier.phone)}</dd>
        <dt>Payments</dt>
        <dd>{totals ? totals.paymentCount : '—'}</dd>
        <dt>Total paid</dt>
        <dd>{totals ? <Money value={totals.paymentTotal} /> : '—'}</dd>
      </dl>
      <div>
        <RowActions type="supplier" record={supplier} labeled onChanged={onChanged} />
      </div>
    </div>
  );
}