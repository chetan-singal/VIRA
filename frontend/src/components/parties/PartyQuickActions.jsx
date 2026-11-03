import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { Panel } from '../ui/Cards';
import Icon from '../ui/Icon';

/**
 * Quick Actions on the Selected Party page. New Bill opens the New Bill screen for this party (Phase 9 reads
 * the partyId); Record Payment and View Item Rates are handled by the page. On a deleted party the first two
 * are disabled.
 */
export default function PartyQuickActions({ party, onRecordPayment, onViewRates }) {
  const reason = party.deleted ? 'This party is deleted. Restore it first.' : undefined;
  return (
    <Panel title="Quick Actions" icon="arrowRight">
      <div className="stack" style={{ gap: 8 }}>
        {party.deleted ? (
          <Button icon="newBill" disabled title={reason}>New Bill</Button>
        ) : (
          <Link className="btn btn-secondary" to={`/bills/new?partyId=${party.id}`}>
            <Icon name="newBill" size={16} />
            New Bill
          </Link>
        )}
        <Button icon="vouchers" disabled={party.deleted} title={reason} onClick={onRecordPayment}>Record Payment</Button>
        <Button icon="items" onClick={onViewRates}>View Item Rates</Button>
      </div>
    </Panel>
  );
}