import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supplierApi, supplierPaymentApi } from '../api/endpoints';
import { ToastProvider } from '../components/ui/Toast';
import SuppliersPage from './SuppliersPage';

vi.mock('../api/endpoints', () => ({
  supplierApi: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn(), summary: vi.fn(), summaryFor: vi.fn(),
  },
  supplierPaymentApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn() },
  partyApi: {}, billApi: {}, voucherApi: {},
}));

const ACTIVE = { canEdit: true, canDelete: true, canRestore: false, blockedReason: null };
const LOCKED = { canEdit: false, canDelete: false, canRestore: false, blockedReason: 'The supplier is deleted. Restore the supplier first.' };
const supplier = (extra) => ({ id: 1, name: 'Tata Auto Parts', phone: '9811122233', city: 'Delhi', deleted: false, deletedAt: null, ...extra });
const TATA = supplier({ id: 1 });
const HERO = supplier({ id: 2, name: 'Hero Genuine Parts', phone: null, city: 'Ludhiana' });
const payment = (extra) => ({
  id: 10, paymentNo: 'SP-10', supplierId: 1, supplierName: 'Tata Auto Parts', paymentDate: '2026-10-30', amount: 1500,
  paymentMode: 'ONLINE', referenceNo: 'UTR123', remarks: 'Brake pads', edited: false, lastEditedAt: null,
  deleted: false, deletedAt: null, actions: ACTIVE, ...extra,
});
const PAY1 = payment({ id: 10, paymentNo: 'SP-10' });
const PAY2 = payment({ id: 11, paymentNo: 'SP-11', amount: 1000, paymentMode: 'CASH', referenceNo: null, remarks: null });
const SUMMARY = { totalSuppliers: 2, paymentCount: 3, paymentTotal: 4500, cashInHand: 12000 };
const FIRST_PAGE = { q: '', deleted: false, page: 0, size: 10, sort: 'name,asc' };

const pageOf = (content, extra = {}) => ({
  content, page: 0, size: 10, totalElements: content.length, totalPages: content.length > 0 ? 1 : 0, ...extra,
});
const lastListParams = () => supplierApi.list.mock.calls.at(-1)[0];
const lastPaymentParams = () => supplierPaymentApi.list.mock.calls.at(-1)[0];

beforeEach(() => {
  for (const group of [supplierApi, supplierPaymentApi]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
  supplierApi.list.mockResolvedValue(pageOf([TATA, HERO]));
  supplierApi.summary.mockResolvedValue(SUMMARY);
  supplierApi.get.mockImplementation((id) => Promise.resolve(String(id) === '2' ? HERO : TATA));
  supplierApi.summaryFor.mockResolvedValue({ paymentCount: 2, paymentTotal: 2500 });
  supplierPaymentApi.list.mockResolvedValue(pageOf([PAY1, PAY2]));
});

function setup(path = '/suppliers') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/suppliers/:id" element={<SuppliersPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const detailsPanel = () => screen.getByText('Supplier Details').closest('section');

describe('SuppliersPage', () => {
  it('lists active suppliers, switches to Deleted, searches and clears', async () => {
    const user = setup();
    expect(await screen.findByText('Tata Auto Parts')).toBeInTheDocument();
    expect(screen.getByText('Hero Genuine Parts')).toBeInTheDocument();
    expect(supplierApi.list.mock.calls[0][0]).toEqual(FIRST_PAGE);

    await user.click(screen.getByRole('tab', { name: 'Deleted' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ deleted: true, page: 0 }));
    await user.click(screen.getByRole('tab', { name: 'Active' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ deleted: false }));

    await user.type(screen.getByRole('textbox', { name: 'Search suppliers' }), 'delhi');
    await waitFor(() => expect(lastListParams()).toMatchObject({ q: 'delhi', page: 0, deleted: false }));

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(lastListParams()).toEqual(FIRST_PAGE));
  });

  it('shows the three tiles', async () => {
    setup();
    expect(await screen.findByText('Total Suppliers')).toBeInTheDocument();
    const tile = (label) => screen.getByText(label).closest('.stat-card');

    expect(within(tile('Total Suppliers')).getByText('2')).toBeInTheDocument();
    expect(within(tile('Total Payments to Suppliers')).getByText('₹4,500.00')).toBeInTheDocument();
    expect(within(tile('Total Payments to Suppliers')).getByText('3 payments')).toBeInTheDocument();
    expect(within(tile('Cash in Hand')).getByText('₹12,000.00')).toBeInTheDocument();
    expect(within(tile('Cash in Hand')).getByText(/As of/)).toBeInTheDocument();
  });

  it('asks to select a supplier first, then a row click loads its details, totals and payments', async () => {
    const user = setup();
    expect(await screen.findByText('Select a supplier to see its details.')).toBeInTheDocument();
    expect(supplierPaymentApi.list).not.toHaveBeenCalled();

    await user.click(await screen.findByText('Ludhiana'));

    const panel = within(detailsPanel());
    expect(await panel.findByText('Hero Genuine Parts')).toBeInTheDocument();
    expect(panel.getByText('Active')).toBeInTheDocument();
    expect(await panel.findByText('₹2,500.00')).toBeInTheDocument();
    expect(supplierApi.get).toHaveBeenCalledWith('2', expect.anything());
    expect(supplierApi.summaryFor).toHaveBeenCalledWith('2', expect.anything());
    await waitFor(() => expect(lastPaymentParams()).toMatchObject({ supplierId: 2, includeDeleted: false, page: 0 }));
    expect(await screen.findByText('SP-10')).toBeInTheDocument();
    expect(screen.getByText('UTR123')).toBeInTheDocument();
    expect(screen.getByText('Brake pads')).toBeInTheDocument();
  });

  it('a deleted supplier shows the banner, lists its payments and locks them', async () => {
    supplierApi.get.mockResolvedValue(supplier({ deleted: true, deletedAt: '2026-10-31T10:00:00' }));
    supplierPaymentApi.list.mockResolvedValue(pageOf([payment({ actions: LOCKED })]));
    setup('/suppliers/1');

    expect(await screen.findByText(/This supplier is deleted/)).toBeInTheDocument();
    expect(await screen.findByText('SP-10')).toBeInTheDocument();
    expect(lastPaymentParams()).toMatchObject({ supplierId: 1, includeDeleted: true });
    expect(screen.getByRole('checkbox', { name: 'Show deleted records' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Edit Supplier Payment SP-10' })).toBeDisabled();
    expect(screen.getByTitle('Edit Supplier Payment SP-10 — The supplier is deleted. Restore the supplier first.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Supplier Payment SP-10' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New Payment' })).toBeDisabled();
  });

  it('New Payment fixes the supplier, saves, and reloads the totals and tiles', async () => {
    supplierPaymentApi.create.mockResolvedValue(payment({ id: 12, paymentNo: 'SP-12', amount: 1000 }));
    const user = setup('/suppliers/1');
    await screen.findByText('SP-10');
    const totalCalls = supplierApi.summaryFor.mock.calls.length;
    const tileCalls = supplierApi.summary.mock.calls.length;
    const paymentCalls = supplierPaymentApi.list.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'New Payment' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Supplier Payment' });
    const supplierBox = within(dialog).getByRole('combobox');
    expect(supplierBox).toHaveValue('Tata Auto Parts');
    expect(supplierBox).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/^Amount/), '1000');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(supplierPaymentApi.create).toHaveBeenCalledWith(expect.objectContaining({ supplierId: 1, amount: 1000 })));
    expect(await screen.findByText('Payment SP-12 recorded.')).toBeInTheDocument();
    await waitFor(() => expect(supplierApi.summaryFor.mock.calls.length).toBeGreaterThan(totalCalls));
    expect(supplierApi.summary.mock.calls.length).toBeGreaterThan(tileCalls);
    expect(supplierPaymentApi.list.mock.calls.length).toBeGreaterThan(paymentCalls);
  });

  it('Delete is never blocked, and reloads the list, tiles, totals and payments', async () => {
    supplierApi.remove.mockResolvedValue(null);
    const user = setup('/suppliers/1');
    const panel = within(detailsPanel());
    const deleteButton = await panel.findByRole('button', { name: 'Delete Supplier Tata Auto Parts' });
    expect(deleteButton).toBeEnabled();
    await screen.findByText('SP-10');
    const listCalls = supplierApi.list.mock.calls.length;
    const tileCalls = supplierApi.summary.mock.calls.length;
    const totalCalls = supplierApi.summaryFor.mock.calls.length;
    const paymentCalls = supplierPaymentApi.list.mock.calls.length;

    await user.click(deleteButton);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete Supplier' }));

    await waitFor(() => expect(supplierApi.remove).toHaveBeenCalledWith(1));
    await waitFor(() => expect(supplierApi.list.mock.calls.length).toBeGreaterThan(listCalls));
    expect(supplierApi.summary.mock.calls.length).toBeGreaterThan(tileCalls);
    expect(supplierApi.summaryFor.mock.calls.length).toBeGreaterThan(totalCalls);
    expect(supplierPaymentApi.list.mock.calls.length).toBeGreaterThan(paymentCalls);
  });

  it('Restore brings a deleted supplier back and reloads', async () => {
    supplierApi.get.mockResolvedValue(supplier({ deleted: true, deletedAt: '2026-10-31T10:00:00' }));
    supplierApi.restore.mockResolvedValue(supplier());
    const user = setup('/suppliers/1');
    const panel = within(detailsPanel());
    const restore = await panel.findByRole('button', { name: 'Restore Supplier Tata Auto Parts' });
    const getCalls = supplierApi.get.mock.calls.length;

    await user.click(restore);

    await waitFor(() => expect(supplierApi.restore).toHaveBeenCalledWith(1));
    await waitFor(() => expect(supplierApi.get.mock.calls.length).toBeGreaterThan(getCalls));
  });

  it('New Supplier asks only for name, phone and city, saves, and reloads the list and tiles', async () => {
    supplierApi.create.mockResolvedValue(supplier({ id: 9, name: 'Bajaj Spares' }));
    const user = setup();
    await screen.findByText('Tata Auto Parts');
    const listCalls = supplierApi.list.mock.calls.length;
    const tileCalls = supplierApi.summary.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'New Supplier' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Supplier' });
    expect(within(dialog).getAllByRole('textbox')).toHaveLength(3);
    await user.type(within(dialog).getByLabelText(/^Supplier Name/), 'Bajaj Spares');
    await user.click(within(dialog).getByRole('button', { name: 'Save Supplier' }));

    await waitFor(() => expect(supplierApi.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bajaj Spares' })));
    expect(await screen.findByText('Supplier Bajaj Spares added.')).toBeInTheDocument();
    await waitFor(() => expect(supplierApi.list.mock.calls.length).toBeGreaterThan(listCalls));
    expect(supplierApi.summary.mock.calls.length).toBeGreaterThan(tileCalls);
  });

  it('Show deleted records is off for an active supplier and asks for deleted payments when ticked', async () => {
    const user = setup('/suppliers/1');
    await screen.findByText('SP-10');
    const box = screen.getByRole('checkbox', { name: 'Show deleted records' });
    expect(box).not.toBeChecked();
    expect(lastPaymentParams()).toMatchObject({ includeDeleted: false });

    await user.click(box);

    await waitFor(() => expect(lastPaymentParams()).toMatchObject({ includeDeleted: true, page: 0 }));
  });

  it('shows empty states for no suppliers, no matches and no payments', async () => {
    supplierApi.list.mockResolvedValue(pageOf([]));
    supplierPaymentApi.list.mockResolvedValue(pageOf([]));
    const user = setup('/suppliers/1');
    expect(await screen.findByText('No suppliers yet')).toBeInTheDocument();
    expect(await screen.findByText('No payments yet')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Search suppliers' }), 'zzz');
    expect(await screen.findByText('No suppliers match')).toBeInTheDocument();
  });
});