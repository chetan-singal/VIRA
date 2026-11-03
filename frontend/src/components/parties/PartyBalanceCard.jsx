import { Panel } from '../ui/Cards';
import { InlineAlert, LoadingRow } from '../ui/Feedback';
import { Balance, Money } from '../ui/Money';

/** Balance Summary, straight from GET /api/parties/{id}/balance-summary. */
export default function PartyBalanceCard({ summary, error }) {
  let body;
  if (error) {
    body = <InlineAlert tone="warning">The balance summary could not be loaded.</InlineAlert>;
  } else if (!summary) {
    body = <LoadingRow />;
  } else {
    body = (
      <dl className="kv-grid">
        <dt>Opening Balance</dt>
        <dd><Balance value={summary.openingBalance} /></dd>
        <dt>Total Billed</dt>
        <dd><Money value={summary.totalBilled} /></dd>
        <dt>Total Paid</dt>
        <dd><Money value={summary.totalPaid} /></dd>
        <dt>Current Balance</dt>
        <dd><Balance value={summary.currentBalance} showDue /></dd>
      </dl>
    );
  }
  return <Panel title="Balance Summary" icon="rupee">{body}</Panel>;
}
