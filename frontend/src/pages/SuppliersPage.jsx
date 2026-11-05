import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supplierApi } from '../api/endpoints';
import { TextInput } from '../components/form/inputs';
import EditRecordModal from '../components/records/EditRecordModal';
import RowActions from '../components/records/RowActions';
import SupplierDetails from '../components/suppliers/SupplierDetails';
import SupplierPaymentsPanel from '../components/suppliers/SupplierPaymentsPanel';
import DataTable from '../components/table/DataTable';
import Pagination from '../components/table/Pagination';
import { useListQuery } from '../components/table/useListQuery';
import Button from '../components/ui/Button';
import { Panel, StatCard } from '../components/ui/Cards';
import { InlineAlert } from '../components/ui/Feedback';
import { DateText, Money } from '../components/ui/Money';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../layout/PageTitle';
import { todayIso } from '../lib/format';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'deleted', label: 'Deleted' },
];

/** The three tiles above the Suppliers list, from GET /api/suppliers/summary (SRS §14, A11). */
function SupplierTiles({ summary, error }) {
  if (error) return <InlineAlert tone="warning">The supplier totals could not be loaded.</InlineAlert>;
  if (!summary) return null;
  return (
    <div className="tile-row">
      <StatCard tone="blue" icon="suppliers" label="Total Suppliers" value={summary.totalSuppliers} />
      <StatCard
        tone="orange"
        icon="vouchers"
        label="Total Payments to Suppliers"
        value={<Money value={summary.paymentTotal} />}
        hint={`${summary.paymentCount} ${summary.paymentCount === 1 ? 'payment' : 'payments'}`}
      />
      <StatCard tone="green" icon="cash" label="Cash in Hand" value={<Money value={summary.cashInHand} />} hint={<>As of <DateText value={todayIso()} /></>} />
    </div>
  );
}

/**
 * Suppliers: Active and Deleted lists, the selected supplier's details and its Payment History (SRS §14).
 * One page for both routes: /suppliers and /suppliers/:id (a row click only changes the id).
 */
export default function SuppliersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const list = useListQuery({ filters: { deleted: false }, clearable: [], size: 10, sort: 'name,asc' });
  const showingDeleted = list.filters.deleted === true;
  const suppliers = useApi((signal) => supplierApi.list(list.params, { signal }), [list.params]);
  const tiles = useApi((signal) => supplierApi.summary({ signal }), []);
  const details = useApi((signal) => supplierApi.get(id, { signal }), [id], { enabled: Boolean(id) });
  const totals = useApi(
    (signal) => supplierApi.summaryFor(id, { signal }).then((t) => ({ ...t, supplierId: String(id) })),
    [id],
    { enabled: Boolean(id) },
  );
  const [adding, setAdding] = useState(false);
  const [version, setVersion] = useState(0);

  const page = suppliers.data;
  const rows = page?.content ?? [];
  const current = details.data && String(details.data.id) === String(id) ? details.data : null;
  const currentTotals = totals.data && totals.data.supplierId === String(id) ? totals.data : null;
  usePageTitle(current?.name, 'Supplier details');

  function reloadSelected() {
    tiles.reload();
    details.reload();
    totals.reload();
    setVersion((v) => v + 1);
  }

  function handleChanged(change) {
    reloadSelected();
    const leavesThisTab = change.action === 'deleted' || change.action === 'restored';
    if (leavesThisTab && rows.length === 1 && list.page > 0) list.setPage(list.page - 1);
    else suppliers.reload();
  }

  function handlePaymentChanged() {
    tiles.reload();
    totals.reload();
  }

  function handleCreated(saved) {
    setAdding(false);
    toast.success(`Supplier ${saved.name} added.`);
    tiles.reload();
    if (showingDeleted) list.setFilter('deleted', false);
    else suppliers.reload();
  }

  const columns = [
    { key: 'no', header: 'S.No.', width: 64, render: (row, index) => (page?.page ?? 0) * (page?.size ?? list.size) + index + 1 },
    {
      key: 'name', header: 'Supplier Name', wrap: true,
      render: (row) => <Link to={`/suppliers/${row.id}`} onClick={(e) => e.stopPropagation()}><strong>{row.name}</strong></Link>,
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
    { key: 'city', header: 'City', render: (row) => row.city || '—' },
    { key: 'actions', header: 'Action', align: 'right', render: (row) => <RowActions type="supplier" record={row} onChanged={handleChanged} /> },
  ];

  const addButton = <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>New Supplier</Button>;
  let emptyTitle = 'No suppliers yet';
  let emptyHint = addButton;
  if (list.isFiltered) {
    emptyTitle = 'No suppliers match';
    emptyHint = 'Try a different search or clear it.';
  } else if (showingDeleted) {
    emptyTitle = 'No deleted suppliers';
    emptyHint = 'A deleted supplier stays here and can be restored.';
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row-between">
        <span className="muted">A supplier carries no balance, so it can be deleted at any time and restored later.</span>
        {addButton}
      </div>

      <SupplierTiles summary={tiles.data} error={tiles.error} />

      <div className="split">
        <div className="stack" style={{ gap: 16 }}>
          <Tabs
            label="Supplier lists"
            tabs={TABS}
            active={showingDeleted ? 'deleted' : 'active'}
            onChange={(key) => list.setFilter('deleted', key === 'deleted')}
          />
          <Panel flush>
            <div className="toolbar">
              <TextInput
                className="grow"
                aria-label="Search suppliers"
                placeholder="Search by name, city or phone"
                value={list.search}
                onChange={(e) => list.setSearch(e.target.value)}
              />
              <Button onClick={list.clear} disabled={!list.isFiltered}>Clear</Button>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              loading={suppliers.loading}
              error={suppliers.error}
              onRetry={suppliers.reload}
              onRowClick={(row) => navigate(`/suppliers/${row.id}`)}
              selectedKey={id ? Number(id) : undefined}
              emptyTitle={emptyTitle}
              emptyHint={emptyHint}
              caption={showingDeleted ? 'Deleted suppliers' : 'Suppliers'}
            />
            <Pagination
              page={page?.page ?? 0}
              size={page?.size ?? list.size}
              totalElements={page?.totalElements ?? 0}
              totalPages={page?.totalPages ?? 0}
              onPageChange={list.setPage}
              onSizeChange={list.setSize}
            />
          </Panel>
        </div>

        <Panel title="Supplier Details" icon="suppliers">
          <SupplierDetails
            selected={Boolean(id)}
            supplier={current}
            loading={details.loading}
            error={details.error}
            onRetry={details.reload}
            totals={currentTotals}
            onChanged={handleChanged}
          />
        </Panel>
      </div>

      {current && <SupplierPaymentsPanel key={current.id} supplier={current} onChanged={handlePaymentChanged} refreshKey={version} />}

      {adding && <EditRecordModal type="supplier" record={null} open onClose={() => setAdding(false)} onSaved={handleCreated} />}
    </div>
  );
} 