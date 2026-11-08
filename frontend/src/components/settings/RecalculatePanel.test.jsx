import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { maintenanceApi } from '../../api/endpoints';
import { ToastProvider } from '../ui/Toast';
import RecalculatePanel from './RecalculatePanel';

vi.mock('../../api/endpoints', () => ({
  maintenanceApi: { check: vi.fn(), fixCash: vi.fn(), fixParty: vi.fn() },
}));

const MATCH = { storedCash: 5000, expectedCash: 5000, partyMismatches: [] };
const CASH_OFF = { storedCash: 5005, expectedCash: 5000, partyMismatches: [] };
const RAMESH = { partyId: 7, partyName: 'Ramesh Motors', stored: 2510, expected: 2500 };
const SHREE = { partyId: 9, partyName: 'Shree Garage', stored: -300, expected: -310 };
const PARTIES_OFF = { storedCash: 5000, expectedCash: 5000, partyMismatches: [RAMESH, SHREE] };

beforeEach(() => {
  maintenanceApi.check.mockReset();
  maintenanceApi.fixCash.mockReset();
  maintenanceApi.fixParty.mockReset();
});

function setup() {
  render(<ToastProvider><RecalculatePanel /></ToastProvider>);
  return userEvent.setup();
}

const checkButton = () => screen.getByRole('button', { name: 'Check balances' });

describe('RecalculatePanel', () => {
  it('waits for the button, then says all stored figures match', async () => {
    maintenanceApi.check.mockResolvedValue(MATCH);
    const user = setup();

    expect(screen.getByText(/Recomputes Cash in Hand and every party balance/)).toBeInTheDocument();
    expect(maintenanceApi.check).not.toHaveBeenCalled();

    await user.click(checkButton());

    expect(await screen.findByText('All stored figures match.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Correct/ })).not.toBeInTheDocument();
  });

  it('lists the Cash in Hand row with its stored and expected values when only the cash differs', async () => {
    maintenanceApi.check.mockResolvedValue(CASH_OFF);
    const user = setup();

    await user.click(checkButton());

    const row = await screen.findByRole('group', { name: 'Cash in Hand' });
    expect(within(row).getByText('Stored')).toBeInTheDocument();
    expect(within(row).getByText('₹5,005.00')).toBeInTheDocument();
    expect(within(row).getByText('Expected')).toBeInTheDocument();
    expect(within(row).getByText('₹5,000.00')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Correct Cash in Hand' })).toBeInTheDocument();
    expect(screen.getByText('All party balances match.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('All stored figures match.')).not.toBeInTheDocument();
    expect(screen.queryByText('₹5.00')).not.toBeInTheDocument(); // stored and expected only, never a difference
  });

  it('lists each party that differs, with its stored and expected balance, when only parties differ', async () => {
    maintenanceApi.check.mockResolvedValue(PARTIES_OFF);
    const user = setup();

    await user.click(checkButton());

    const table = await screen.findByRole('table', { name: /Parties whose stored balance differs/ });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Party', 'Stored', 'Expected', 'Action']);
    const ramesh = within(table).getByRole('row', { name: /Ramesh Motors/ });
    expect(within(ramesh).getByText('₹2,510.00')).toBeInTheDocument();
    expect(within(ramesh).getByText('₹2,500.00')).toBeInTheDocument();
    expect(within(ramesh).getByRole('button', { name: 'Correct balance of Ramesh Motors' })).toBeInTheDocument();
    const shree = within(table).getByRole('row', { name: /Shree Garage/ });
    expect(within(shree).getByText('-₹300.00')).toBeInTheDocument();
    expect(within(shree).getByText('-₹310.00')).toBeInTheDocument();
    expect(screen.getByText('Cash in Hand matches.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Cash in Hand' })).not.toBeInTheDocument();
  });

  it('asks before overwriting, with both values in the question, and Cancel changes nothing', async () => {
    maintenanceApi.check.mockResolvedValue(CASH_OFF);
    const user = setup();

    await user.click(checkButton());
    await user.click(await screen.findByRole('button', { name: 'Correct Cash in Hand' }));

    const dialog = await screen.findByRole('dialog', { name: 'Correct Cash in Hand' });
    expect(within(dialog).getByText('Overwrite the stored value ₹5,005.00 with ₹5,000.00?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(maintenanceApi.fixCash).not.toHaveBeenCalled();
    expect(maintenanceApi.check).toHaveBeenCalledTimes(1);
  });

  it('corrects the cash after the confirmation, then checks again', async () => {
    maintenanceApi.check.mockResolvedValueOnce(CASH_OFF).mockResolvedValueOnce(MATCH);
    maintenanceApi.fixCash.mockResolvedValue(MATCH);
    const user = setup();

    await user.click(checkButton());
    await user.click(await screen.findByRole('button', { name: 'Correct Cash in Hand' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Overwrite' }));

    expect(await screen.findByText('All stored figures match.')).toBeInTheDocument();
    expect(maintenanceApi.fixCash).toHaveBeenCalledTimes(1);
    expect(maintenanceApi.check).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Cash in Hand corrected.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('corrects one party through its own call, and its Correct buttons wait while the new check runs', async () => {
    let finishCheck;
    maintenanceApi.check
      .mockResolvedValueOnce(PARTIES_OFF)
      .mockReturnValueOnce(new Promise((resolve) => { finishCheck = resolve; }));
    maintenanceApi.fixParty.mockResolvedValue(PARTIES_OFF);
    const user = setup();

    await user.click(checkButton());
    await user.click(await screen.findByRole('button', { name: 'Correct balance of Ramesh Motors' }));
    const dialog = await screen.findByRole('dialog', { name: 'Correct balance of Ramesh Motors' });
    expect(within(dialog).getByText('Overwrite the stored value ₹2,510.00 with ₹2,500.00?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Overwrite' }));

    await waitFor(() => expect(maintenanceApi.fixParty).toHaveBeenCalledWith(7));
    expect(maintenanceApi.fixCash).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Correct balance of Shree Garage' })).toBeDisabled());

    finishCheck({ ...PARTIES_OFF, partyMismatches: [SHREE] });

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Correct balance of Ramesh Motors' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Correct balance of Shree Garage' })).toBeEnabled();
    expect(screen.getByText('Balance of Ramesh Motors corrected.')).toBeInTheDocument();
  });

  it('keeps the dialog open and shows the reason when the correction fails', async () => {
    maintenanceApi.check.mockResolvedValue(CASH_OFF);
    maintenanceApi.fixCash.mockRejectedValue(new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'The correction could not be saved.' }));
    const user = setup();

    await user.click(checkButton());
    await user.click(await screen.findByRole('button', { name: 'Correct Cash in Hand' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Overwrite' }));

    expect(await within(dialog).findByText('The correction could not be saved.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(maintenanceApi.check).toHaveBeenCalledTimes(1);
  });

  it('shows why a check failed, and Check balances tries again', async () => {
    maintenanceApi.check
      .mockRejectedValueOnce(new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'The check could not be run.' }))
      .mockResolvedValueOnce(MATCH);
    const user = setup();

    await user.click(checkButton());

    expect(await screen.findByText('Could not check the balances')).toBeInTheDocument();
    expect(screen.getByText('The check could not be run.')).toBeInTheDocument();

    await user.click(checkButton());

    expect(await screen.findByText('All stored figures match.')).toBeInTheDocument();
    expect(screen.queryByText('Could not check the balances')).not.toBeInTheDocument();
  });
});