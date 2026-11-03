import { StatCard } from '../ui/Cards';
import { Balance, DateText, Money } from '../ui/Money';

/** The later of the two newest transactions, by date. On the same day the bill is shown. Display only. */
function lastTransaction(lastBill, lastPayment) {
  if (!lastBill && !lastPayment) return null;
  if (lastBill && (!lastPayment || lastBill.billDate >= lastPayment.paymentDate)) {
    return { kind: 'Bill', date: lastBill.billDate, amount: lastBill.grandTotal };
  }
  return { kind: 'Payment', date: lastPayment.paymentDate, amount: lastPayment.amount };
}

/**
 * The four tiles on the Selected Party page. The counts come from the Daybook summary and the voucher list
 * total; the money comes from the balance summary. Nothing is calculated here.
 */
export default function PartyKpiTiles({ party, summary, billCount, paymentCount, lastBill, lastPayment }) {
  const last = lastTransaction(lastBill, lastPayment);
  return (
    <div className="tile-row">
      <StatCard
        tone="blue"
        icon="receipt"
        label="Total Bills"
        value={billCount ?? '—'}
        hint={summary ? <Money value={summary.totalBilled} /> : undefined}
      />
      <StatCard
        tone="green"
        icon="cash"
        label="Total Payments"
        value={paymentCount ?? '—'}
        hint={summary ? <Money value={summary.totalPaid} /> : undefined}
      />
      <StatCard tone="orange" icon="rupee" label="Current Balance" value={<Balance value={party.currentBalance} showDue />} />
      <StatCard
        tone="purple"
        icon="daybook"
        label="Last Transaction"
        value={last ? <DateText value={last.date} /> : '—'}
        hint={last ? <>{last.kind} <Money value={last.amount} /></> : 'No transactions yet'}
      />
    </div>
  );
}