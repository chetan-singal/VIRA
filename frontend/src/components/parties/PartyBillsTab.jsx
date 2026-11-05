import { useState } from 'react';
import { daybookApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { formatCount } from '../../lib/format';
import BillViewDialog from '../records/BillViewDialog';
import RowActions from '../records/RowActions';
import DataTable from '../table/DataTable';
import Pagination from '../table/Pagination';
import { useListQuery } from '../table/useListQuery';
import { Panel } from '../ui/Cards';
import IconButton from '../ui/IconButton';
import { DateText, Money } from '../ui/Money';
import StatusBadges from '../ui/StatusBadges';
import HistoryToolbar from './HistoryToolbar';
import { useShowDeleted } from './useShowDeleted';

/**
 * Bills tab of the Selected Party page (SRS §9.3): the party's bills from GET /api/daybook, paged.
 * Edit, Delete and Restore come from each bill's own server actions, so a deleted party's bills are locked
 * while View stays available. onChanged tells the page to reload its tiles and cards; refreshKey reloads this tab.
 */
export default function PartyBillsTab({ party, onChanged, refreshKey = 0 }) {
  const list = useListQuery({ filters: { from: '', to: '' }, size: 10 });
  const [showDeleted, setShowDeleted] = useShowDeleted(party);
  const [viewing, setViewing] = useState(null);
  const { from, to } = list.filters;

  const bills = useApi(
    (signal) => daybookApi.list(
      { partyId: party.id, from, to, includeDeleted: showDeleted, page: list.page, size: list.size },
      { signal },
    ),
    [party.id, from, to, showDeleted, list.page, list.size, refreshKey],
  );

  const page = bills.data?.bills;
  const summary = bills.data?.summary;
  const rows = page?.content ?? [];

  function handleChanged(change) {
    const leavesTheList = change.action === 'deleted' && !showDeleted;
    if (leavesTheList && rows.length === 1 && list.page > 0) list.setPage(list.page - 1);
    else bills.reload();
    onChanged?.(change);
  }

  const columns = [
    { key: 'date', header: 'Date', render: (bill) => <DateText value={bill.billDate} /> },
    { key: 'billNo', header: 'Bill No.', render: (bill) => <strong>{bill.billNo}</strong> },
    { key: 'amount', header: 'Amount', align: 'right', render: (bill) => <Money value={bill.grandTotal} /> },
    { key: 'status', header: 'Status', render: (bill) => <StatusBadges record={bill} /> },
    {
      key: 'actions', header: 'Action', align: 'right',
      render: (bill) => (
        <RowActions type="bill" record={bill} onChanged={handleChanged}>
          <IconButton icon="view" label={`View Bill ${bill.billNo}`} onClick={() => setViewing(bill)} />
        </RowActions>
      ),
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
      />
      {summary && (
        <p className="tab-note">
          {formatCount(summary.totalBills)} {summary.totalBills === 1 ? 'bill' : 'bills'} · Party Sales <Money value={summary.partySales} />
          {showDeleted && ' · Deleted bills are not counted.'}
        </p>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        loading={bills.loading}
        error={bills.error}
        onRetry={bills.reload}
        emptyTitle={list.isFiltered ? 'No bills match' : 'No bills yet'}
        emptyHint={list.isFiltered ? 'Try a different date range or clear it.' : 'Bills made for this party will appear here.'}
        caption="Bills of this party"
      />
      <Pagination
        page={page?.page ?? 0}
        size={page?.size ?? list.size}
        totalElements={page?.totalElements ?? 0}
        totalPages={page?.totalPages ?? 0}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
      />
      {viewing && <BillViewDialog billId={viewing.id} billNo={viewing.billNo} onClose={() => setViewing(null)} />}
    </Panel>
  );
}