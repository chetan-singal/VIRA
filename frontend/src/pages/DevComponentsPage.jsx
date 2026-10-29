import { useMemo, useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Panel, StatCard } from '../components/ui/Cards';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import DeletedBanner from '../components/ui/DeletedBanner';
import { InlineAlert } from '../components/ui/Feedback';
import { Balance, DateText, Money } from '../components/ui/Money';
import Modal from '../components/ui/Modal';
import StatusBadges from '../components/ui/StatusBadges';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import DataTable from '../components/table/DataTable';
import RowActions from '../components/records/RowActions';
import { RECORD_TYPES } from '../components/records/recordTypes';

/*
 * Phase 7 "done when": the shared Edit, Delete and Restore components open from a stub row in all three
 * states (active, deleted, just-restored). Everything here runs on in-memory stub data: nothing is sent to
 * the backend, so it is safe to click anything. Reachable at /#/dev/components in development only.
 */

const NOW = '2026-10-25T11:30:00';
const ACTIVE = { canEdit: true, canDelete: true, canRestore: false, blockedReason: null };
const DELETED = { canEdit: false, canDelete: false, canRestore: true, blockedReason: null };
const LOCKED = { canEdit: false, canDelete: false, canRestore: false, blockedReason: 'The party is deleted. Restore the party first.' };

const PARTIES = [
  { id: 1, label: 'Ramesh Motors', detail: 'Rajgarh' },
  { id: 2, label: 'Suresh Spares', detail: 'Jaipur' },
  { id: 3, label: 'ADS Rajgarh', detail: 'Alwar' },
];
const SUPPLIERS = [
  { id: 1, label: 'Tata Auto Parts', detail: 'Delhi' },
  { id: 2, label: 'Hero Genuine Parts', detail: 'Ludhiana' },
];
const filter = (list) => async (q) => list.filter((x) => x.label.toLowerCase().includes(q.toLowerCase()));

function seed() {
  const bill = (id, extra) => ({ id, billNo: `B-${1000 + id}`, billType: 'CASH', partyName: null, grandTotal: 450, edited: false, deleted: false, actions: ACTIVE, ...extra });
  const voucher = (id, extra) => ({ id, voucherNo: `V-${id}`, partyId: 1, partyName: 'Ramesh Motors', paymentDate: '2026-10-24', amount: 300, paymentMode: 'CASH', referenceNo: null, remarks: null, edited: false, deleted: false, actions: ACTIVE, ...extra });
  const payment = (id, extra) => ({ id, paymentNo: `SP-${id}`, supplierId: 1, supplierName: 'Tata Auto Parts', paymentDate: '2026-10-24', amount: 1500, paymentMode: 'ONLINE', referenceNo: 'UTR1', remarks: null, edited: false, deleted: false, actions: ACTIVE, ...extra });
  const party = (id, extra) => ({ id, name: `Party ${id}`, phone: '9876543210', city: 'Rajgarh', currentBalance: 0, deleted: false, ...extra });
  const supplier = (id, extra) => ({ id, name: `Supplier ${id}`, phone: '9811122233', city: 'Delhi', deleted: false, ...extra });
  return [
    { key: 'b1', type: 'bill', label: 'Active', record: bill(1) },
    { key: 'b2', type: 'bill', label: 'Deleted', record: bill(2, { billType: 'PARTY', partyName: 'Ramesh Motors', grandTotal: 1250, edited: true, lastEditedAt: NOW, deleted: true, deletedAt: NOW, actions: DELETED }) },
    { key: 'b3', type: 'bill', label: 'Locked (party deleted)', record: bill(3, { billType: 'PARTY', partyName: 'Old Party', grandTotal: 800, actions: LOCKED }) },
    { key: 'v1', type: 'voucher', label: 'Active', record: voucher(1) },
    { key: 'v2', type: 'voucher', label: 'Deleted', record: voucher(2, { amount: 520, edited: true, lastEditedAt: NOW, deleted: true, deletedAt: NOW, actions: DELETED }) },
    { key: 'v3', type: 'voucher', label: 'Locked (party deleted)', record: voucher(3, { partyName: 'Old Party', actions: LOCKED }) },
    { key: 'p1', type: 'supplierPayment', label: 'Active', record: payment(1) },
    { key: 'p2', type: 'supplierPayment', label: 'Deleted', record: payment(2, { deleted: true, deletedAt: NOW, actions: DELETED }) },
    { key: 'p3', type: 'supplierPayment', label: 'Locked (supplier deleted)', record: payment(3, { actions: { ...LOCKED, blockedReason: 'The supplier is deleted. Restore the supplier first.' } }) },
    { key: 'y1', type: 'party', label: 'Active, balance ₹0', record: party(1) },
    { key: 'y2', type: 'party', label: 'Active, delete blocked (₹650 due)', record: party(2, { currentBalance: 650 }) },
    { key: 'y3', type: 'party', label: 'Deleted', record: party(3, { deleted: true, deletedAt: NOW }) },
    { key: 's1', type: 'supplier', label: 'Active', record: supplier(1) },
    { key: 's2', type: 'supplier', label: 'Deleted', record: supplier(2, { deleted: true, deletedAt: NOW }) },
  ];
}

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

function describe(type, r) {
  if (type === 'bill') return { detail: r.billType === 'PARTY' ? r.partyName : 'Cash', value: <Money value={r.grandTotal} /> };
  if (type === 'voucher') return { detail: r.partyName, value: <Money value={r.amount} /> };
  if (type === 'supplierPayment') return { detail: r.supplierName, value: <Money value={r.amount} /> };
  if (type === 'party') return { detail: r.city, value: <Balance value={r.currentBalance} /> };
  return { detail: r.city, value: '—' };
}

export default function DevComponentsPage() {
  const toast = useToast();
  const [rows, setRows] = useState(seed);
  const [tab, setTab] = useState('actions');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const patch = (key, change) => setRows((list) => list.map((row) => (row.key === key ? { ...row, record: { ...row.record, ...change } } : row)));

  // Stub operations: same shape as the real ones in recordTypes.js, but they only change local state.
  const opsFor = useMemo(
    () => (row) => ({
      save: async (record, payload) => {
        await delay();
        const merged = { ...record, ...payload, edited: true, lastEditedAt: NOW };
        patch(row.key, merged);
        return merged;
      },
      remove: async () => {
        await delay();
        patch(row.key, { deleted: true, deletedAt: NOW, actions: DELETED });
      },
      restore: async () => {
        await delay();
        patch(row.key, { deleted: false, deletedAt: null, actions: ACTIVE, justRestored: true });
      },
      lookupParties: filter(PARTIES),
      lookupSuppliers: filter(SUPPLIERS),
    }),
    [],
  );

  const columns = [
    { key: 'type', header: 'Record type', render: (r) => <span className="type-cell">{RECORD_TYPES[r.type].label}</span> },
    { key: 'ref', header: 'Reference', render: (r) => RECORD_TYPES[r.type].numberOf(r.record) },
    { key: 'detail', header: 'Detail', render: (r) => describe(r.type, r.record).detail },
    { key: 'value', header: 'Amount / Balance', align: 'right', render: (r) => describe(r.type, r.record).value },
    { key: 'state', header: 'Starting state', render: (r) => <span className="state-cell">{r.label}</span> },
    { key: 'status', header: 'Status', render: (r) => (
      <span className="row">
        <StatusBadges record={r.record} />
        {r.record.justRestored && <Badge tone="green">Just restored</Badge>}
      </span>
    ) },
    { key: 'actions', header: 'Action', align: 'right', render: (r) => <RowActions type={r.type} record={r.record} ops={opsFor(r)} onChanged={() => {}} /> },
  ];

  return (
    <div className="gallery">
      <InlineAlert tone="info" title="Stub data only">
        Nothing on this page reaches the backend. Edit, delete and restore the rows below to see every state of the shared control;
        the Bill row opens a route instead of a modal because bills are edited on the New Bill screen.
      </InlineAlert>

      <Tabs active={tab} onChange={setTab} label="Gallery sections" tabs={[{ key: 'actions', label: 'Row actions' }, { key: 'parts', label: 'Building blocks' }]} />

      {tab === 'actions' && (
        <Panel title="Edit · Delete · Restore, per record type" flush actions={<Button size="sm" icon="refresh" onClick={() => setRows(seed())}>Reset stub data</Button>}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.key}
            rowClassName={(r) => (r.record.justRestored ? 'just-restored' : undefined)}
            caption="Row-action control in every state"
          />
        </Panel>
      )}

      {tab === 'parts' && (
        <>
          <Panel title="Badges, money and dates">
            <div className="gallery-row">
              <StatusBadges edited deleted lastEditedAt={NOW} deletedAt={NOW} />
              <StatusBadges edited lastEditedAt={NOW} />
              <StatusBadges deleted deletedAt={NOW} />
              <Badge tone="purple">Party</Badge><Badge tone="green">Cash</Badge>
              <Money value={1234567.5} /><Money value={-250} /><Balance value={650} /><Balance value={-450} /><Balance value={0} />
              <DateText value="2026-10-25" /><DateText value={NOW} withTime />
            </div>
          </Panel>
          <Panel title="Summary tiles">
            <div className="summary-grid" style={{ padding: 0, gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
              <StatCard tone="blue" icon="receipt" label="Total Sales" value={<Money value={785430} />} />
              <StatCard tone="green" icon="cash" label="Cash Bill Sales" value={<Money value={496270} />} />
              <StatCard tone="orange" icon="parties" label="Party Sales" value={<Money value={289160} />} />
              <StatCard tone="purple" icon="vouchers" label="Payments Received" value={<Money value={246500} />} />
              <StatCard tone="red" icon="warning" label="Cash in Hand" value={<Money value={-1200} />} hint="Negative balance" />
            </div>
          </Panel>
          <DeletedBanner label="party" deletedAt={NOW} onRestore={() => toast.success('Party restored (stub)')} />
          <Panel title="Dialogs and toasts">
            <div className="gallery-row">
              <Button variant="primary" onClick={() => setModalOpen(true)}>Open modal</Button>
              <Button variant="danger" icon="delete" onClick={() => setConfirmOpen(true)}>Open delete confirmation</Button>
              <Button onClick={() => toast.success('Bill B-1250 updated')}>Success toast</Button>
              <Button onClick={() => toast.error('Could not save: the party is deleted.')}>Error toast</Button>
              <Button onClick={() => toast.info('Heads up: this is only a stub.')}>Info toast</Button>
            </div>
          </Panel>
        </>
      )}

      <Modal open={modalOpen} title="Sample modal" subtitle="Esc closes it; Tab stays inside." onClose={() => setModalOpen(false)} footer={<Button variant="primary" onClick={() => setModalOpen(false)}>Done</Button>}>
        <p>Focus moved into the dialog when it opened and returns to the button that opened it when it closes.</p>
      </Modal>
      <ConfirmDialog open={confirmOpen} tone="danger" title="Delete Bill B-1250?" confirmLabel="Delete Bill" onCancel={() => setConfirmOpen(false)} onConfirm={async () => { await delay(); setConfirmOpen(false); toast.success('Bill B-1250 deleted'); }}>
        <p>This is the shape every delete confirmation takes.</p>
      </ConfirmDialog>
    </div>
  );
}
