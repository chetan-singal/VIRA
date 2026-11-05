import { useState } from 'react';
import { daybookApi, voucherApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Select, TextInput } from '../form/inputs';
import BillViewDialog from '../records/BillViewDialog';
import RowActions from '../records/RowActions';
import DataTable from '../table/DataTable';
import { useListQuery } from '../table/useListQuery';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Panel } from '../ui/Cards';
import IconButton from '../ui/IconButton';
import { DateText, Money } from '../ui/Money';
import StatusBadges from '../ui/StatusBadges';
import HistoryToolbar from './HistoryToolbar';
import { fetchNewest, mergeTransactions } from './mergeTransactions';
import { useShowDeleted } from './useShowDeleted';

/** Each press of Load more shows this many more entries. */
const STEP = 20;
const NO_ROWS = { rows: [], total: 0 };
const TYPES = [
  { value: 'ALL', label: 'All entries' },
  { value: 'BILLS', label: 'Bills' },
  { value: 'PAYMENTS', label: 'Payments' },
];

function describeEntry(row) {
  if (row.kind === 'bill') return 'Sale Bill';
  return `Payment received (${row.record.paymentMode === 'CASH' ? 'Cash' : 'Online'})`;
}

/**
 * Transaction History tab (SRS §9.3, amendment A9): the party's bills and payment vouchers merged by date.
 * For a limit K (20, 40, 60 ...) it fetches the newest K bills and the newest K vouchers, merges them, newest
 * first, and shows the first K. The first K merged rows always lie inside the first K of each list, so no row
 * is missed or repeated. Load more raises K. Edit, Delete and Restore come from each record's server actions.
 */
export default function TransactionHistoryTab({ party, onChanged, refreshKey = 0 }) {
  const list = useListQuery({ filters: { from: '', to: '', type: 'ALL' }, size: STEP });
  const [showDeleted, setShowDeleted] = useShowDeleted(party);
  const [viewing, setViewing] = useState(null);
  const [growth, setGrowth] = useState({ key: '', steps: 1 });
  const { from, to, type } = list.filters;
  const keyword = list.params.q;

  // Any change of party, filter or search starts again at the first 20 entries.
  const filterKey = [party.id, from, to, type, keyword, showDeleted].join('|');
  const steps = growth.key === filterKey ? growth.steps : 1;
  const limit = STEP * steps;

  const history = useApi(
    async (signal) => {
      const filters = { partyId: party.id, from, to, keyword, includeDeleted: showDeleted };
      const [bills, vouchers] = await Promise.all([
        type === 'PAYMENTS'
          ? NO_ROWS
          : fetchNewest(async (paging) => (await daybookApi.list({ ...filters, ...paging }, { signal })).bills, limit),
        type === 'BILLS'
          ? NO_ROWS
          : fetchNewest((paging) => voucherApi.list({ ...filters, ...paging }, { signal }), limit),
      ]);
      return { bills, vouchers };
    },
    [party.id, from, to, keyword, showDeleted, type, limit, refreshKey],
  );

  const bills = history.data?.bills ?? NO_ROWS;
  const vouchers = history.data?.vouchers ?? NO_ROWS;
  const rows = mergeTransactions(bills.rows, vouchers.rows, limit);
  const hasMore = bills.rows.length + vouchers.rows.length > limit
    || bills.total > bills.rows.length
    || vouchers.total > vouchers.rows.length;

  function handleChanged(change) {
    history.reload();
    onChanged?.(change);
  }

  const columns = [
    { key: 'date', header: 'Date', render: (row) => <DateText value={row.date} /> },
    {
      key: 'type', header: 'Type',
      render: (row) => <Badge tone={row.kind === 'bill' ? 'blue' : 'green'}>{row.kind === 'bill' ? 'Bill' : 'Payment'}</Badge>,
    },
    { key: 'ref', header: 'Ref No.', render: (row) => <strong>{row.kind === 'bill' ? row.record.billNo : row.record.voucherNo}</strong> },
    { key: 'description', header: 'Description', wrap: true, render: describeEntry },
    {
      key: 'amount', header: 'Amount', align: 'right',
      render: (row) => (row.kind === 'bill'
        ? <Money value={row.record.grandTotal} className="amount-bill" />
        : <Money value={row.record.amount} className="amount-payment" />),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadges record={row.record} /> },
    {
      key: 'actions', header: 'Action', align: 'right',
      render: (row) => (row.kind === 'bill' ? (
        <RowActions type="bill" record={row.record} onChanged={handleChanged}>
          <IconButton icon="view" label={`View Bill ${row.record.billNo}`} onClick={() => setViewing(row.record)} />
        </RowActions>
      ) : (
        <RowActions type="voucher" record={row.record} onChanged={handleChanged} />
      )),
    },
  ];

  return (
    <Panel flush>
      <HistoryToolbar
        from={from}
        to={to}
        onFrom={(value) => list.setFilter('from', value)}
        onTo={(value) => list.setFilter('to', value)}
        showDeleted={showDeleted}
        onShowDeleted={setShowDeleted}
        onClear={list.clear}
        canClear={list.isFiltered}
      >
        <Select aria-label="Entry type" value={type} options={TYPES} onChange={(e) => list.setFilter('type', e.target.value)} />
        <TextInput
          className="toolbar-search"
          aria-label="Search transactions"
          placeholder="Search by number, reference or item"
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
        />
      </HistoryToolbar>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        loading={history.loading}
        error={history.error}
        onRetry={history.reload}
        emptyTitle={list.isFiltered ? 'No transactions match' : 'No transactions yet'}
        emptyHint={list.isFiltered ? 'Try different dates or a different search, or clear them.' : 'Bills and payments for this party will appear here.'}
        caption="Transaction history of this party"
      />
      {rows.length > 0 && (
        <div className="history-foot">
          <span>Showing {rows.length} {rows.length === 1 ? 'entry' : 'entries'}</span>
          {hasMore && (
            <Button size="sm" busy={history.loading} onClick={() => setGrowth({ key: filterKey, steps: steps + 1 })}>
              Load more
            </Button>
          )}
        </div>
      )}
      {viewing && <BillViewDialog billId={viewing.id} billNo={viewing.billNo} onClose={() => setViewing(null)} />}
    </Panel>
  );
}