import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EditRecordModal from '../EditRecordModal';
import SupplierPaymentForm from './SupplierPaymentForm';
import VoucherForm from './VoucherForm';

const PARTY = { id: 5, label: 'Ramesh Motors' };
const SUPPLIER = { id: 9, label: 'Tata Auto Parts' };

function voucherOps() {
  return { save: vi.fn().mockResolvedValue({ id: 1 }), lookupParties: vi.fn().mockResolvedValue([]) };
}

function paymentOps() {
  return { save: vi.fn().mockResolvedValue({ id: 1 }), lookupSuppliers: vi.fn().mockResolvedValue([]) };
}

describe('form presets', () => {
  it('a voucher with a preset party shows it, locks it and saves with its id', async () => {
    const user = userEvent.setup();
    const ops = voucherOps();
    render(<VoucherForm record={null} ops={ops} preset={{ party: PARTY }} onSaved={() => {}} onCancel={() => {}} />);

    const party = screen.getByRole('combobox');
    expect(party).toHaveValue('Ramesh Motors');
    expect(party).toBeDisabled();

    await user.type(screen.getByLabelText(/^Amount/), '100');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(ops.save).toHaveBeenCalledTimes(1));
    expect(ops.save).toHaveBeenCalledWith(null, expect.objectContaining({ partyId: 5, amount: 100, paymentMode: 'CASH' }));
  });

  it('Save & New keeps the preset party', async () => {
    const user = userEvent.setup();
    const ops = voucherOps();
    render(<VoucherForm record={null} ops={ops} preset={{ party: PARTY }} allowSaveAndNew onSaved={() => {}} onCancel={() => {}} />);

    await user.type(screen.getByLabelText(/^Amount/), '250');
    await user.click(screen.getByRole('button', { name: 'Save & New' }));

    await waitFor(() => expect(ops.save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText(/^Amount/)).toHaveValue(''));
    expect(screen.getByRole('combobox')).toHaveValue('Ramesh Motors');
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('a voucher being edited ignores the preset and keeps its own party editable', () => {
    const record = { id: 1, voucherNo: 'V-1', partyId: 2, partyName: 'Suresh Spares', paymentDate: '2026-10-24', amount: 300, paymentMode: 'CASH', referenceNo: null, remarks: null };
    render(<VoucherForm record={record} ops={voucherOps()} preset={{ party: PARTY }} onSaved={() => {}} onCancel={() => {}} />);

    expect(screen.getByRole('combobox')).toHaveValue('Suresh Spares');
    expect(screen.getByRole('combobox')).toBeEnabled();
  });

  it('a supplier payment with a preset supplier shows it, locks it and saves with its id', async () => {
    const user = userEvent.setup();
    const ops = paymentOps();
    render(<SupplierPaymentForm record={null} ops={ops} preset={{ supplier: SUPPLIER }} onSaved={() => {}} onCancel={() => {}} />);

    const supplier = screen.getByRole('combobox');
    expect(supplier).toHaveValue('Tata Auto Parts');
    expect(supplier).toBeDisabled();

    await user.type(screen.getByLabelText(/^Amount/), '1000');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(ops.save).toHaveBeenCalledTimes(1));
    expect(ops.save).toHaveBeenCalledWith(null, expect.objectContaining({ supplierId: 9, amount: 1000 }));
  });

  it('EditRecordModal hands the preset to the form', () => {
    render(<EditRecordModal type="voucher" record={null} open ops={voucherOps()} preset={{ party: PARTY }} onClose={() => {}} onSaved={() => {}} />);

    expect(screen.getByRole('dialog', { name: 'New Payment Voucher' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('Ramesh Motors');
  });
});