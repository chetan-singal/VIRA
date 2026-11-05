import { billApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import DataTable from '../table/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { ErrorPanel, LoadingRow } from '../ui/Feedback';
import Modal from '../ui/Modal';
import { Balance, DateText, Money } from '../ui/Money';
import StatusBadges from '../ui/StatusBadges';

const NONE = '—';

/* SRS §10.4 columns. A Net Rate item has no MRP or discount: its rate is shown in the MRP column. */
const COLUMNS = [
  { key: 'no', header: 'S.No.', width: 56, render: (line, index) => line.lineNo ?? index + 1 },
  { key: 'item', header: 'Item Name', wrap: true, render: (line) => line.itemName },
  { key: 'unit', header: 'Unit', render: (line) => line.unit },
  { key: 'mrp', header: 'MRP', align: 'right', render: (line) => <Money value={line.itemType === 'NET_RATE' ? line.rate : line.mrp} /> },
  { key: 'disc', header: 'Disc. (%)', align: 'right', render: (line) => (line.itemType === 'NET_RATE' ? NONE : line.discountPercent ?? NONE) },
  { key: 'rate', header: 'Rate', align: 'right', render: (line) => <Money value={line.rate} /> },
  { key: 'qty', header: 'Qty', align: 'right', render: (line) => line.qty },
  { key: 'amount', header: 'Amount', align: 'right', render: (line) => <Money value={line.amount} /> },
];

/**
 * The read-only Bill View dialog: opened by View on a bill row, loads GET /api/bills/{id}.
 * billNo is only used for the title while the bill is still loading. Phase 10 reuses it in the Daybook
 * and Phase 11 adds Print.
 */
export default function BillViewDialog({ billId, billNo, open = true, onClose }) {
  const loaded = useApi((signal) => billApi.get(billId, { signal }), [billId], { enabled: open && billId != null });
  const bill = loaded.data && loaded.data.id === billId ? loaded.data : null;
  const isParty = bill?.billType === 'PARTY';

  const subtitle = bill && (
    <span className="status-badges">
      <Badge tone={isParty ? 'purple' : 'green'}>{isParty ? 'Party' : 'Cash'}</Badge>
      <StatusBadges record={bill} />
    </span>
  );

  let body;
  if (bill) {
    body = (
      <div className="stack" style={{ gap: 14 }}>
        <dl className="kv-grid">
          <dt>Bill Date</dt>
          <dd><DateText value={bill.billDate} /></dd>
          {isParty && (
            <>
              <dt>Party</dt>
              <dd>{bill.partyName}</dd>
            </>
          )}
          {bill.edited && bill.lastEditedAt && (
            <>
              <dt>Revised on</dt>
              <dd><DateText value={bill.lastEditedAt} withTime /></dd>
            </>
          )}
          {bill.deleted && bill.deletedAt && (
            <>
              <dt>Deleted on</dt>
              <dd><DateText value={bill.deletedAt} withTime /></dd>
            </>
          )}
        </dl>

        <div className="bill-lines">
          <DataTable columns={COLUMNS} rows={bill.lines} rowKey={(line) => line.lineNo} dense caption="Bill lines" />
        </div>

        <dl className="bill-totals">
          <dt>Net Amount</dt>
          <dd><Money value={bill.netAmount} /></dd>
          <dt>Round Off</dt>
          <dd><Money value={bill.roundOff} /></dd>
          <dt className="grand">Grand Total</dt>
          <dd className="grand"><Money value={bill.grandTotal} /></dd>
          {isParty && (
            <>
              <dt>Previous Balance</dt>
              <dd><Balance value={bill.previousBalance} showDue /></dd>
              <dt>Total Due</dt>
              <dd><Balance value={bill.totalDue} showDue /></dd>
            </>
          )}
        </dl>
      </div>
    );
  } else if (loaded.error) {
    body = <ErrorPanel error={loaded.error} onRetry={loaded.reload} />;
  } else {
    body = <LoadingRow />;
  }

  return (
    <Modal
      open={open}
      title={`Bill ${bill?.billNo ?? billNo ?? ''}`.trim()}
      subtitle={subtitle || undefined}
      size="lg"
      onClose={onClose}
      footer={<Button data-autofocus onClick={onClose}>Close</Button>}
    >
      {body}
    </Modal>
  );
}