import { Panel } from '../ui/Cards';
import { Balance } from '../ui/Money';

const dash = (value) => (value && String(value).trim() ? value : '—');

/** Party Information (SRS §9.3). The Opening Balance is shown, never editable. */
export default function PartyInfoCard({ party }) {
  return (
    <Panel title="Party Information" icon="parties">
      <dl className="kv-grid">
        <dt>Phone</dt>
        <dd>{dash(party.phone)}</dd>
        <dt>Address</dt>
        <dd>{dash(party.address)}</dd>
        <dt>City</dt>
        <dd>{dash(party.city)}</dd>
        <dt>State</dt>
        <dd>{dash(party.state)}</dd>
        <dt>Remarks</dt>
        <dd>{dash(party.remarks)}</dd>
        <dt>Opening Balance</dt>
        <dd>
          <Balance value={party.openingBalance} />
          <div className="field-hint" style={{ fontWeight: 400 }}>Set once when the party was created.</div>
        </dd>
      </dl>
    </Panel>
  );
}