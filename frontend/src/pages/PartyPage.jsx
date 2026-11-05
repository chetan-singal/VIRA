import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { daybookApi, partyApi, voucherApi } from '../api/endpoints';
import PartyBalanceCard from '../components/parties/PartyBalanceCard';
import PartyInfoCard from '../components/parties/PartyInfoCard';
import PartyKpiTiles from '../components/parties/PartyKpiTiles';
import PartyQuickActions from '../components/parties/PartyQuickActions';
import PartyBillsTab from '../components/parties/PartyBillsTab';
import PartyPaymentsTab from '../components/parties/PartyPaymentsTab';
import PartyRatesTab from '../components/parties/PartyRatesTab';
import TransactionHistoryTab from '../components/parties/TransactionHistoryTab';
import EditRecordModal from '../components/records/EditRecordModal';
import RowActions from '../components/records/RowActions';
import Button from '../components/ui/Button';
import { Panel } from '../components/ui/Cards';
import DeletedBanner from '../components/ui/DeletedBanner';
import { EmptyState, ErrorPanel, InlineAlert, LoadingRow } from '../components/ui/Feedback';
import Icon from '../components/ui/Icon';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../layout/PageTitle';
import { formatMoney, isZeroMoney } from '../lib/format';

const TABS = [
  { key: 'history', label: 'Transaction History' },
  { key: 'bills', label: 'Bills' },
  { key: 'payments', label: 'Payment History' },
  { key: 'rates', label: 'Item Rates' },
];

function BackLink() {
  return (
    <Link className="btn btn-ghost" to="/parties">
      <Icon name="chevronLeft" size={16} />
      Back to Parties
    </Link>
  );
}

/** The Selected Party page, frame only: header, four tiles, side cards and the tab bar (SRS §9.3). */
export default function PartyPage() {
  const { id } = useParams();
  const toast = useToast();
  const party = useApi((signal) => partyApi.get(id, { signal }), [id]);
  const summary = useApi((signal) => partyApi.balanceSummary(id, { signal }), [id]);
  const bills = useApi((signal) => daybookApi.list({ partyId: id, size: 1 }, { signal }), [id]);
  const payments = useApi((signal) => voucherApi.list({ partyId: id, size: 1 }, { signal }), [id]);
  const [tab, setTab] = useState('history');
  const [recording, setRecording] = useState(false);
  const [version, setVersion] = useState(0);

  const current = party.data && String(party.data.id) === String(id) ? party.data : null;
  usePageTitle(current?.name, 'Party details');

  function reloadAll() {
    party.reload();
    summary.reload();
    bills.reload();
    payments.reload();
    setVersion((v) => v + 1);
  }

  if (!current) {
    if (party.error?.status === 404) {
      return (
        <Panel>
          <EmptyState icon="parties" title="Party not found">
            <p>This party does not exist, or the link is wrong.</p>
            <BackLink />
          </EmptyState>
        </Panel>
      );
    }
    if (party.error) return <ErrorPanel error={party.error} onRetry={party.reload} />;
    return <LoadingRow />;
  }

  const balance = Number(current.currentBalance);
  const hasBalance = !current.deleted && !isZeroMoney(balance);
  const loadError = summary.error || bills.error || payments.error;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row-between">
        <BackLink />
        <RowActions type="party" record={current} labeled onChanged={reloadAll} />
      </div>

      {hasBalance && (
        <p className="muted" style={{ margin: 0 }}>
          Delete is unavailable: balance {formatMoney(Math.abs(balance))} {balance > 0 ? 'due' : 'advance'}. A party can be deleted only at ₹0.
        </p>
      )}
      {current.deleted && <DeletedBanner label="party" deletedAt={current.deletedAt} />}

      {loadError && (
        <InlineAlert tone="warning" title="Some figures could not be loaded">
          <Button size="sm" onClick={reloadAll}>Try again</Button>
        </InlineAlert>
      )}

      <PartyKpiTiles
        party={current}
        summary={summary.data}
        billCount={bills.data?.summary?.totalBills}
        paymentCount={payments.data?.totalElements}
        lastBill={bills.data?.bills?.content?.[0]}
        lastPayment={payments.data?.content?.[0]}
      />

      <div className="split">
        <div className="stack" style={{ gap: 16 }}>
          <Tabs label="Party sections" tabs={TABS} active={tab} onChange={setTab} />
          {tab === 'history' && <TransactionHistoryTab key={current.id} party={current} onChanged={reloadAll} refreshKey={version} />}
          {tab === 'bills' && <PartyBillsTab key={current.id} party={current} onChanged={reloadAll} refreshKey={version} />}
          {tab === 'payments' && <PartyPaymentsTab key={current.id} party={current} onChanged={reloadAll} refreshKey={version} />}
          {tab === 'rates' && <PartyRatesTab key={current.id} party={current} refreshKey={version} />}
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <PartyInfoCard party={current} />
          <PartyQuickActions party={current} onRecordPayment={() => setRecording(true)} onViewRates={() => setTab('rates')} />
          <PartyBalanceCard summary={summary.data} error={summary.error} />
        </div>
      </div>

      {recording && (
        <EditRecordModal
          type="voucher"
          record={null}
          open
          preset={{ party: { id: current.id, label: current.name } }}
          onClose={() => setRecording(false)}
          onSaved={(saved) => {
            setRecording(false);
            toast.success(`Payment ${saved.voucherNo} recorded.`);
            reloadAll();
          }}
        />
      )}
    </div>
  );
}