import { useState } from 'react';
import { voucherApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import EditRecordModal from '../records/EditRecordModal';
import RowActions from '../records/RowActions';
import DataTable from '../table/DataTable';
import Pagination from '../table/Pagination';
import { useListQuery } from '../table/useListQuery';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Panel } from '../ui/Cards';
import { DateText, Money } from '../ui/Money';
import StatusBadges from '../ui/StatusBadges';
import { useToast } from '../ui/Toast';
import HistoryToolbar from './HistoryToolbar';
import { useShowDeleted } from './useShowDeleted';

/**
 * Payment History tab of the Selected Party page (SRS §9.3): the party's payment vouchers from
 * GET /api/payment-vouchers, paged, with Record Payment (the voucher form with the party fixed).
 * Edit, Delete and Restore come from each voucher's own server actions.
 */
export default function PartyPaymentsTab({ party, onChanged, refreshKey = 0 }) {
  const toast = useToast();
  const list = useListQuery({ filters: { from: '', to: '' }, size: 10 });
  const [showDeleted, setShowDeleted] = useShowDeleted(party);
  const [recording, setRecording] = useState(false);
  const { from, to } = list.filters;

  const vouchers = useApi(
    (signal) => voucherApi.list(
      { partyId: party.id, from, to, includeDeleted: showDeleted, page: list.page, size: list.size },
      { signal },
    ),
    [party.id, from, to, showDeleted, list.page, list.size, refreshKey],
  );

  const page = vouchers.data;
  const rows = page?.content ?? [];

  function handleChanged(change) {
    const leavesTheList = change.action === 'deleted' && !showDeleted;
    if (leavesTheList && rows.length === 1 && list.page > 0) list.setPage(list.page - 1);
    else vouchers.reload();
    onChanged?.(change);
  }

  function handleRecorded(saved) {
    setRecording(false);
    toast.success(`Payment ${saved.voucherNo} recorded.`);
    vouchers.reload();
    onChanged?.({ action: 'created', record: saved });
  }

  const columns = [
    { key: 'date', header: 'Date', render: (v) => <DateText value={v.paymentDate} /> },
    { key: 'voucherNo', header: 'Voucher No.', render: (v) => <strong>{v.voucherNo}</strong> },
    {
      key: 'mode', header: 'Mode',
      render: (v) => <Badge tone={v.paymentMode === 'CASH' ? 'green' : 'blue'}>{v.paymentMode === 'CASH' ? 'Cash' : 'Online'}</Badge>,
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (v) => <Money value={v.amount} /> },
    { key: 'reference', header: 'Reference No.', render: (v) => v.referenceNo || '—' },
    { key: 'remarks', header: 'Remarks', wrap: true, render: (v) => v.remarks || '—' },
    { key: 'status', header: 'Status', render: (v) => <StatusBadges record={v} /> },
    { key: 'actions', header: 'Action', align: 'right', render: (v) => <RowActions type="voucher" record={v} onChanged={handleChanged} /> },
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
        actions={(
          <Button
            variant="primary"
            icon="vouchers"
            disabled={party.deleted}
            title={party.deleted ? 'This party is deleted. Restore it first.' : undefined}
            onClick={() => setRecording(true)}
          >
            Record Payment
          </Button>
        )}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={vouchers.loading}
        error={vouchers.error}
        onRetry={vouchers.reload}
        emptyTitle={list.isFiltered ? 'No payments match' : 'No payments yet'}
        emptyHint={list.isFiltered ? 'Try a different date range or clear it.' : 'Payments received from this party will appear here.'}
        caption="Payments of this party"
      />
      <Pagination
        page={page?.page ?? 0}
        size={page?.size ?? list.size}
        totalElements={page?.totalElements ?? 0}
        totalPages={page?.totalPages ?? 0}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
      />
      {recording && (
        <EditRecordModal
          type="voucher"
          record={null}
          open
          preset={{ party: { id: party.id, label: party.name } }}
          onClose={() => setRecording(false)}
          onSaved={handleRecorded}
        />
      )}
    </Panel>
  );
}