/*
 * Helpers for the Transaction History tab of the Selected Party page (SRS §9.3, amendment A9).
 * The history is the party's bills and its payment vouchers merged in the browser. Both lists arrive
 * newest first, so the first K rows of the merged list always lie inside the first K rows of each list.
 */

/** The backend never returns more than 100 rows in one page (spring.data.web.pageable.max-page-size). */
export const MAX_PAGE_SIZE = 100;

/** Newest first: date, then the higher id, then a bill before a payment. Dates are ISO text, so text order is date order. */
function newestFirst(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.id !== b.id) return b.id - a.id;
  if (a.kind !== b.kind) return a.kind === 'bill' ? -1 : 1;
  return 0;
}

/**
 * Merges bills (Daybook rows) and payment vouchers into one list, newest first, and keeps the first `limit` rows.
 * Each row is { key, kind: 'bill' | 'payment', id, date, deleted, record }.
 */
export function mergeTransactions(bills, vouchers, limit) {
  const rows = [
    ...bills.map((record) => ({
      key: `bill-${record.id}`, kind: 'bill', id: record.id, date: record.billDate, deleted: Boolean(record.deleted), record,
    })),
    ...vouchers.map((record) => ({
      key: `payment-${record.id}`, kind: 'payment', id: record.id, date: record.paymentDate, deleted: Boolean(record.deleted), record,
    })),
  ];
  rows.sort(newestFirst);
  return rows.slice(0, limit);
}

/**
 * The newest `count` rows of a list that answers load({ page, size }) with a page (content, totalElements), newest first.
 * Up to 100 rows are asked for at a time, so a count above 100 is fetched as several equal pages.
 * Returns { rows, total }: total is the full size of the list, so the caller can tell whether more rows exist.
 */
export async function fetchNewest(load, count) {
  const pages = Math.ceil(count / MAX_PAGE_SIZE);
  const size = Math.ceil(count / pages);
  const rows = [];
  let total = 0;
  for (let page = 0; page < pages; page += 1) {
    const result = await load({ page, size });
    total = result.totalElements;
    rows.push(...result.content);
    if (result.content.length < size || rows.length >= total) break;
  }
  return { rows: rows.slice(0, count), total };
}