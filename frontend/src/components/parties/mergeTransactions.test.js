import { describe, expect, it, vi } from 'vitest';
import { fetchNewest, mergeTransactions } from './mergeTransactions';

const bill = (id, billDate, extra) => ({ id, billNo: `B-${id}`, billDate, deleted: false, ...extra });
const voucher = (id, paymentDate, extra) => ({ id, voucherNo: `PV-${id}`, paymentDate, deleted: false, ...extra });
const keys = (rows) => rows.map((r) => r.key);

describe('mergeTransactions', () => {
  it('puts bills and payments in one list, newest date first', () => {
    const rows = mergeTransactions(
      [bill(3, '2026-10-20'), bill(2, '2026-10-05')],
      [voucher(9, '2026-10-25'), voucher(8, '2026-10-10')],
      20,
    );
    expect(keys(rows)).toEqual(['payment-9', 'bill-3', 'payment-8', 'bill-2']);
  });

  it('on the same date shows the higher id first, whatever the kind', () => {
    const rows = mergeTransactions(
      [bill(4, '2026-10-20'), bill(7, '2026-10-20')],
      [voucher(5, '2026-10-20')],
      20,
    );
    expect(keys(rows)).toEqual(['bill-7', 'payment-5', 'bill-4']);
  });

  it('on the same date and the same id shows the bill before the payment', () => {
    const rows = mergeTransactions([bill(6, '2026-10-20')], [voucher(6, '2026-10-20')], 20);
    expect(keys(rows)).toEqual(['bill-6', 'payment-6']);
  });

  it('keeps only the first rows up to the limit', () => {
    const rows = mergeTransactions(
      [bill(3, '2026-10-30'), bill(2, '2026-10-10'), bill(1, '2026-10-01')],
      [voucher(2, '2026-10-20'), voucher(1, '2026-10-02')],
      3,
    );
    expect(keys(rows)).toEqual(['bill-3', 'payment-2', 'bill-2']);
  });

  it('works when either list is empty, or both', () => {
    expect(keys(mergeTransactions([bill(1, '2026-10-01')], [], 20))).toEqual(['bill-1']);
    expect(keys(mergeTransactions([], [voucher(1, '2026-10-01')], 20))).toEqual(['payment-1']);
    expect(mergeTransactions([], [], 20)).toEqual([]);
  });

  it('describes each row: kind, key, date, deleted flag and the original record', () => {
    const b = bill(1, '2026-10-01', { deleted: true });
    const v = voucher(1, '2026-10-02');
    const [payment, billRow] = mergeTransactions([b], [v], 20);

    expect(payment).toEqual({ key: 'payment-1', kind: 'payment', id: 1, date: '2026-10-02', deleted: false, record: v });
    expect(billRow).toEqual({ key: 'bill-1', kind: 'bill', id: 1, date: '2026-10-01', deleted: true, record: b });
  });
});

/** A fake list endpoint over `total` rows, newest first, that answers like the backend's page response. */
function fakeList(total) {
  const all = Array.from({ length: total }, (_, i) => ({ id: total - i }));
  return vi.fn(({ page, size }) => Promise.resolve({
    content: all.slice(page * size, page * size + size), page, size, totalElements: total, totalPages: Math.ceil(total / size),
  }));
}

describe('fetchNewest', () => {
  it('asks for the whole count in one request when it fits in a page', async () => {
    const load = fakeList(300);
    const { rows, total } = await fetchNewest(load, 40);

    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith({ page: 0, size: 40 });
    expect(rows).toHaveLength(40);
    expect(rows[0].id).toBe(300);
    expect(total).toBe(300);
  });

  it('asks for exactly 100 rows in one request at the page limit', async () => {
    const load = fakeList(300);
    const { rows } = await fetchNewest(load, 100);

    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith({ page: 0, size: 100 });
    expect(rows).toHaveLength(100);
  });

  it('fetches a count above 100 as equal pages and returns the rows in order', async () => {
    const load = fakeList(500);
    const { rows, total } = await fetchNewest(load, 120);

    expect(load.mock.calls.map(([args]) => args)).toEqual([{ page: 0, size: 60 }, { page: 1, size: 60 }]);
    expect(rows).toHaveLength(120);
    expect(rows.map((r) => r.id)).toEqual(Array.from({ length: 120 }, (_, i) => 500 - i));
    expect(total).toBe(500);
  });

  it('trims the rows when the pages hold more than the count', async () => {
    const load = fakeList(500);
    const { rows } = await fetchNewest(load, 101);

    expect(load.mock.calls.map(([args]) => args)).toEqual([{ page: 0, size: 51 }, { page: 1, size: 51 }]);
    expect(rows).toHaveLength(101);
  });

  it('stops when the list has fewer rows than asked for', async () => {
    const load = fakeList(30);
    const { rows, total } = await fetchNewest(load, 120);

    expect(load).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(30);
    expect(total).toBe(30);
  });

  it('returns no rows and a zero total for an empty list', async () => {
    const load = fakeList(0);
    expect(await fetchNewest(load, 20)).toEqual({ rows: [], total: 0 });
  });
});