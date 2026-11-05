import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { voucherApi } from '../../api/endpoints';
import { ToastProvider } from '../ui/Toast';
import PartyPaymentsTab from './PartyPaymentsTab';

vi.mock('../../api/endpoints', () => ({
  voucherApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn() },
  billApi: {}, partyApi: {}, supplierApi: {}, supplierPaymentApi: {},
}));

const ACTIVE = { canEdit: true, canDelete: true, canRestore: false, blockedReason: null };
const RESTORABLE = { canEdit: false, canDelete: false, canRestore: true, blockedReason: null };
const LOCKED = { canEdit: false, canDelete: false, canRestore: false, blockedReason: 'The party is deleted. Restore the party first.' };

const party = (extra) => ({ id: 7, name: 'Ramesh Motors', deleted: false, ...extra });
const voucher = (id, extra) => ({
  id, voucherNo: `PV-${id}`, partyId: 7, partyName: 'Ramesh Motors', paymentDate: '2026-10-30', amount: 300, paymentMode: 'CASH',
  referenceNo: null, remarks: null, edited: false, lastEditedAt: null, deleted: false, deletedAt: null, actions: ACTIVE, ...extra,
});
const answer = (rows, page = {}) => ({
  content: rows, page: 0, size: 10, totalElements: rows.length, totalPages: rows.length ? 1 : 0, ...page,
});
const lastParams = () => voucherApi.list.mock.calls.at(-1)[0];

beforeEach(() => {
  for (const fn of Object.values(voucherApi)) fn.mockReset();
  voucherApi.list.mockResolvedValue(answer([
    voucher(5),
    voucher(4, { paymentMode: 'ONLINE', referenceNo: 'UTR 998877', remarks: 'Part payment', amount: 1250.5 }),
  ]));
});

function setup(partyData = party(), props = {}) {
  const onChanged = vi.fn();
  const view = (extra) => (
    <MemoryRouter>
      <ToastProvider>
        <PartyPaymentsTab party={partyData} onChanged={onChanged} {...props} {...extra} />
      </ToastProvider>
    </MemoryRouter>
  );
  const result = render(view());
  return { onChanged, user: userEvent.setup(), rerender: (extra) => result.rerender(view(extra)) };
}

describe('PartyPaymentsTab', () => {
  it("asks for the party's vouchers and shows the mode, amount, reference and remarks", async () => {
    setup();

    expect(await screen.findByText('PV-5')).toBeInTheDocument();
    expect(voucherApi.list).toHaveBeenCalledWith(
      { partyId: 7, from: '', to: '', includeDeleted: false, page: 0, size: 10 },
      expect.anything(),
    );
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(
      ['Date', 'Voucher No.', 'Mode', 'Amount', 'Reference No.', 'Remarks', 'Status', 'Action'],
    );

    const cash = screen.getByText('PV-5').closest('tr');
    expect(cash).toHaveTextContent('30-10-2026');
    expect(cash).toHaveTextContent('Cash');
    expect(cash).toHaveTextContent('₹300.00');

    const online = screen.getByText('PV-4').closest('tr');
    expect(online).toHaveTextContent('Online');
    expect(online).toHaveTextContent('₹1,250.50');
    expect(online).toHaveTextContent('UTR 998877');
    expect(online).toHaveTextContent('Part payment');
  });

  it('pages through the vouchers and sends the dates from the first page', async () => {
    voucherApi.list.mockImplementation((params) => Promise.resolve(answer([voucher(5)], { page: params.page, totalElements: 25, totalPages: 3 })));
    const { user } = setup();
    await screen.findByText('PV-5');

    await user.click(screen.getByRole('button', { name: '3' }));
    await waitFor(() => expect(lastParams()).toMatchObject({ page: 2 }));

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(lastParams()).toMatchObject({ from: '2026-10-01', page: 0 }));
  });

  it('shows deleted vouchers only when asked', async () => {
    const { user } = setup();
    await screen.findByText('PV-5');
    expect(screen.getByRole('checkbox', { name: 'Show deleted records' })).not.toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: 'Show deleted records' }));
    await waitFor(() => expect(lastParams()).toMatchObject({ includeDeleted: true }));
  });

  it('Record Payment opens the voucher form with the party fixed, then reloads and tells the page', async () => {
    voucherApi.create.mockResolvedValue(voucher(6, { amount: 100 }));
    const { user, onChanged } = setup();
    await screen.findByText('PV-5');
    const callsBefore = voucherApi.list.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Record Payment' }));
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
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ action: 'created' }));
    await waitFor(() => expect(voucherApi.list.mock.calls.length).toBeGreaterThan(callsBefore));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it("locks everything for a deleted party: Record Payment is disabled and the icons carry the server's reason", async () => {
    voucherApi.list.mockResolvedValue(answer([
      voucher(5, { actions: LOCKED }),
      voucher(4, { deleted: true, deletedAt: '2026-10-31T09:00:00', actions: LOCKED }),
    ]));
    setup(party({ deleted: true }));

    await screen.findByText('PV-5');
    expect(voucherApi.list.mock.calls[0][0]).toMatchObject({ includeDeleted: true });
    expect(screen.getByRole('checkbox', { name: 'Show deleted records' })).toBeChecked();
    expect(screen.getByText('PV-4').closest('tr')).toHaveTextContent('Deleted');
    expect(screen.getByRole('button', { name: 'Record Payment' })).toBeDisabled();

    const edit = screen.getByRole('button', { name: 'Edit Payment Voucher PV-5' });
    expect(edit).toBeDisabled();
    expect(edit.parentElement).toHaveAttribute('title', expect.stringContaining('The party is deleted. Restore the party first.'));
    expect(screen.getByRole('button', { name: 'Delete Payment Voucher PV-5' })).toBeDisabled();
    const restore = screen.getByRole('button', { name: 'Restore Payment Voucher PV-4' });
    expect(restore).toBeDisabled();
    expect(restore.parentElement).toHaveAttribute('title', expect.stringContaining('Restore the party first'));
  });

  it('restoring a deleted voucher reloads the list and tells the page', async () => {
    voucherApi.list.mockResolvedValue(answer([voucher(4, { deleted: true, deletedAt: '2026-10-31T09:00:00', actions: RESTORABLE })]));
    voucherApi.restore.mockResolvedValue(voucher(4));
    const { user, onChanged } = setup();
    await screen.findByText('PV-4');
    const callsBefore = voucherApi.list.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Restore Payment Voucher PV-4' }));

    await waitFor(() => expect(voucherApi.restore).toHaveBeenCalledWith(4));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ action: 'restored' })));
    await waitFor(() => expect(voucherApi.list.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('reloads when the page asks for a refresh', async () => {
    const { rerender } = setup();
    await screen.findByText('PV-5');
    const callsBefore = voucherApi.list.mock.calls.length;

    rerender({ refreshKey: 1 });
    await waitFor(() => expect(voucherApi.list.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('shows an empty state, and a different one when the dates leave nothing', async () => {
    voucherApi.list.mockResolvedValue(answer([]));
    setup();

    expect(await screen.findByText('No payments yet')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-10-31' } });
    expect(await screen.findByText('No payments match')).toBeInTheDocument();
  });
});