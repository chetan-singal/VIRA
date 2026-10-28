import { billApi, partyApi, supplierApi, supplierPaymentApi, voucherApi } from '../../api/endpoints';
import { formatMoney, isZeroMoney } from '../../lib/format';
import PartyForm from './forms/PartyForm';
import SupplierForm from './forms/SupplierForm';
import SupplierPaymentForm from './forms/SupplierPaymentForm';
import VoucherForm from './forms/VoucherForm';

/*
 * The one place that knows how each record type behaves. RowActions, the Edit modal and the Delete dialog
 * are generic and read everything from here. Phases 8 to 11 add no per-screen delete/restore code.
 */

// ---- look-ups used by the Party / Supplier pickers (replaceable in the component gallery) ----
async function lookupParties(q) {
  const page = await partyApi.list({ q, size: 8, sort: 'name,asc' });
  return page.content.map((p) => ({ id: p.id, label: p.name, detail: p.city || p.phone || undefined }));
}
async function lookupSuppliers(q) {
  const page = await supplierApi.list({ q, size: 8, sort: 'name,asc' });
  return page.content.map((s) => ({ id: s.id, label: s.name, detail: s.city || s.phone || undefined }));
}

// ---- row actions: Bills, Vouchers and Supplier Payments arrive with server-computed actions ----
const serverActions = (record) => record.actions;

function partyActions(party) {
  const deleted = Boolean(party.deleted);
  const owes = !isZeroMoney(party.currentBalance);
  const due = Number(party.currentBalance) > 0;
  return {
    canEdit: !deleted,
    canDelete: !deleted && !owes,
    canRestore: deleted,
    deleteReason: owes
      ? `A party can be deleted only at ₹0 (balance now ${formatMoney(Math.abs(Number(party.currentBalance)))} ${due ? 'due' : 'advance'}).`
      : null,
  };
}

function supplierActions(supplier) {
  const deleted = Boolean(supplier.deleted);
  return { canEdit: !deleted, canDelete: !deleted, canRestore: deleted };
}

// ---- delete wording (SRS §20.6): transactions explain the money, masters explain the lock ----
const KEEP_AND_RESTORE = ['The record stays visible, tagged Deleted, with its details intact.', 'You can restore it at any time.'];

function billWording(bill) {
  const where = bill.billType === 'PARTY' ? `${bill.partyName ?? 'the party'}'s balance` : 'Cash in Hand';
  return {
    title: `Delete Bill ${bill.billNo}?`,
    confirmLabel: 'Delete Bill',
    intro: `Bill ${bill.billNo} will be marked as deleted. Nothing is erased.`,
    effects: [`${formatMoney(bill.grandTotal)} will be removed from ${where}.`, ...KEEP_AND_RESTORE],
  };
}

function voucherWording(voucher) {
  const amount = formatMoney(voucher.amount);
  return {
    title: `Delete Payment Voucher ${voucher.voucherNo}?`,
    confirmLabel: 'Delete Voucher',
    intro: `Voucher ${voucher.voucherNo} will be marked as deleted. Nothing is erased.`,
    effects: [
      `${voucher.partyName ?? 'The party'}'s balance will go up by ${amount} (the payment is reversed).`,
      `Cash in Hand will go down by ${amount}.`,
      ...KEEP_AND_RESTORE,
    ],
  };
}

function supplierPaymentWording(payment) {
  return {
    title: `Delete Supplier Payment ${payment.paymentNo}?`,
    confirmLabel: 'Delete Payment',
    intro: `Payment ${payment.paymentNo} will be marked as deleted. Nothing is erased.`,
    effects: [`Cash in Hand will go back up by ${formatMoney(payment.amount)}.`, ...KEEP_AND_RESTORE],
  };
}

function partyWording(party) {
  return {
    title: `Delete Party ${party.name}?`,
    confirmLabel: 'Delete Party',
    intro: `${party.name} will be marked as deleted. Its balance is ₹0, so no money moves.`,
    effects: [
      'The party and every bill and payment already linked to it stay in the system and remain visible.',
      'Those bills and payments can no longer be edited, deleted or restored until the party is restored.',
      'The party can no longer be chosen on a new bill or voucher.',
    ],
  };
}

function supplierWording(supplier) {
  return {
    title: `Delete Supplier ${supplier.name}?`,
    confirmLabel: 'Delete Supplier',
    intro: `${supplier.name} will be marked as deleted.`,
    effects: [
      'The supplier and its payment history stay in the system and remain visible.',
      'Those payments can no longer be edited, deleted or restored until the supplier is restored.',
      'The supplier can no longer be chosen for a new payment.',
    ],
  };
}

const lookups = { lookupParties, lookupSuppliers };

export const RECORD_TYPES = {
  bill: {
    label: 'Bill',
    numberOf: (r) => r.billNo,
    actionsOf: serverActions,
    deleteWording: billWording,
    editMode: 'route', // Edit opens the New Bill screen in edit mode (Phase 9), not a modal
    editPath: (r) => `/bills/${r.id}/edit`,
    ops: { remove: (r) => billApi.remove(r.id), restore: (r) => billApi.restore(r.id) },
  },
  voucher: {
    label: 'Payment Voucher',
    numberOf: (r) => r.voucherNo,
    actionsOf: serverActions,
    deleteWording: voucherWording,
    editMode: 'modal',
    Form: VoucherForm,
    ops: {
      save: (r, payload) => (r ? voucherApi.update(r.id, payload) : voucherApi.create(payload)),
      remove: (r) => voucherApi.remove(r.id),
      restore: (r) => voucherApi.restore(r.id),
      ...lookups,
    },
  },
  supplierPayment: {
    label: 'Supplier Payment',
    numberOf: (r) => r.paymentNo,
    actionsOf: serverActions,
    deleteWording: supplierPaymentWording,
    editMode: 'modal',
    Form: SupplierPaymentForm,
    ops: {
      save: (r, payload) => (r ? supplierPaymentApi.update(r.id, payload) : supplierPaymentApi.create(payload)),
      remove: (r) => supplierPaymentApi.remove(r.id),
      restore: (r) => supplierPaymentApi.restore(r.id),
      ...lookups,
    },
  },
  party: {
    label: 'Party',
    numberOf: (r) => r.name,
    actionsOf: partyActions,
    deleteWording: partyWording,
    editMode: 'modal',
    Form: PartyForm,
    ops: {
      save: (r, payload) => (r ? partyApi.update(r.id, payload) : partyApi.create(payload)),
      remove: (r) => partyApi.remove(r.id),
      restore: (r) => partyApi.restore(r.id),
    },
  },
  supplier: {
    label: 'Supplier',
    numberOf: (r) => r.name,
    actionsOf: supplierActions,
    deleteWording: supplierWording,
    editMode: 'modal',
    Form: SupplierForm,
    ops: {
      save: (r, payload) => (r ? supplierApi.update(r.id, payload) : supplierApi.create(payload)),
      remove: (r) => supplierApi.remove(r.id),
      restore: (r) => supplierApi.restore(r.id),
    },
  },
};

/**
 * One normalised answer for any record: which icons to show (driven by record.deleted) and which are
 * enabled (driven by the server's actions, or the Party balance guard). Reasons feed the tooltips.
 */
export function getRowState(type, record) {
  const actions = RECORD_TYPES[type].actionsOf(record) ?? {};
  const blocked = actions.blockedReason ?? null;
  return {
    deleted: Boolean(record.deleted),
    canEdit: Boolean(actions.canEdit),
    canDelete: Boolean(actions.canDelete),
    canRestore: Boolean(actions.canRestore),
    editReason: actions.editReason ?? blocked,
    deleteReason: actions.deleteReason ?? blocked,
    restoreReason: actions.restoreReason ?? blocked,
  };
}
