import { isZeroMoney } from '../../lib/format';
import { StatCard } from '../ui/Cards';
import { InlineAlert } from '../ui/Feedback';
import { Money } from '../ui/Money';

/** The tiles under the Parties list, from GET /api/parties/summary (active parties only). */
export default function PartyListTiles({ summary, error }) {
  if (error) return <InlineAlert tone="warning">The party totals could not be loaded.</InlineAlert>;
  if (!summary) return null;
  return (
    <div className="tile-row">
      <StatCard tone="blue" icon="parties" label="Total Parties" value={summary.totalParties} />
      <StatCard tone="orange" icon="receipt" label="Parties with Balance" value={summary.partiesWithBalance} />
      <StatCard tone="red" icon="rupee" label="Total Outstanding" value={<Money value={summary.totalOutstanding} />} hint="Owed by parties" />
      {!isZeroMoney(summary.totalAdvance) && (
        <StatCard tone="green" icon="cash" label="Advance Held" value={<Money value={summary.totalAdvance} />} hint="Paid ahead by parties" />
      )}
    </div>
  );
}