import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { ErrorPanel, InlineAlert, LoadingRow } from '../ui/Feedback';
import IconButton from '../ui/IconButton';
import { Money } from '../ui/Money';

/**
 * The read-only Item Details panel. `selected` is false until a row has been chosen.
 * typeLocked is only known from GET /api/items/{id}, never from the list.
 */
export default function ItemDetails({ selected, item, loading, error, onRetry, onEdit, onDelete, onRemoveOverrides }) {
  if (!selected) return <p className="muted">Select an item to see its details.</p>;
  if (!item) return error ? <ErrorPanel error={error} onRetry={onRetry} /> : loading ? <LoadingRow /> : null;

  const isMrp = item.itemType === 'MRP';
  return (
    <div>
      <div className="detail-head">
        <div className="stack" style={{ gap: 6 }}>
          <div className="detail-title">{item.name}</div>
          <div>
            <Badge tone={isMrp ? 'blue' : 'purple'}>{isMrp ? 'MRP Item' : 'Net Rate Item'}</Badge>
          </div>
        </div>
      </div>

      <dl className="kv-grid">
        <dt>Unit</dt>
        <dd>{item.unit}</dd>
        <dt>Category</dt>
        <dd>{item.partCategory?.name ?? '—'}</dd>
        <dt>Compatible Bikes</dt>
        <dd>
          {item.bikes?.length > 0 ? (
            <div className="chip-list">
              {item.bikes.map((b) => <span key={b.id} className="chip">{b.name}</span>)}
            </div>
          ) : '—'}
        </dd>
        {isMrp ? (
          <>
            <dt>MRP</dt>
            <dd><Money value={item.mrp} /></dd>
            <dt>Default Discount</dt>
            <dd>{item.defaultDiscountPercent}%</dd>
            <dt>Default Rate</dt>
            <dd><Money value={item.defaultRate} /></dd>
          </>
        ) : (
          <>
            <dt>Default Net Rate</dt>
            <dd><Money value={item.defaultNetRate} /></dd>
          </>
        )}
      </dl>

      {item.typeLocked && (
        <div className="stack" style={{ gap: 10, marginTop: 14 }}>
          <InlineAlert tone="info">Item Type is locked because saved Party or Cash rates exist.</InlineAlert>
          <div>
            <Button size="sm" onClick={onRemoveOverrides}>Remove rate overrides</Button>
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <IconButton icon="edit" label="Edit" text="Edit" tone="edit" onClick={onEdit} />
        <IconButton icon="delete" label="Delete" text="Delete" tone="delete" onClick={onDelete} />
      </div>
    </div>
  );
}