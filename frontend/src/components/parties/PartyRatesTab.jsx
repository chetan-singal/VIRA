import { useCallback, useEffect, useState } from 'react';
import { itemApi, partyApi, pricingApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { describeError, fieldErrorMap } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import { moneyOrNull } from '../../lib/forms';
import { Field, MoneyInput, PercentInput } from '../form/inputs';
import SearchSelect from '../form/SearchSelect';
import DataTable from '../table/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Panel } from '../ui/Cards';
import { ErrorPanel, InlineAlert, LoadingRow } from '../ui/Feedback';
import IconButton from '../ui/IconButton';
import { DateText, Money } from '../ui/Money';
import { useToast } from '../ui/Toast';

const DELETED_REASON = 'The party is deleted. Restore the party first.';
const SOURCE_LABELS = { ITEM_DEFAULT: 'Item default', PARTY_OVERRIDE: 'Saved for this party', CASH_OVERRIDE: 'Saved for Cash' };

/** The one input that sets a party's rate: a discount % for an MRP item, a net rate for a Net Rate item. */
function RateInput({ itemType, ...props }) {
  return itemType === 'MRP' ? <PercentInput {...props} /> : <MoneyInput {...props} />;
}

/** The value a rate starts from in its input: the discount of an MRP item, the net rate of a Net Rate item. */
const startValue = (itemType, discountPercent, netRate) => String((itemType === 'MRP' ? discountPercent : netRate) ?? '');

/**
 * Item Rates tab of the Selected Party page (SRS §9.5): the party's saved rates, edited in the row, and a check
 * that prices any item for this party and can save a rate for it. Only the discount (MRP item) or the net rate
 * (Net Rate item) is edited here; the MRP is changed on the Items screen. A deleted party's rates are read-only.
 */
export default function PartyRatesTab({ party, refreshKey = 0 }) {
  const toast = useToast();
  const locked = Boolean(party.deleted);
  const rates = useApi((signal) => partyApi.itemRates(party.id, { signal }), [party.id, refreshKey]);
  const [editing, setEditing] = useState(null); // { itemId, value, error, busy }
  const [picked, setPicked] = useState(null); // { id, label } chosen in Check an item
  const quote = useApi(
    (signal) => pricingApi.quote({ itemId: picked.id, customer: 'PARTY', partyId: party.id }, { signal }),
    [picked?.id, party.id, refreshKey],
    { enabled: Boolean(picked) },
  );
  const [draft, setDraft] = useState({ value: '', error: null, busy: false });

  const current = picked && quote.data && quote.data.itemId === picked.id ? quote.data : null;

  useEffect(() => {
    if (current) setDraft({ value: startValue(current.itemType, current.discountPercent, current.rate), error: null, busy: false });
  }, [current]);

  const searchItems = useCallback(async (q) => {
    const page = await itemApi.list({ q, size: 8, sort: 'name,asc' });
    return page.content.map((item) => ({ id: item.id, label: item.name, detail: `Default rate ${formatMoney(item.defaultRate)}` }));
  }, []);

  /** Saves one party rate. Returns null when it worked, otherwise the message to show under the input. */
  async function saveRate(itemId, itemType, value) {
    const newValue = moneyOrNull(value);
    if (newValue === null) return 'Enter a value.';
    try {
      await pricingApi.savePermanent({
        itemId,
        customer: 'PARTY',
        partyId: party.id,
        field: itemType === 'MRP' ? 'DISCOUNT_PERCENT' : 'NET_RATE',
        newValue,
      });
    } catch (error) {
      return fieldErrorMap(error).newValue ?? describeError(error);
    }
    toast.success(`Rate saved for ${party.name}.`);
    rates.reload();
    if (picked) quote.reload();
    return null;
  }

  function startEdit(row) {
    setEditing({ itemId: row.itemId, value: startValue(row.itemType, row.discountPercent, row.netRate), error: null, busy: false });
  }

  async function saveEdit(row) {
    setEditing((e) => ({ ...e, busy: true, error: null }));
    const message = await saveRate(row.itemId, row.itemType, editing.value);
    setEditing((e) => (message && e ? { ...e, busy: false, error: message } : null));
  }

  async function saveDraft() {
    setDraft((d) => ({ ...d, busy: true, error: null }));
    const message = await saveRate(current.itemId, current.itemType, draft.value);
    setDraft((d) => ({ ...d, busy: false, error: message }));
  }

  const isEditing = (row) => editing?.itemId === row.itemId;

  function editor(row) {
    return (
      <div className="rate-edit">
        <RateInput
          itemType={row.itemType}
          aria-label={row.itemType === 'MRP' ? `Party discount for ${row.itemName}` : `Party net rate for ${row.itemName}`}
          aria-invalid={editing.error ? 'true' : undefined}
          value={editing.value}
          onChange={(value) => setEditing((e) => ({ ...e, value, error: null }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') saveEdit(row);
            if (event.key === 'Escape') setEditing(null);
          }}
          autoFocus
        />
        {editing.error && <div className="field-error" role="alert">{editing.error}</div>}
        <div className="rate-edit-actions">
          <Button size="sm" variant="primary" busy={editing.busy} onClick={() => saveEdit(row)}>Save</Button>
          <Button size="sm" disabled={editing.busy} onClick={() => setEditing(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  const columns = [
    { key: 'item', header: 'Item', wrap: true, render: (row) => <strong>{row.itemName}</strong> },
    { key: 'unit', header: 'Unit', render: (row) => row.unit },
    {
      key: 'type', header: 'Type',
      render: (row) => <Badge tone={row.itemType === 'MRP' ? 'blue' : 'purple'}>{row.itemType === 'MRP' ? 'MRP' : 'Net Rate'}</Badge>,
    },
    { key: 'mrp', header: 'MRP', align: 'right', render: (row) => <Money value={row.mrp} /> },
    {
      key: 'discount', header: 'Party Discount %', align: 'right',
      render: (row) => {
        if (row.itemType !== 'MRP') return '—';
        return isEditing(row) ? editor(row) : `${row.discountPercent}%`;
      },
    },
    {
      key: 'netRate', header: 'Party Net Rate', align: 'right',
      render: (row) => {
        if (row.itemType !== 'NET_RATE') return '—';
        return isEditing(row) ? editor(row) : <Money value={row.netRate} />;
      },
    },
    { key: 'rate', header: 'Rate', align: 'right', render: (row) => <Money value={row.rate} /> },
    { key: 'updated', header: 'Updated', render: (row) => <DateText value={row.updatedAt} /> },
    {
      key: 'actions', header: 'Action', align: 'right',
      render: (row) => (isEditing(row) ? null : (
        <IconButton
          icon="edit"
          tone="edit"
          label={`Edit rate of ${row.itemName}`}
          disabled={locked}
          reason={DELETED_REASON}
          onClick={() => startEdit(row)}
        />
      )),
    },
  ];

  let check = null;
  if (picked) {
    if (current) {
      const isMrp = current.itemType === 'MRP';
      check = (
        <div className="rate-card">
          <div className="row-between">
            <strong>{picked.label}</strong>
            <Badge tone={isMrp ? 'blue' : 'purple'}>{isMrp ? 'MRP Item' : 'Net Rate Item'}</Badge>
          </div>
          <dl className="kv-grid">
            {isMrp ? (
              <>
                <dt>MRP</dt>
                <dd>
                  <Money value={current.mrp} />
                  <div className="field-hint" style={{ fontWeight: 400 }}>Change the MRP on the Items screen.</div>
                </dd>
                <dt>Party Discount</dt>
                <dd>{current.discountPercent}%</dd>
                <dt>Rate</dt>
                <dd><Money value={current.rate} /></dd>
              </>
            ) : (
              <>
                <dt>Net Rate</dt>
                <dd><Money value={current.rate} /></dd>
              </>
            )}
            <dt>Source</dt>
            <dd>{SOURCE_LABELS[current.source] ?? current.source}</dd>
          </dl>
          {!locked && (
            <div className="rate-save">
              <Field label={isMrp ? 'Party Discount %' : 'Party Net Rate'} error={draft.error} className="grow">
                {(p) => (
                  <RateInput
                    {...p}
                    itemType={current.itemType}
                    value={draft.value}
                    onChange={(value) => setDraft((d) => ({ ...d, value, error: null }))}
                    onKeyDown={(event) => { if (event.key === 'Enter') saveDraft(); }}
                  />
                )}
              </Field>
              <Button variant="primary" busy={draft.busy} onClick={saveDraft}>Save for this party</Button>
            </div>
          )}
        </div>
      );
    } else if (quote.error) {
      check = <ErrorPanel error={quote.error} onRetry={quote.reload} />;
    } else {
      check = <LoadingRow />;
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      {locked && (
        <InlineAlert tone="info">This party is deleted, so its saved rates are read-only. Restore the party to change them.</InlineAlert>
      )}

      <Panel title="Saved Party Rates" icon="rupee" flush>
        <div className="rates-table">
          <DataTable
            columns={columns}
            rows={rates.data ?? []}
            rowKey={(row) => row.itemId}
            loading={rates.loading}
            error={rates.error}
            onRetry={rates.reload}
            emptyTitle="No saved rates for this party"
            emptyHint="Check an item below and save a rate for this party."
            caption="Saved item rates of this party"
          />
        </div>
      </Panel>

      <Panel title="Check an Item" icon="search">
        <div className="stack" style={{ gap: 14 }}>
          <Field label="Item">
            {(p) => <SearchSelect id={p.id} value={picked} search={searchItems} placeholder="Search an item by name" onChange={setPicked} />}
          </Field>
          {check}
        </div>
      </Panel>

      <p className="muted" style={{ margin: 0 }}>
        Saving a party rate locks the item's type. Remove the rates on the Items screen to change it.
      </p>
    </div>
  );
}