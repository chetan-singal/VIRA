import { describe, expect, it } from 'vitest';
import { getRowState, RECORD_TYPES } from './recordTypes';

const ACTIVE = { canEdit: true, canDelete: true, canRestore: false, blockedReason: null };
const LOCKED = { canEdit: false, canDelete: false, canRestore: false, blockedReason: 'The party is deleted. Restore the party first.' };

describe('getRowState', () => {
  it('follows the server actions for a bill and passes the reason to every disabled icon', () => {
    const open = getRowState('bill', { deleted: false, actions: ACTIVE });
    expect(open).toMatchObject({ deleted: false, canEdit: true, canDelete: true, canRestore: false });

    const locked = getRowState('bill', { deleted: false, actions: LOCKED });
    expect(locked.canEdit).toBe(false);
    expect(locked.editReason).toBe(LOCKED.blockedReason);
    expect(locked.deleteReason).toBe(LOCKED.blockedReason);
  });

  it('a deleted record can only be restored, and only when the server allows it', () => {
    const restorable = getRowState('voucher', { deleted: true, actions: { canEdit: false, canDelete: false, canRestore: true, blockedReason: null } });
    expect(restorable).toMatchObject({ deleted: true, canRestore: true, canEdit: false, canDelete: false });

    const blocked = getRowState('voucher', { deleted: true, actions: { ...LOCKED } });
    expect(blocked.canRestore).toBe(false);
    expect(blocked.restoreReason).toContain('Restore the party first');
  });

  it('a party with a balance cannot be deleted, but can still be edited', () => {
    const owing = getRowState('party', { deleted: false, currentBalance: 650 });
    expect(owing.canEdit).toBe(true);
    expect(owing.canDelete).toBe(false);
    expect(owing.deleteReason).toContain('₹650.00 due');

    const advance = getRowState('party', { deleted: false, currentBalance: -450 });
    expect(advance.canDelete).toBe(false);
    expect(advance.deleteReason).toContain('₹450.00 advance');
  });

  it('a party at exactly zero can be deleted; a deleted party can only be restored', () => {
    expect(getRowState('party', { deleted: false, currentBalance: 0 }).canDelete).toBe(true);
    expect(getRowState('party', { deleted: false, currentBalance: '0.00' }).canDelete).toBe(true);

    const gone = getRowState('party', { deleted: true, currentBalance: 0 });
    expect(gone).toMatchObject({ deleted: true, canRestore: true, canEdit: false, canDelete: false });
  });

  it('a supplier has no balance guard', () => {
    expect(getRowState('supplier', { deleted: false })).toMatchObject({ canEdit: true, canDelete: true });
    expect(getRowState('supplier', { deleted: true })).toMatchObject({ canRestore: true, canDelete: false });
  });
});

describe('delete wording (SRS §20.6)', () => {
  it('a cash bill takes its amount out of Cash in Hand', () => {
    const w = RECORD_TYPES.bill.deleteWording({ billNo: 'C-1007', billType: 'CASH', grandTotal: 1450 });
    expect(w.title).toBe('Delete Bill C-1007?');
    expect(w.effects[0]).toBe('₹1,450.00 will be removed from Cash in Hand.');
    expect(w.effects.join(' ')).toContain('restore it at any time');
  });

  it('a party bill takes its amount off the party balance', () => {
    const w = RECORD_TYPES.bill.deleteWording({ billNo: 'P-1004', billType: 'PARTY', partyName: 'Ramesh Motors', grandTotal: 12850 });
    expect(w.effects[0]).toBe("₹12,850.00 will be removed from Ramesh Motors's balance.");
  });

  it('a voucher reverses both the party balance and Cash in Hand', () => {
    const w = RECORD_TYPES.voucher.deleteWording({ voucherNo: 'V-3', partyName: 'Ramesh Motors', amount: 300 });
    expect(w.effects[0]).toContain('balance will go up by ₹300.00');
    expect(w.effects[1]).toBe('Cash in Hand will go down by ₹300.00.');
  });

  it('a supplier payment gives the amount back to Cash in Hand', () => {
    const w = RECORD_TYPES.supplierPayment.deleteWording({ paymentNo: 'SP-2', amount: 1500 });
    expect(w.effects[0]).toBe('Cash in Hand will go back up by ₹1,500.00.');
  });

  it('a party or supplier is locked, not erased, and the wording says so', () => {
    const party = RECORD_TYPES.party.deleteWording({ name: 'Ramesh Motors' }).effects.join(' ');
    expect(party).toContain('stay in the system and remain visible');
    expect(party).toContain('can no longer be edited, deleted or restored until the party is restored');
    expect(party).toContain('can no longer be chosen on a new bill or voucher');

    const supplier = RECORD_TYPES.supplier.deleteWording({ name: 'Tata Auto Parts' }).effects.join(' ');
    expect(supplier).toContain('until the supplier is restored');
  });
});

describe('registry', () => {
  it('bills edit on the New Bill screen; the other four types open a modal', () => {
    expect(RECORD_TYPES.bill.editMode).toBe('route');
    expect(RECORD_TYPES.bill.editPath({ id: 7 })).toBe('/bills/7/edit');
    for (const type of ['voucher', 'supplierPayment', 'party', 'supplier']) {
      expect(RECORD_TYPES[type].editMode).toBe('modal');
      expect(typeof RECORD_TYPES[type].Form).toBe('function');
    }
  });

  it('every type knows how to number itself and how to remove and restore', () => {
    for (const def of Object.values(RECORD_TYPES)) {
      expect(typeof def.numberOf).toBe('function');
      expect(typeof def.ops.remove).toBe('function');
      expect(typeof def.ops.restore).toBe('function');
    }
  });
});
