import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { setupApi } from '../api/endpoints';
import SetupPage from './SetupPage';

const appState = vi.hoisted(() => ({ completeSetup: vi.fn(), checkSetup: vi.fn() }));

vi.mock('../api/endpoints', () => ({ setupApi: { run: vi.fn() } }));
vi.mock('../state/AppState', () => ({ useAppState: () => appState }));

const ALL_FLAGS = {
  printShowShopName: true, printShowAddress: true, printShowPhone: true,
  printShowLogo: true, printShowThankyou: true, printShowMrp: true,
};

beforeEach(() => {
  setupApi.run.mockReset();
  appState.completeSetup.mockReset();
  appState.checkSetup.mockReset();
  setupApi.run.mockResolvedValue({ shopName: 'Chirag Auto Parts' });
  appState.completeSetup.mockResolvedValue(undefined);
});

function setup() {
  render(
    <MemoryRouter initialEntries={['/setup']}>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const field = (name) => screen.getByLabelText(name);
const finish = (user) => user.click(screen.getByRole('button', { name: 'Finish setup' }));

describe('SetupPage', () => {
  it('asks for a shop name and a starting bill number before anything is sent', async () => {
    const user = setup();

    await finish(user);

    expect(await screen.findByText('Shop name is required.')).toBeInTheDocument();
    expect(screen.getByText('Starting bill number is required.')).toBeInTheDocument();
    expect(setupApi.run).not.toHaveBeenCalled();
  });

  it('sends the whole request: numbers as numbers, print flags true and the date as ISO text', async () => {
    const user = setup();
    await user.type(field(/^Shop Name/), '  Chirag Auto Parts ');
    await user.type(field('Cash Bill Prefix'), 'C-');
    await user.type(field('Party Bill Prefix'), 'P-');
    await user.type(field('Voucher Prefix'), 'PV-');
    await user.type(field('Supplier Payment Prefix'), 'SP-');
    await user.type(field(/^Starting Bill Number/), '1001');
    await user.type(field('Opening Cash in Hand'), '5000');
    fireEvent.change(field(/^Opening Cash in Hand Date/), { target: { value: '2026-04-01' } });

    await finish(user);

    await waitFor(() => expect(setupApi.run).toHaveBeenCalledTimes(1));
    expect(setupApi.run).toHaveBeenCalledWith({
      shopName: 'Chirag Auto Parts',
      cashBillPrefix: 'C-',
      partyBillPrefix: 'P-',
      voucherPrefix: 'PV-',
      supplierPaymentPrefix: 'SP-',
      startingBillNumber: 1001,
      openingCashInHand: 5000,
      openingCashInHandDate: '2026-04-01',
      ...ALL_FLAGS,
      printTermsConditions: null,
      topLine: null,
    });
  });

  it('sends blank prefixes as null and a blank opening cash as 0', async () => {
    const user = setup();
    await user.type(field(/^Shop Name/), 'Chirag Auto Parts');
    await user.type(field(/^Starting Bill Number/), '1');

    await finish(user);

    await waitFor(() => expect(setupApi.run).toHaveBeenCalledTimes(1));
    expect(setupApi.run).toHaveBeenCalledWith(expect.objectContaining({
      cashBillPrefix: null, partyBillPrefix: null, voucherPrefix: null, supplierPaymentPrefix: null,
      startingBillNumber: 1, openingCashInHand: 0,
    }));
  });

  it('the Example line follows the typed values', async () => {
    const user = setup();
    expect(screen.getByText('Example: first bill 1001 · first voucher 1 · first supplier payment 1')).toBeInTheDocument();

    await user.type(field('Cash Bill Prefix'), 'C-');
    await user.type(field('Party Bill Prefix'), 'P-');
    await user.type(field('Voucher Prefix'), 'PV-');
    await user.type(field('Supplier Payment Prefix'), 'SP-');
    await user.type(field(/^Starting Bill Number/), '2001');

    expect(screen.getByText('Example: first bill C-2001 or P-2001 · first voucher PV-1 · first supplier payment SP-1')).toBeInTheDocument();
  });

  it('on success it completes setup and opens Home', async () => {
    const user = setup();
    await user.type(field(/^Shop Name/), 'Chirag Auto Parts');
    await user.type(field(/^Starting Bill Number/), '1001');

    await finish(user);

    await waitFor(() => expect(appState.completeSetup).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it('SETUP_ALREADY_DONE shows its message, and Go to Home rechecks the status', async () => {
    setupApi.run.mockRejectedValue(new ApiError({ status: 409, code: 'SETUP_ALREADY_DONE', message: 'First-run setup has already been completed.' }));
    const user = setup();
    await user.type(field(/^Shop Name/), 'Chirag Auto Parts');
    await user.type(field(/^Starting Bill Number/), '1001');

    await finish(user);

    expect(await screen.findByText('First-run setup has already been completed.')).toBeInTheDocument();
    expect(appState.completeSetup).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Go to Home' }));
    expect(appState.checkSetup).toHaveBeenCalledTimes(1);
  });

  it('SETUP_AFTER_TRANSACTIONS shows as an alert at the top', async () => {
    setupApi.run.mockRejectedValue(new ApiError({ status: 409, code: 'SETUP_AFTER_TRANSACTIONS', message: 'Bills, vouchers or payments already exist.' }));
    const user = setup();
    await user.type(field(/^Shop Name/), 'Chirag Auto Parts');
    await user.type(field(/^Starting Bill Number/), '1001');

    await finish(user);

    expect(await screen.findByText('Bills, vouchers or payments already exist.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to Home' })).not.toBeInTheDocument();
  });

  it('a refused starting number shows the backend message under the field', async () => {
    setupApi.run.mockRejectedValue(new ApiError({
      status: 400, code: 'VALIDATION_FAILED', message: 'Check the highlighted fields.',
      fieldErrors: [{ field: 'startingBillNumber', message: 'must be greater than or equal to 1' }],
    }));
    const user = setup();
    await user.type(field(/^Shop Name/), 'Chirag Auto Parts');
    await user.type(field(/^Starting Bill Number/), '0');

    await finish(user);

    expect(await screen.findByText('must be greater than or equal to 1')).toBeInTheDocument();
    expect(setupApi.run).toHaveBeenCalledWith(expect.objectContaining({ startingBillNumber: 0 }));
  });

  it('the money input accepts only two decimals and the bill number only digits', async () => {
    const user = setup();

    await user.type(field('Opening Cash in Hand'), '12.345');
    await user.type(field(/^Starting Bill Number/), 'a1b2');

    expect(field('Opening Cash in Hand')).toHaveValue('12.34');
    expect(field(/^Starting Bill Number/)).toHaveValue('12');
  });
});