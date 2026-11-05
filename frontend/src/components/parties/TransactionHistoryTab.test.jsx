import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { billApi, daybookApi, voucherApi } from '../../api/endpoints';
import { ToastProvider } from '../ui/Toast';
import TransactionHistoryTab from './TransactionHistoryTab';

vi.mock('../../api/endpoints', () => ({
  daybookApi: { list: vi.fn() },
  voucherApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn() },
  billApi: { get: vi.fn(), remove: vi.fn(), restore: vi.fn() },
  partyApi: {}, supplierApi: {}, supplierPaymentApi: {},
}));

const ACTIVE = { canEdit: true, canDelete: true, canRestore: false, blockedReason: null };
const LOCKED = { canEdit: false, canDelete: false, canRestore: false, blockedReason: 'The party is deleted. Restore the party first.' };

const party = (extra) => ({ id: 7, name: 'Ramesh Motors', deleted: false, ...extra });
const bill = (id, billDate, extra) => ({
  id, billNo: `B-${id}`, billDate, billType: 'PARTY', partyId: 7, partyName: 'Ramesh Motors', grandTotal: 800,
  edited: false, lastEditedAt: null, deleted: false, deletedAt: null, actions: ACTIVE, ...extra,
});
const voucher = (id, paymentDate, extra) => ({
  id, voucherNo: `PV-${id}`, partyId: 7, partyName: 'Ramesh Motors', paymentDate, amount: 300, paymentMode: 'CASH',
  referenceNo: null, remarks: null, edited: false, lastEditedAt: null, deleted: false, deletedAt: null, actions: ACTIVE, ...extra,
});

/** Both lists answer like the backend: newest first, cut into pages by `page` and `size`. */
function serve(bills, vouchers) {
  const slice = (rows, { page, size }) => ({
    content: rows.slice(page * size, page * size + size), page, size, totalElements: rows.length, totalPages: Math.ceil(rows.length / size),
  });
  daybookApi.list.mockImplementation((params) => Promise.resolve({
    summary: { totalBills: bills.length, totalSales: 0, cashBillSales: 0, partySales: 0 },
    bills: slice(bills, params),
  }));
  voucherApi.list.mockImplementation((params) => Promise.resolve(slice(vouchers, params)));
}

const lastBillParams = () => daybookApi.list.mock.calls.at(-1)[0];
const lastVoucherParams = () => voucherApi.list.mock.calls.at(-1)[0];
// Plain DOM reads: role queries over a hundred rows are far too slow in jsdom.
const dataRows = () => Array.from(document.querySelectorAll('tbody tr'));
const refs = () => dataRows().map((row) => row.children[2].textContent);
const loadMore = () => screen.getByText('Load more').closest('button');

beforeEach(() => {
  for (const group of [daybookApi, voucherApi, billApi]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
  serve(
    [bill(3, '2026-10-20'), bill(2, '2026-10-05')],
    [voucher(9, '2026-10-25'), voucher(8, '2026-10-10', { paymentMode: 'ONLINE' })],
  );
});

function setup(partyData = party(), props = {}) {
  const onChanged = vi.fn();
  const view = (extra) => (
    <MemoryRouter>
      <ToastProvider>
        <TransactionHistoryTab party={partyData} onChanged={onChanged} {...props} {...extra} />
      </ToastProvider>
    </MemoryRouter>
  );
  const result = render(view());
  return { onChanged, user: userEvent.setup(), rerender: (extra) => result.rerender(view(extra)) };
}

describe('TransactionHistoryTab', () => {
  it('asks for the newest 20 bills and 20 vouchers and shows them mixed by date, newest first', async () => {
    setup();

    await screen.findByText('B-3');
    const filters = { partyId: 7, from: '', to: '', keyword: '', includeDeleted: false, page: 0, size: 20 };
    expect(daybookApi.list).toHaveBeenCalledWith(filters, expect.anything());
    expect(voucherApi.list).toHaveBeenCalledWith(filters, expect.anything());

    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(
      ['Date', 'Type', 'Ref No.', 'Description', 'Amount', 'Status', 'Action'],
    );
    expect(refs()).toEqual(['PV-9', 'B-3', 'PV-8', 'B-2']);

    const payment = screen.getByText('PV-9').closest('tr');
    expect(payment).toHaveTextContent('25-10-2026');
    expect(payment).toHaveTextContent('Payment');
    expect(payment).toHaveTextContent('Payment received (Cash)');
    expect(payment.querySelector('.amount-payment')).toHaveTextContent('₹300.00');
    expect(screen.getByText('PV-8').closest('tr')).toHaveTextContent('Payment received (Online)');

    const sale = screen.getByText('B-3').closest('tr');
    expect(sale).toHaveTextContent('Sale Bill');
    expect(sale.querySelector('.amount-bill')).toHaveTextContent('₹800.00');
    expect(screen.getByText(/Showing 4 entries/)).toBeInTheDocument();
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  });

  it('sends From, To and the search to both calls', async () => {
    const { user } = setup();
    await screen.findByText('B-3');

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-10-31' } });
    await user.type(screen.getByRole('textbox', { name: 'Search transactions' }), 'utr');

    await waitFor(() => expect(lastBillParams()).toMatchObject({ from: '2026-10-01', to: '2026-10-31', keyword: 'utr' }));
    await waitFor(() => expect(lastVoucherParams()).toMatchObject({ from: '2026-10-01', to: '2026-10-31', keyword: 'utr' }));
  });

  it('the Type filter leaves out the other source', async () => {
    const { user } = setup();
    await screen.findByText('B-3');

    voucherApi.list.mockClear();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Entry type' }), 'BILLS');
    await waitFor(() => expect(refs()).toEqual(['B-3', 'B-2']));
    expect(voucherApi.list).not.toHaveBeenCalled();

    daybookApi.list.mockClear();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Entry type' }), 'PAYMENTS');
    await waitFor(() => expect(refs()).toEqual(['PV-9', 'PV-8']));
    expect(daybookApi.list).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Entry type' }), 'ALL');
    await waitFor(() => expect(refs()).toEqual(['PV-9', 'B-3', 'PV-8', 'B-2']));
  });

  it('offers Load more only while there are more entries, and each press asks for 20 more of each', async () => {
    const bills = Array.from({ length: 45 }, (_, i) => bill(100 - i, '2026-10-01'));
    serve(bills, [voucher(5, '2026-09-01')]);
    const { user } = setup();

    await screen.findByText('B-100');
    expect(dataRows()).toHaveLength(20);
    expect(screen.getByText(/Showing 20 entries/)).toBeInTheDocument();

    await user.click(loadMore());
    await waitFor(() => expect(dataRows()).toHaveLength(40));
    expect(lastBillParams()).toMatchObject({ page: 0, size: 40 });
    expect(lastVoucherParams()).toMatchObject({ page: 0, size: 40 });

    await user.click(loadMore());
    await waitFor(() => expect(dataRows()).toHaveLength(46));
    expect(screen.getByText(/Showing 46 entries/)).toBeInTheDocument();
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
    expect(new Set(refs()).size).toBe(46);
  });

  it('starts again at 20 entries when a filter changes', async () => {
    serve(Array.from({ length: 45 }, (_, i) => bill(100 - i, '2026-10-01')), []);
    const { user } = setup();
    await screen.findByText('B-100');

    await user.click(loadMore());
    await waitFor(() => expect(dataRows()).toHaveLength(40));

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-09-01' } });
    await waitFor(() => expect(lastBillParams()).toMatchObject({ from: '2026-09-01', size: 20 }));
    await waitFor(() => expect(dataRows()).toHaveLength(20));
  });

  it('keeps loading past 100 entries, asking for pages of at most 100 rows', async () => {
    serve(Array.from({ length: 130 }, (_, i) => bill(130 - i, '2026-10-01')), []);
    const { user } = setup();
    await screen.findByText('B-130');

    for (const shown of [40, 60, 80, 100, 120]) {
      await user.click(loadMore());
      await waitFor(() => expect(dataRows()).toHaveLength(shown));
    }
    expect(Math.max(...daybookApi.list.mock.calls.map(([params]) => params.size))).toBeLessThanOrEqual(100);
    expect(daybookApi.list.mock.calls.some(([params]) => params.page === 1 && params.size === 60)).toBe(true);
    expect(refs()[0]).toBe('B-130');
    expect(refs()[119]).toBe('B-11');

    await user.click(loadMore());
    await waitFor(() => expect(dataRows()).toHaveLength(130));
    expect(new Set(refs()).size).toBe(130);
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  }, 30000);

  it("lists every row of a deleted party, locks Edit, Delete and Restore with the server's reason and keeps View", async () => {
    serve(
      [bill(3, '2026-10-20', { actions: LOCKED }), bill(2, '2026-10-05', { deleted: true, deletedAt: '2026-10-31T09:00:00', actions: LOCKED })],
      [voucher(9, '2026-10-25', { actions: LOCKED }), voucher(8, '2026-10-10', { deleted: true, deletedAt: '2026-10-31T09:05:00', actions: LOCKED })],
    );
    setup(party({ deleted: true }));

    await screen.findByText('B-3');
    expect(lastBillParams()).toMatchObject({ includeDeleted: true });
    expect(lastVoucherParams()).toMatchObject({ includeDeleted: true });
    expect(screen.getByRole('checkbox', { name: 'Show deleted records' })).toBeChecked();
    expect(refs()).toEqual(['PV-9', 'B-3', 'PV-8', 'B-2']);

    const reason = 'The party is deleted. Restore the party first.';
    for (const name of ['Edit Bill B-3', 'Delete Bill B-3', 'Restore Bill B-2', 'Edit Payment Voucher PV-9', 'Delete Payment Voucher PV-9', 'Restore Payment Voucher PV-8']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button.parentElement).toHaveAttribute('title', expect.stringContaining(reason));
    }
    expect(screen.getByRole('button', { name: 'View Bill B-3' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'View Bill B-2' })).toBeEnabled();
  });

  it('View opens the Bill View dialog for a bill, and a payment row has no View', async () => {
    billApi.get.mockResolvedValue({
      id: 3, billNo: 'B-3', billType: 'PARTY', partyId: 7, partyName: 'Ramesh Motors', billDate: '2026-10-20',
      lines: [{ itemId: 1, itemName: 'Brake Pad Set', unit: 'Pcs', itemType: 'MRP', mrp: 450, discountPercent: 10, rate: 405, qty: 2, amount: 810, lineNo: 1 }],
      netAmount: 810, roundOff: 0, grandTotal: 810, previousBalance: 100, totalDue: 910,
      edited: false, lastEditedAt: null, deleted: false, deletedAt: null, actions: ACTIVE,
    });
    const { user } = setup();
    await screen.findByText('B-3');

    expect(within(screen.getByText('PV-9').closest('tr')).queryByRole('button', { name: /^View/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View Bill B-3' }));

    const dialog = await screen.findByRole('dialog', { name: 'Bill B-3' });
    expect(await within(dialog).findByText('Brake Pad Set')).toBeInTheDocument();
    expect(billApi.get).toHaveBeenCalledWith(3, expect.anything());
  });

  it('deleting a payment reloads the history and tells the page', async () => {
    voucherApi.remove.mockResolvedValue(null);
    const { user, onChanged } = setup();
    await screen.findByText('PV-9');
    const callsBefore = voucherApi.list.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Delete Payment Voucher PV-9' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Payment Voucher PV-9?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete Voucher' }));

    await waitFor(() => expect(voucherApi.remove).toHaveBeenCalledWith(9));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ action: 'deleted' })));
    await waitFor(() => expect(voucherApi.list.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('reloads when the page asks for a refresh', async () => {
    const { rerender } = setup();
    await screen.findByText('B-3');
    const callsBefore = daybookApi.list.mock.calls.length;

    rerender({ refreshKey: 1 });
    await waitFor(() => expect(daybookApi.list.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('shows an empty state, and a different one when the filters leave nothing', async () => {
    serve([], []);
    setup();

    expect(await screen.findByText('No transactions yet')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    expect(await screen.findByText('No transactions match')).toBeInTheDocument();
  });
});