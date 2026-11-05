import { useState } from 'react';
import { supplierPaymentApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Checkbox } from '../form/inputs';
import { useShowDeleted } from '../parties/useShowDeleted';
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

/**
 * Payment History of the selected supplier (SRS §14.2): its supplier payments from GET /api/supplier-payments, paged,
 * with New Payment (the supplier payment form with the supplier fixed). Edit, Delete and Restore come from each
 * payment's own server actions, so a deleted supplier's payments are locked.
 */
export default function SupplierPaymentsPanel({ supplier, onChanged, refreshKey = 0 }) {
  const toast = useToast();
  const list = useListQuery({ size: 10 });
  const [showDeleted, setShowDeleted] = useShowDeleted(supplier);
  const [paying, setPaying] = useState(false);

  const payments = useApi(
    (signal) => supplierPaymentApi.list(
      { supplierId: supplier.id, includeDeleted: showDeleted, page: list.page, size: list.size },
      { signal },
    ),
    [supplier.id, showDeleted, list.page, list.size, refreshKey],
  );

  const page = payments.data;
  const rows = page?.content ?? [];

  function handleChanged(change) {
    const leavesTheList = change.action === 'deleted' && !showDeleted;
    if (leavesTheList && rows.length === 1 && list.page > 0) list.setPage(list.page - 1);
    else payments.reload();
    onChanged?.(change);
  }

  function handlePaid(saved) {
    setPaying(false);
    toast.success(`Payment ${saved.paymentNo} recorded.`);
    payments.reload();
    onChanged?.({ action: 'created', record: saved });
  }

  function toggleShowDeleted(value) {
    setShowDeleted(value);
    list.setPage(0);
  }

  const columns = [
    { key: 'no', header: 'S.No.', width: 64, render: (p, index) => (page?.page ?? 0) * (page?.size ?? list.size) + index + 1 },
    { key: 'date', header: 'Date', render: (p) => <DateText value={p.paymentDate} /> },
    { key: 'paymentNo', header: 'Payment No.', render: (p) => <strong>{p.paymentNo}</strong> },
    {
      key: 'mode', header: 'Mode',
      render: (p) => <Badge tone={p.paymentMode === 'CASH' ? 'green' : 'blue'}>{p.paymentMode === 'CASH' ? 'Cash' : 'Online'}</Badge>,
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <Money value={p.amount} /> },
    {
      key: 'reference', header: 'Reference / Remarks', wrap: true,
      render: (p) => (p.referenceNo || p.remarks ? (
        <div>
          {p.referenceNo && <div>{p.referenceNo}</div>}
          {p.remarks && <div className="muted">{p.remarks}</div>}
        </div>
      ) : '—'),
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadges record={p} /> },
    { key: 'actions', header: 'Action', align: 'right', render: (p) => <RowActions type="supplierPayment" record={p} onChanged={handleChanged} /> },
  ];

  return (
    <Panel
      title="Payment History"
      icon="vouchers"
      flush
      actions={(
        <Button
          variant="primary"
          icon="plus"
          disabled={supplier.deleted}
          title={supplier.deleted ? 'This supplier is deleted. Restore it first.' : undefined}
          onClick={() => setPaying(true)}
        >
          New Payment
        </Button>
      )}
    >
      <div className="toolbar">
        <Checkbox checked={showDeleted} onChange={toggleShowDeleted} label="Show deleted records" />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={payments.loading}
        error={payments.error}
        onRetry={payments.reload}
        emptyTitle="No payments yet"
        emptyHint="Payments made to this supplier will appear here."
        caption="Payments to this supplier"
      />
      <Pagination
        page={page?.page ?? 0}
        size={page?.size ?? list.size}
        totalElements={page?.totalElements ?? 0}
        totalPages={page?.totalPages ?? 0}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
      />
      {paying && (
        <EditRecordModal
          type="supplierPayment"
          record={null}
          open
          preset={{ supplier: { id: supplier.id, label: supplier.name } }}
          onClose={() => setPaying(false)}
          onSaved={handlePaid}
        />
      )}
    </Panel>
  );
}