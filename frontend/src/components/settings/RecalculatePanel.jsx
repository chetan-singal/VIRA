import { useState } from 'react';
import { maintenanceApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { describeError } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import DataTable from '../table/DataTable';
import Button from '../ui/Button';
import { Panel } from '../ui/Cards';
import ConfirmDialog from '../ui/ConfirmDialog';
import { InlineAlert } from '../ui/Feedback';
import Icon from '../ui/Icon';
import { Money } from '../ui/Money';
import { useToast } from '../ui/Toast';

/** Two stored figures are the same figure when they are the same number (the backend compares them the same way). */
const sameAmount = (a, b) => Number(a) === Number(b);

/** What the confirmation dialog is about: which endpoint to call, the wording, and the two values it shows. */
function cashTarget(report) {
  return {
    kind: 'cash',
    title: 'Correct Cash in Hand',
    done: 'Cash in Hand corrected.',
    stored: report.storedCash,
    expected: report.expectedCash,
  };
}

function partyTarget(mismatch) {
  return {
    kind: 'party',
    partyId: mismatch.partyId,
    title: `Correct balance of ${mismatch.partyName}`,
    done: `Balance of ${mismatch.partyName} corrected.`,
    stored: mismatch.stored,
    expected: mismatch.expected,
  };
}

function Matches({ children }) {
  return (
    <p className="maint-ok">
      <Icon name="success" size={15} />
      {children}
    </p>
  );
}

/** The outcome of one check: everything matches, or the figures that differ, each with a Correct button. */
function Findings({ report, busy, onCorrect }) {
  const mismatches = report.partyMismatches ?? [];
  const cashDiffers = !sameAmount(report.storedCash, report.expectedCash);

  if (!cashDiffers && mismatches.length === 0) {
    return <InlineAlert tone="success">All stored figures match.</InlineAlert>;
  }

  const columns = [
    { key: 'party', header: 'Party', wrap: true, render: (m) => <strong>{m.partyName}</strong> },
    { key: 'stored', header: 'Stored', align: 'right', width: 150, render: (m) => <Money value={m.stored} /> },
    { key: 'expected', header: 'Expected', align: 'right', width: 150, render: (m) => <Money value={m.expected} /> },
    {
      key: 'action', header: 'Action', align: 'right', width: 110,
      render: (m) => (
        <Button size="sm" disabled={busy} aria-label={`Correct balance of ${m.partyName}`} onClick={() => onCorrect(partyTarget(m))}>
          Correct
        </Button>
      ),
    },
  ];

  return (
    <>
      {cashDiffers ? (
        <div className="maint-cash" role="group" aria-label="Cash in Hand">
          <strong className="maint-name">Cash in Hand</strong>
          <div className="maint-figure"><span>Stored</span><Money value={report.storedCash} /></div>
          <div className="maint-figure"><span>Expected</span><Money value={report.expectedCash} /></div>
          <div className="maint-act">
            <Button size="sm" disabled={busy} aria-label="Correct Cash in Hand" onClick={() => onCorrect(cashTarget(report))}>
              Correct
            </Button>
          </div>
        </div>
      ) : (
        <Matches>Cash in Hand matches.</Matches>
      )}

      {mismatches.length > 0 ? (
        <div className="maint-parties">
          <DataTable
            columns={columns}
            rows={mismatches}
            rowKey={(m) => m.partyId}
            dense
            caption="Parties whose stored balance differs from the expected balance"
          />
        </div>
      ) : (
        <Matches>All party balances match.</Matches>
      )}
    </>
  );
}

/**
 * Recalculate Balances (SRS §20.9): a safety net. Check balances asks the backend to recompute Cash in Hand and every
 * party balance from the active records and to compare them with the stored figures. Only the stored and the expected
 * values are shown; the card works out nothing itself. Correct asks for confirmation, overwrites that one stored
 * value with the expected one, and then the check runs again.
 */
export default function RecalculatePanel() {
  const toast = useToast();
  const [asked, setAsked] = useState(false);
  const [target, setTarget] = useState(null);
  const report = useApi((signal) => maintenanceApi.check({ signal }), [], { enabled: asked });

  function check() {
    if (asked) report.reload();
    else setAsked(true);
  }

  async function confirm() {
    if (target.kind === 'cash') await maintenanceApi.fixCash();
    else await maintenanceApi.fixParty(target.partyId); // a failure stays inside the dialog
    toast.success(target.done);
    setTarget(null);
    report.reload();
  }

  return (
    <Panel title="Recalculate Balances" icon="refresh">
      <div className="stack" style={{ gap: 14 }}>
        <p className="maint-intro">
          Recomputes Cash in Hand and every party balance from the active records and compares them with the stored figures.
        </p>
        <div>
          <Button icon="check" busy={report.loading} onClick={check}>Check balances</Button>
        </div>
        <div className="stack" style={{ gap: 14 }} aria-live="polite">
          {report.error && (
            <InlineAlert tone="error" title="Could not check the balances">{describeError(report.error)}</InlineAlert>
          )}
          {!report.error && report.data && <Findings report={report.data} busy={report.loading} onCorrect={setTarget} />}
        </div>
      </div>
      {target && (
        <ConfirmDialog open title={target.title} confirmLabel="Overwrite" onCancel={() => setTarget(null)} onConfirm={confirm}>
          <p>{`Overwrite the stored value ${formatMoney(target.stored)} with ${formatMoney(target.expected)}?`}</p>
        </ConfirmDialog>
      )}
    </Panel>
  );
}