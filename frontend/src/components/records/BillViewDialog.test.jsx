import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { billApi } from '../../api/endpoints';
import BillViewDialog from './BillViewDialog';

vi.mock('../../api/endpoints', () => ({ billApi: { get: vi.fn() } }));

const MRP_LINE = {
  itemId: 1, itemName: 'Brake Pad Set', unit: 'Pcs', itemType: 'MRP', mrp: 450, discountPercent: 10, rate: 405, qty: 2, amount: 810, lineNo: 1,
};
const NET_LINE = {
  itemId: 2, itemName: 'Clutch Cable', unit: 'Pcs', itemType: 'NET_RATE', mrp: null, discountPercent: null, rate: 120, qty: 3, amount: 360, lineNo: 2,
};

const bill = (extra) => ({
  id: 11, billNo: 'C-1011', billType: 'CASH', partyId: null, partyName: null, billDate: '2026-10-28',
  lines: [MRP_LINE, NET_LINE], netAmount: 1170, roundOff: 0, grandTotal: 1170, previousBalance: null, totalDue: null,
  edited: false, lastEditedAt: null, deleted: false, deletedAt: null, ...extra,
});

beforeEach(() => {
  billApi.get.mockReset();
  billApi.get.mockResolvedValue(bill());
});

function setup(props) {
  const onClose = vi.fn();
  render(<BillViewDialog billId={11} billNo="C-1011" onClose={onClose} {...props} />);
  return { onClose, user: userEvent.setup() };
}

const rowsOf = (dialog) => within(dialog).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((c) => c.textContent));

describe('BillViewDialog', () => {
  it('shows the title at once, then the bill date, the lines and the totals of a cash bill', async () => {
    setup();

    const dialog = await screen.findByRole('dialog', { name: 'Bill C-1011' });
    expect(await within(dialog).findByText('Brake Pad Set')).toBeInTheDocument();
    expect(billApi.get).toHaveBeenCalledWith(11, expect.anything());

    expect(within(dialog).getByText('Cash')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('28-10-2026');
    expect(within(dialog).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(
      ['S.No.', 'Item Name', 'Unit', 'MRP', 'Disc. (%)', 'Rate', 'Qty', 'Amount'],
    );
    expect(rowsOf(dialog)[0]).toEqual(['1', 'Brake Pad Set', 'Pcs', '₹450.00', '10', '₹405.00', '2', '₹810.00']);

    const totals = dialog.querySelector('.bill-totals');
    expect(totals).toHaveTextContent('Net Amount₹1,170.00');
    expect(totals).toHaveTextContent('Round Off₹0.00');
    expect(totals).toHaveTextContent('Grand Total₹1,170.00');
    expect(within(dialog).queryByText('Party')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Previous Balance')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Total Due')).not.toBeInTheDocument();
  });

  it('shows a Net Rate item with its rate in the MRP column and a dash for the discount', async () => {
    setup();
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Clutch Cable');

    expect(rowsOf(dialog)[1]).toEqual(['2', 'Clutch Cable', 'Pcs', '₹120.00', '—', '₹120.00', '3', '₹360.00']);
  });

  it('shows the party, the previous balance and the total due of a party bill', async () => {
    billApi.get.mockResolvedValue(bill({
      billType: 'PARTY', partyId: 7, partyName: 'Ramesh Motors', billNo: 'B-1250', roundOff: -0.4, grandTotal: 1169.6,
      previousBalance: 500, totalDue: 1669.6,
    }));
    setup({ billNo: 'B-1250' });

    const dialog = await screen.findByRole('dialog', { name: 'Bill B-1250' });
    await within(dialog).findByText('Ramesh Motors');

    expect(dialog.querySelector('.badge')).toHaveTextContent('Party');
    expect(dialog.querySelector('.kv-grid')).toHaveTextContent('PartyRamesh Motors');
    const totals = dialog.querySelector('.bill-totals');
    expect(totals).toHaveTextContent('Round Off-₹0.40');
    expect(totals).toHaveTextContent('Previous Balance₹500.00Due');
    expect(totals).toHaveTextContent('Total Due₹1,669.60Due');
  });

  it('shows the Revised and Deleted tags with their dates', async () => {
    billApi.get.mockResolvedValue(bill({
      edited: true, lastEditedAt: '2026-10-29T14:05:00', deleted: true, deletedAt: '2026-10-30T09:30:00',
    }));
    setup();

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Brake Pad Set');

    expect(within(dialog).getByText('Revised')).toBeInTheDocument();
    expect(within(dialog).getByText('Deleted')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Revised on29-10-2026 02:05 PM');
    expect(dialog).toHaveTextContent('Deleted on30-10-2026 09:30 AM');
  });

  it('is read-only: only Close buttons, and Close calls onClose', async () => {
    const { onClose, user } = setup();
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Brake Pad Set');

    const buttons = within(dialog).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(buttons.every((name) => name === 'Close')).toBe(true);

    await user.click(dialog.querySelector('.modal-foot button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the error when the bill cannot be loaded, and loads it again on Try again', async () => {
    billApi.get
      .mockRejectedValueOnce(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Bill 11 not found' }))
      .mockResolvedValue(bill());
    const { user } = setup();

    const dialog = await screen.findByRole('dialog', { name: 'Bill C-1011' });
    expect(await within(dialog).findByText('Bill 11 not found')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Try again' }));
    expect(await within(dialog).findByText('Brake Pad Set')).toBeInTheDocument();
  });
});