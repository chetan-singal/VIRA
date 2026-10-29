import { Link } from 'react-router-dom';
import { dashboardApi, daybookApi } from '../api/endpoints';
import { Panel, StatCard } from '../components/ui/Cards';
import Badge from '../components/ui/Badge';
import { InlineAlert } from '../components/ui/Feedback';
import Icon from '../components/ui/Icon';
import { DateText, Money } from '../components/ui/Money';
import StatusBadges from '../components/ui/StatusBadges';
import DataTable from '../components/table/DataTable';
import RowActions from '../components/records/RowActions';
import { useApi } from '../hooks/useApi';
import { describeError } from '../lib/errors';
import { formatCount, greeting, todayIso } from '../lib/format';
import { useAppState } from '../state/AppState';

const QUICK = [
  { to: '/bills/new', label: 'New Bill', icon: 'newBill', tone: 'blue' },
  { to: '/parties', label: 'Parties', icon: 'parties', tone: 'green' },
  { to: '/items', label: 'Items', icon: 'items', tone: 'orange' },
  { to: '/payment-vouchers', label: 'Payment Vouchers', icon: 'vouchers', tone: 'purple' },
  { to: '/part-search', label: 'Part Search', icon: 'search', tone: 'pink' },
];

/** Home: quick access, today's summary and the latest bills. The first screen built on the Phase 7 foundation. */
export default function HomePage() {
  const { shop } = useAppState();
  const today = todayIso();
  const dashboard = useApi((signal) => dashboardApi.get({ period: 'TODAY', recent: 5 }, { signal }), []);
  const day = useApi((signal) => daybookApi.list({ from: today, to: today, size: 1 }, { signal }), [today]);

  const reloadAll = () => {
    dashboard.reload();
    day.reload();
  };
  const summary = day.data?.summary;
  const failure = dashboard.error || day.error;

  const columns = [
    { key: 'billNo', header: 'Bill No.', render: (b) => <strong>{b.billNo}</strong> },
    { key: 'billDate', header: 'Date', render: (b) => <DateText value={b.billDate} /> },
    { key: 'party', header: 'Customer / Party', wrap: true, render: (b) => (b.billType === 'PARTY' ? b.partyName : 'Cash') },
    {
      key: 'type', header: 'Type',
      render: (b) => <Badge tone={b.billType === 'PARTY' ? 'purple' : 'green'}>{b.billType === 'PARTY' ? 'Party' : 'Cash'}</Badge>,
    },
    { key: 'grandTotal', header: 'Amount', align: 'right', render: (b) => <Money value={b.grandTotal} /> },
    { key: 'status', header: 'Status', render: (b) => <StatusBadges record={b} /> },
    { key: 'actions', header: 'Action', align: 'right', render: (b) => <RowActions type="bill" record={b} onChanged={reloadAll} /> },
  ];

  return (
    <div className="stack" style={{ gap: 16 }}>
      {failure && (
        <InlineAlert tone="error" title="Some figures could not be loaded">{describeError(failure)}</InlineAlert>
      )}

      <section className="greeting">
        <div>
          <div className="greeting-hello">{greeting()}!</div>
          <div className="greeting-shop">{shop?.shopName ?? 'Welcome to VIRA'}</div>
          <div className="greeting-tag">Your counter, at a glance.</div>
        </div>
        <Icon name="gear" size={190} className="greeting-art" />
      </section>

      <nav className="quick-grid" aria-label="Quick access" style={{ margin: 0 }}>
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className={`quick-card tone-${q.tone}`}>
            <span className="tile-icon"><Icon name={q.icon} size={18} /></span>
            {q.label}
          </Link>
        ))}
      </nav>

      <div className="home-grid">
        <Panel
          title="Recent Bills"
          icon="receipt"
          flush
          actions={<Link to="/daybook" className="row" style={{ fontSize: 13, fontWeight: 600 }}>View All <Icon name="arrowRight" size={14} /></Link>}
        >
          <DataTable
            columns={columns}
            rows={dashboard.data?.recentBills ?? []}
            loading={dashboard.loading}
            error={dashboard.error}
            onRetry={dashboard.reload}
            emptyTitle="No bills yet"
            emptyHint="Bills you create will appear here."
            caption="Recent bills"
          />
        </Panel>

        <div className="side-stack">
          <Panel title="Today’s Summary" icon="dashboard" flush>
            <div className="summary-grid">
              <StatCard tone="blue" icon="receipt" label="Total Bills" value={formatCount(summary?.totalBills)} />
              <StatCard tone="green" icon="rupee" label="Total Sales" value={<Money value={summary?.totalSales} />} />
              <StatCard tone="orange" icon="cash" label="Cash Bill Sales" value={<Money value={summary?.cashBillSales} />} />
              <StatCard tone="purple" icon="parties" label="Party Sales" value={<Money value={summary?.partySales} />} />
            </div>
          </Panel>

          <Panel title="Shop Details" icon="shop" flush actions={<Link to="/shop-profile" style={{ fontSize: 13, fontWeight: 600 }}>Edit</Link>}>
            <dl className="kv">
              <dt>Name</dt><dd>{shop?.shopName ?? '—'}</dd>
              <dt>Phone</dt><dd>{shop?.phone || '—'}</dd>
              <dt>Address</dt>
              <dd>{[shop?.address, shop?.city, shop?.state, shop?.pinCode].filter(Boolean).join(', ') || '—'}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
