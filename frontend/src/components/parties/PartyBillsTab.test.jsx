import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { billApi, daybookApi } from '../../api/endpoints';
import { ToastProvider } from '../ui/Toast';
import PartyBillsTab from './PartyBillsTab';

vi.mock('../../api/endpoints', () => ({
  daybookApi: { list: vi.fn() },
  billApi: { get: vi.fn(), remove: vi.fn(), restore: vi.fn() },
  partyApi: {}, supplierApi: {}, supplierPaymentApi: {}, voucherApi: {},
}));

const ACTIVE = { canEdit: true, canDelete: true, canRestore: false, blockedReason: null };
const RESTORABLE = { canEdit: false, canDelete: false, canRestore: true, blockedReason: null };
const LOCKED = { canEdit: false, canDelete: false, canRestore: false, blockedReason: 'The party is deleted. Restore the party first.' };

const party = (extra) => ({ id: 7, name: 'Ramesh Motors', deleted: false, ...extra });
const bill = (id, extra) => ({
  id, billNo: `B-${id}`, billDate: '2026-10-28', billType: 'PARTY', partyId: 7, partyName: 'Ramesh Motors', grandTotal: 800,
  edited: false, lastEditedAt: null, deleted: false, deletedAt: null, actions: ACTIVE, ...extra,
});
const answer = (rows, page = {}) => ({
  summary: { totalBills: rows.length, totalSales: 2500, cashBillSales: 0, partySales: 2500 },
  bills: { content: rows, page: 0, size: 10, totalElements: rows.length, totalPages: rows.length ? 1 : 0, ...page },
});
const lastParams = () => daybookApi.list.mock.calls.at(-1)[0];

beforeEach(() => {
  daybookApi.list.mockReset();
  billApi.get.mockReset();
  billApi.remove.mockReset();
  billApi.restore.mockReset();
  daybookApi.list.mockResolvedValue(answer([bill(24), bill(23, { edited: true, lastEditedAt: '2026-10-29T10:00:00' })]));
});

function setup(partyData = party(), props = {}) {
  const onChanged = vi.fn();
  const view = (extra) => (
    <MemoryRouter>
      <ToastProvider>
        <PartyBillsTab party={partyData} onChanged={onChanged} {...props} {...extra} />
      </ToastProvider>
    </MemoryRouter>
  );
  const result = render(view());
  return { onChanged, user: userEvent.setup(), rerender: (extra) => result.rerender(view(extra)) };
}

describe('PartyBillsTab', () => {
  it("asks the Daybook for the party's bills and shows them with the bill count and Party Sales", async () => {
    setup();

    expect(await screen.findByText('B-24')).toBeInTheDocument();
    expect(daybookApi.list).toHaveBeenCalledWith(
      { partyId: 7, from: '', to: '', includeDeleted: false, page: 0, size: 10 },
      expect.anything(),
    );
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Date', 'Bill No.', 'Amount', 'Status', 'Action']);
    const row = screen.getByText('B-24').closest('tr');
    expect(row).toHaveTextContent('28-10-2026');
    expect(row).toHaveTextContent('₹800.00');
    expect(screen.getByText('B-23').closest('tr')).toHaveTextContent('Revised');
    expect(document.querySelector('.tab-note')).toHaveTextContent('2 bills · Party Sales ₹2,500.00');
  });

  it('sends the dates, returns to the first page, and Clear removes the dates', async () => {
    daybookApi.list.mockImplementation((params) => Promise.resolve(answer([bill(24)], { page: params.page, size: 10, totalElements: 25, totalPages: 3 })));
    const user = setup().user;
    await screen.findByText('B-24');

    await user.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(lastParams()).toMatchObject({ page: 1 }));

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(lastParams()).toMatchObject({ from: '2026-10-01', to: '', page: 0 }));
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-10-31' } });
    await waitFor(() => expect(lastParams()).toMatchObject({ from: '2026-10-01', to: '2026-10-31', page: 0 }));

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(lastParams()).toMatchObject({ from: '', to: '', page: 0 }));
  });

  it('leaves deleted bills out until Show deleted records is ticked', async () => {
    const user = setup().user;
    await screen.findByText('B-24');

    const box = screen.getByRole('checkbox', { name: 'Show deleted records' });
    expect(box).not.toBeChecked();
    expect(document.querySelector('.tab-note')).not.toHaveTextContent('not counted');

    await user.click(box);
    await waitFor(() => expect(lastParams()).toMatchObject({ includeDeleted: true, page: 0 }));
    expect(await screen.findByText(/Deleted bills are not counted/)).toBeInTheDocument();
  });

  it("lists every row of a deleted party, locks the icons with the server's reason and keeps View", async () => {
    daybookApi.list.mockResolvedValue(answer([bill(24, { actions: LOCKED }), bill(23, { deleted: true, deletedAt: '2026-10-30T09:00:00', actions: LOCKED })]));
    setup(party({ deleted: true }));

    await screen.findByText('B-24');
    expect(daybookApi.list.mock.calls[0][0]).toMatchObject({ includeDeleted: true });
    expect(screen.getByRole('checkbox', { name: 'Show deleted records' })).toBeChecked();
    expect(screen.getByText('B-23').closest('tr')).toHaveTextContent('Deleted');

    const edit = screen.getByRole('button', { name: 'Edit Bill B-24' });
    expect(edit).toBeDisabled();
    expect(edit.parentElement).toHaveAttribute('title', expect.stringContaining('The party is deleted. Restore the party first.'));
    expect(screen.getByRole('button', { name: 'Delete Bill B-24' })).toBeDisabled();
    const restore = screen.getByRole('button', { name: 'Restore Bill B-23' });
    expect(restore).toBeDisabled();
    expect(restore.parentElement).toHaveAttribute('title', expect.stringContaining('Restore the party first'));
    expect(screen.getByRole('button', { name: 'View Bill B-24' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'View Bill B-23' })).toBeEnabled();
  });

  it('View opens the Bill View dialog for that bill', async () => {
    billApi.get.mockResolvedValue({
      id: 24, billNo: 'B-24', billType: 'PARTY', partyId: 7, partyName: 'Ramesh Motors', billDate: '2026-10-28',
      lines: [{ itemId: 1, itemName: 'Brake Pad Set', unit: 'Pcs', itemType: 'MRP', mrp: 450, discountPercent: 10, rate: 405, qty: 2, amount: 810, lineNo: 1 }],
      netAmount: 810, roundOff: 0, grandTotal: 810, previousBalance: 100, totalDue: 910,
      edited: false, lastEditedAt: null, deleted: false, deletedAt: null, actions: ACTIVE,
    });
    const user = setup().user;

    await user.click(await screen.findByRole('button', { name: 'View Bill B-24' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bill B-24' });
    expect(await within(dialog).findByText('Brake Pad Set')).toBeInTheDocument();
    expect(billApi.get).toHaveBeenCalledWith(24, expect.anything());

    await user.click(dialog.querySelector('.modal-foot button'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('deleting a bill reloads the list and tells the page', async () => {
    billApi.remove.mockResolvedValue(null);
    const { user, onChanged } = setup();
    await screen.findByText('B-24');
    const callsBefore = daybookApi.list.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Delete Bill B-24' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Bill B-24?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete Bill' }));

    await waitFor(() => expect(billApi.remove).toHaveBeenCalledWith(24));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ action: 'deleted' })));
    await waitFor(() => expect(daybookApi.list.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('goes back one page when the last bill of a later page is deleted', async () => {
    billApi.remove.mockResolvedValue(null);
    daybookApi.list.mockImplementation((params) => Promise.resolve(
      params.page === 0
        ? answer([bill(24), bill(23)], { totalElements: 11, totalPages: 2 })
        : answer([bill(1)], { page: 1, totalElements: 11, totalPages: 2 }),
    ));
    const user = setup().user;
    await screen.findByText('B-24');

    await user.click(screen.getByRole('button', { name: '2' }));
    await screen.findByText('B-1');
    await user.click(screen.getByRole('button', { name: 'Delete Bill B-1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Bill B-1?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete Bill' }));

    await waitFor(() => expect(lastParams()).toMatchObject({ page: 0 }));
    expect(await screen.findByText('B-24')).toBeInTheDocument();
  });

  it('reloads when the page asks for a refresh', async () => {
    const { rerender } = setup();
    await screen.findByText('B-24');
    const callsBefore = daybookApi.list.mock.calls.length;

    rerender({ refreshKey: 1 });
    await waitFor(() => expect(daybookApi.list.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('shows an empty state, and a different one when the dates leave nothing', async () => {
    daybookApi.list.mockResolvedValue(answer([]));
    setup();

    expect(await screen.findByText('No bills yet')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    expect(await screen.findByText('No bills match')).toBeInTheDocument();
  });
});