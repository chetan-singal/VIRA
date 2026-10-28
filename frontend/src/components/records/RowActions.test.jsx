import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import RowActions from './RowActions';

const ACTIVE = { canEdit: true, canDelete: true, canRestore: false, blockedReason: null };
const RESTORABLE = { canEdit: false, canDelete: false, canRestore: true, blockedReason: null };
const LOCKED = { canEdit: false, canDelete: false, canRestore: false, blockedReason: 'The party is deleted. Restore the party first.' };

const bill = (extra = {}) => ({ id: 7, billNo: 'C-1007', billType: 'CASH', partyName: null, grandTotal: 450, edited: false, deleted: false, actions: ACTIVE, ...extra });
const voucher = (extra = {}) => ({
  id: 1, voucherNo: 'V-1', partyId: 1, partyName: 'Ramesh Motors', paymentDate: '2026-10-24', amount: 300,
  paymentMode: 'CASH', referenceNo: null, remarks: null, edited: false, deleted: false, actions: ACTIVE, ...extra,
});

function setup(type, record, ops = {}) {
  const onChanged = vi.fn();
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RowActions type={type} record={record} ops={ops} onChanged={onChanged} />} />
        <Route path="/bills/:id/edit" element={<p>edit screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return { onChanged, user: userEvent.setup() };
}

describe('RowActions: the three states', () => {
  it('active record: Edit and Delete, no Restore', () => {
    setup('bill', bill());
    expect(screen.getByRole('button', { name: 'Edit Bill C-1007' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete Bill C-1007' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Restore/ })).not.toBeInTheDocument();
  });

  it('deleted record: Restore only', () => {
    setup('bill', bill({ deleted: true, actions: RESTORABLE }));
    expect(screen.getByRole('button', { name: 'Restore Bill C-1007' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Edit|Delete/ })).not.toBeInTheDocument();
  });

  it('locked record: the same icons, disabled, with the server reason as the tooltip', () => {
    setup('bill', bill({ actions: LOCKED }));
    const edit = screen.getByRole('button', { name: 'Edit Bill C-1007' });
    expect(edit).toBeDisabled();
    expect(edit.parentElement).toHaveAttribute('title', expect.stringContaining('Restore the party first'));
    expect(screen.getByRole('button', { name: 'Delete Bill C-1007' })).toBeDisabled();
  });

  it('a deleted record under a deleted party: Restore is disabled with the reason', () => {
    setup('bill', bill({ deleted: true, actions: LOCKED }));
    const restore = screen.getByRole('button', { name: 'Restore Bill C-1007' });
    expect(restore).toBeDisabled();
    expect(restore.parentElement).toHaveAttribute('title', expect.stringContaining('Restore the party first'));
  });
});

describe('RowActions: behaviour', () => {
  it('Edit on a bill opens the New Bill screen in edit mode', async () => {
    const { user } = setup('bill', bill());
    await user.click(screen.getByRole('button', { name: 'Edit Bill C-1007' }));
    expect(await screen.findByText('edit screen')).toBeInTheDocument();
  });

  it('Delete asks first, then removes and reports the change', async () => {
    const record = bill();
    const remove = vi.fn().mockResolvedValue(undefined);
    const { onChanged, user } = setup('bill', record, { remove });

    await user.click(screen.getByRole('button', { name: 'Delete Bill C-1007' }));
    expect(screen.getByRole('dialog', { name: 'Delete Bill C-1007?' })).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete Bill' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(record));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith({ action: 'deleted', record }));
  });

  it('Cancel leaves the record alone', async () => {
    const remove = vi.fn();
    const { onChanged, user } = setup('bill', bill(), { remove });
    await user.click(screen.getByRole('button', { name: 'Delete Bill C-1007' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(remove).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a failed delete stays in the dialog with the backend message', async () => {
    const remove = vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'PARTY_INACTIVE', message: 'The party is deleted.' }));
    const { onChanged, user } = setup('bill', bill(), { remove });
    await user.click(screen.getByRole('button', { name: 'Delete Bill C-1007' }));
    await user.click(screen.getByRole('button', { name: 'Delete Bill' }));
    expect(await screen.findByText('The party is deleted.')).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('Restore needs no confirmation', async () => {
    const record = bill({ deleted: true, actions: RESTORABLE });
    const restore = vi.fn().mockResolvedValue({ ...record, deleted: false });
    const { onChanged, user } = setup('bill', record, { restore });

    await user.click(screen.getByRole('button', { name: 'Restore Bill C-1007' }));

    await waitFor(() => expect(restore).toHaveBeenCalledWith(record));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ action: 'restored' })));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a party with a balance cannot be deleted, but can be edited', () => {
    setup('party', { id: 3, name: 'Ramesh Motors', currentBalance: 650, deleted: false });
    expect(screen.getByRole('button', { name: 'Edit Party Ramesh Motors' })).toBeEnabled();
    const del = screen.getByRole('button', { name: 'Delete Party Ramesh Motors' });
    expect(del).toBeDisabled();
    expect(del.parentElement).toHaveAttribute('title', expect.stringContaining('₹650.00 due'));
  });

  it('Edit on a voucher opens a pre-filled modal and saves through ops.save', async () => {
    const save = vi.fn().mockResolvedValue(voucher({ amount: 500 }));
    const { onChanged, user } = setup('voucher', voucher(), { save });

    await user.click(screen.getByRole('button', { name: 'Edit Payment Voucher V-1' }));
    expect(await screen.findByRole('dialog', { name: 'Edit Payment Voucher — V-1' })).toBeInTheDocument();
    const amount = screen.getByLabelText(/Amount/);
    expect(amount).toHaveValue('300');

    await user.clear(amount);
    await user.type(amount, '500');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][1]).toEqual({
      partyId: 1, paymentDate: '2026-10-24', amount: 500, paymentMode: 'CASH', referenceNo: null, remarks: null,
    });
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ action: 'updated' })));
  });

  it('shows field errors from the backend inside the form', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError({
      status: 400, code: 'VALIDATION_FAILED', message: 'Check the highlighted fields.',
      fieldErrors: [{ field: 'amount', message: 'must be greater than 0' }],
    }));
    const { user } = setup('voucher', voucher(), { save });
    await user.click(screen.getByRole('button', { name: 'Edit Payment Voucher V-1' }));
    await user.click(await screen.findByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('must be greater than 0')).toBeInTheDocument();
  });
});
