import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RowActions from './RowActions';

const ACTIVE = { canEdit: true, canDelete: true, canRestore: false, blockedReason: null };
const RESTORABLE = { canEdit: false, canDelete: false, canRestore: true, blockedReason: null };
const party = (extra = {}) => ({ id: 3, name: 'Ramesh Motors', phone: null, city: 'Rajgarh', currentBalance: 0, deleted: false, ...extra });
const voucher = (extra = {}) => ({
  id: 1, voucherNo: 'V-1', partyId: 1, partyName: 'Ramesh Motors', paymentDate: '2026-10-24', amount: 300,
  paymentMode: 'CASH', referenceNo: null, remarks: null, edited: false, deleted: false, actions: ACTIVE, ...extra,
});

function show(type, record, props = {}) {
  render(
    <MemoryRouter>
      <RowActions type={type} record={record} {...props} />
    </MemoryRouter>,
  );
}

describe('RowActions labeled', () => {
  it('shows the words Edit and Delete beside the icons of an active record', () => {
    show('party', party(), { labeled: true });

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Party Ramesh Motors' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete Party Ramesh Motors' })).toBeEnabled();
  });

  it('shows the word Restore on a deleted record', () => {
    show('voucher', voucher({ deleted: true, actions: RESTORABLE }), { labeled: true });

    expect(screen.getByText('Restore')).toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('shows icons only when labeled is not set', () => {
    show('party', party());

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Party Ramesh Motors' })).toBeInTheDocument();
  });
});