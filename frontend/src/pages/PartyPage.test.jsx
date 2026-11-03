import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { daybookApi, partyApi, voucherApi } from '../api/endpoints';
import { ToastProvider } from '../components/ui/Toast';
import { PageTitleProvider, usePageTitleState } from '../layout/PageTitle';
import PartyPage from './PartyPage';

vi.mock('../api/endpoints', () => ({
  partyApi: {
    get: vi.fn(), balanceSummary: vi.fn(), list: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn(),
  },
  daybookApi: { list: vi.fn() },
  voucherApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn() },
  billApi: {}, supplierPaymentApi: {}, supplierApi: {},
}));

const party = (extra) => ({
  id: 7, name: 'Ramesh Motors', phone: '9876543210', address: '12 Market Road', city: 'Rajgarh', state: 'Rajasthan',
  remarks: 'Pays on Fridays', openingBalance: 500, currentBalance: 1250, deleted: false, deletedAt: null, ...extra,
});
const summary = (extra) => ({ openingBalance: 500, totalBilled: 3000, totalPaid: 2250, currentBalance: 1250, ...extra });
const bill = (extra) => ({
  id: 24, billNo: 'B-24', billDate: '2026-10-28', billType: 'PARTY', partyId: 7, partyName: 'Ramesh Motors', grandTotal: 800,
  edited: false, lastEditedAt: null, deleted: false, deletedAt: null, ...extra,
});
const voucher = (extra) => ({
  id: 5, voucherNo: 'PV-5', partyId: 7, partyName: 'Ramesh Motors', paymentDate: '2026-10-30', amount: 300, paymentMode: 'CASH',
  referenceNo: null, remarks: null, edited: false, lastEditedAt: null, deleted: false, deletedAt: null, ...extra,
});
const daybook = (rows, total) => ({
  summary: { totalBills: total, totalSales: 3000, cashBillSales: 0, partySales: 3000 },
  bills: { content: rows, page: 0, size: 1, totalElements: total, totalPages: total },
});
const vouchers = (rows, total) => ({ content: rows, page: 0, size: 1, totalElements: total, totalPages: total });

beforeEach(() => {
  for (const group of [partyApi, daybookApi, voucherApi]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
  partyApi.get.mockResolvedValue(party());
  partyApi.balanceSummary.mockResolvedValue(summary());
  daybookApi.list.mockResolvedValue(daybook([bill()], 4));
  voucherApi.list.mockResolvedValue(vouchers([voucher()], 2));
});

function TitleProbe() {
  const { override } = usePageTitleState();
  return <div data-testid="title">{override ? `${override.title} | ${override.subtitle}` : ''}</div>;
}

function setup(id = '7') {
  render(
    <MemoryRouter initialEntries={[`/parties/${id}`]}>
      <ToastProvider>
        <PageTitleProvider>
          <TitleProbe />
          <Routes>
            <Route path="/parties/:id" element={<PartyPage />} />
            <Route path="/parties" element={<div>Parties list</div>} />
          </Routes>
        </PageTitleProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const tile = (label) => screen.getAllByText(label).map((el) => el.closest('.stat-card')).find(Boolean);
const card = (title) => screen.getByText(title).closest('section');

describe('PartyPage', () => {
  it('shows the tiles, the side cards and the page title from the loaded numbers', async () => {
    setup();
    await screen.findByText('Total Bills');

    await waitFor(() => expect(tile('Total Bills').querySelector('.stat-value')).toHaveTextContent(/^4$/));
    expect(tile('Total Bills')).toHaveTextContent('₹3,000.00');
    expect(tile('Total Payments').querySelector('.stat-value')).toHaveTextContent(/^2$/);
    expect(tile('Total Payments')).toHaveTextContent('₹2,250.00');
    expect(tile('Current Balance')).toHaveTextContent('₹1,250.00');
    expect(tile('Current Balance')).toHaveTextContent('Due');
    expect(tile('Last Transaction')).toHaveTextContent('30-10-2026');
    expect(tile('Last Transaction')).toHaveTextContent('Payment');
    expect(tile('Last Transaction')).toHaveTextContent('₹300.00');

    for (const text of ['9876543210', '12 Market Road', 'Rajgarh', 'Rajasthan', 'Pays on Fridays', '₹500.00', 'Set once when the party was created.']) {
      expect(card('Party Information')).toHaveTextContent(text);
    }
    for (const text of ['₹500.00', '₹3,000.00', '₹2,250.00', '₹1,250.00']) {
      expect(card('Balance Summary')).toHaveTextContent(text);
    }
    expect(screen.getByRole('link', { name: 'New Bill' })).toHaveAttribute('href', '/bills/new?partyId=7');
    await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('Ramesh Motors | Party details'));

    expect(partyApi.get).toHaveBeenCalledWith('7', expect.anything());
    expect(partyApi.balanceSummary).toHaveBeenCalledWith('7', expect.anything());
    expect(daybookApi.list).toHaveBeenCalledWith({ partyId: '7', size: 1 }, expect.anything());
    expect(voucherApi.list).toHaveBeenCalledWith({ partyId: '7', size: 1 }, expect.anything());
  });

  it('shows the bill as the last transaction when it is the later one', async () => {
    daybookApi.list.mockResolvedValue(daybook([bill({ billDate: '2026-11-01', grandTotal: 800 })], 4));
    setup();

    await waitFor(() => expect(tile('Last Transaction')).toHaveTextContent('01-11-2026'));
    expect(tile('Last Transaction')).toHaveTextContent('Bill');
    expect(tile('Last Transaction')).toHaveTextContent('₹800.00');
  });

  it('shows an advance as Advance / Credit and says why Delete is unavailable', async () => {
    partyApi.get.mockResolvedValue(party({ openingBalance: -300, currentBalance: -300 }));
    partyApi.balanceSummary.mockResolvedValue(summary({ openingBalance: -300, totalBilled: 0, totalPaid: 0, currentBalance: -300 }));
    daybookApi.list.mockResolvedValue(daybook([], 0));
    voucherApi.list.mockResolvedValue(vouchers([], 0));
    setup();

    await waitFor(() => expect(tile('Current Balance')).toHaveTextContent('Advance / Credit'));
    expect(tile('Current Balance')).toHaveTextContent('₹300.00');
    expect(tile('Current Balance')).not.toHaveTextContent('Due');
    expect(screen.getByText('Delete is unavailable: balance ₹300.00 advance. A party can be deleted only at ₹0.')).toBeInTheDocument();
    expect(tile('Last Transaction')).toHaveTextContent('No transactions yet');
  });

  it('says why Delete is unavailable when a balance is due, and disables the Delete action', async () => {
    setup();

    expect(await screen.findByText('Delete is unavailable: balance ₹1,250.00 due. A party can be deleted only at ₹0.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Party Ramesh Motors' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit Party Ramesh Motors' })).toBeEnabled();
  });

  it('has no delete hint at a balance of exactly zero and the Delete action is enabled', async () => {
    partyApi.get.mockResolvedValue(party({ currentBalance: 0 }));
    setup();

    expect(await screen.findByRole('button', { name: 'Delete Party Ramesh Motors' })).toBeEnabled();
    expect(screen.queryByText(/Delete is unavailable/)).not.toBeInTheDocument();
  });

  it('shows a Party not found panel with a link back to the list', async () => {
    partyApi.get.mockRejectedValue(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Party not found' }));
    const user = setup('999');

    expect(await screen.findByText('Party not found')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Back to Parties' }));
    expect(await screen.findByText('Parties list')).toBeInTheDocument();
  });

  it('shows the banner, a labelled Restore and locked quick actions for a deleted party, and restores it', async () => {
    partyApi.get
      .mockResolvedValueOnce(party({ currentBalance: 0, deleted: true, deletedAt: '2026-10-29T10:15:00' }))
      .mockResolvedValue(party({ currentBalance: 0 }));
    partyApi.restore.mockResolvedValue(party({ currentBalance: 0 }));
    const user = setup();

    expect(await screen.findByText(/This party is deleted/)).toBeInTheDocument();
    const restore = screen.getByRole('button', { name: 'Restore Party Ramesh Motors' });
    expect(restore).toHaveTextContent('Restore');
    expect(screen.getByRole('button', { name: 'New Bill' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record Payment' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'View Item Rates' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /^Edit Party/ })).not.toBeInTheDocument();

    await user.click(restore);
    await waitFor(() => expect(partyApi.restore).toHaveBeenCalledWith(7));
    await waitFor(() => expect(screen.queryByText(/This party is deleted/)).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'New Bill' })).toBeInTheDocument();
  });

  it('opens the voucher form with the party fixed, records the payment and reloads the figures', async () => {
    voucherApi.create.mockResolvedValue(voucher({ id: 6, voucherNo: 'PV-6', amount: 100 }));
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Record Payment' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Payment Voucher' });
    const partyBox = within(dialog).getByLabelText(/^Party/);
    expect(partyBox).toBeDisabled();
    expect(partyBox).toHaveValue('Ramesh Motors');

    await user.type(within(dialog).getByRole('textbox', { name: 'Amount' }), '100');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(voucherApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ partyId: 7, amount: 100, paymentMode: 'CASH' }),
    ));
    expect(await screen.findByText('Payment PV-6 recorded.')).toBeInTheDocument();
    await waitFor(() => expect(partyApi.balanceSummary.mock.calls.length).toBeGreaterThan(1));
    expect(voucherApi.list.mock.calls.length).toBeGreaterThan(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('selects the Item Rates tab from the Quick Actions', async () => {
    const user = setup();

    expect(await screen.findByRole('tab', { name: 'Transaction History' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'View Item Rates' }));
    expect(screen.getByRole('tab', { name: 'Item Rates' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Item Rates will be shown here.')).toBeInTheDocument();
  });
});