/* Display-only helpers. No business arithmetic lives in the frontend. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const moneyFormat = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const countFormat = new Intl.NumberFormat('en-IN');

const pad = (n) => String(n).padStart(2, '0');

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 1234567.5 -> "₹12,34,567.50"; null -> "—". */
export function formatMoney(value) {
  const n = toNumber(value);
  if (n === null) return '—';
  const text = `₹${moneyFormat.format(Math.abs(n))}`;
  return n < 0 && Math.round(Math.abs(n) * 100) > 0 ? `-${text}` : text;
}

export function formatCount(value) {
  const n = toNumber(value);
  return n === null ? '—' : countFormat.format(n);
}

/** True when the amount is exactly zero at 2 decimal places. */
export function isZeroMoney(value) {
  const n = toNumber(value);
  return n !== null && Math.round(Math.abs(n) * 100) === 0;
}

/** Splits "2026-10-25" or "2026-10-25T14:05:09.123" into parts without any timezone maths. */
function parts(iso) {
  if (typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return null;
  return { y: m[1], mo: m[2], d: m[3], h: m[4] === undefined ? null : Number(m[4]), mi: m[5] ?? null };
}

/** pattern is one of the three Settings values: DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD. */
export function formatDate(iso, pattern = 'DD-MM-YYYY') {
  const p = parts(iso);
  if (!p) return '—';
  if (pattern === 'YYYY-MM-DD') return `${p.y}-${p.mo}-${p.d}`;
  if (pattern === 'MM-DD-YYYY') return `${p.mo}-${p.d}-${p.y}`;
  return `${p.d}-${p.mo}-${p.y}`;
}

/** "02:05 PM" from an ISO date-time, or "" when there is no time part. */
export function formatTime(iso) {
  const p = parts(iso);
  if (!p || p.h === null) return '';
  const suffix = p.h >= 12 ? 'PM' : 'AM';
  const hour12 = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${pad(hour12)}:${p.mi} ${suffix}`;
}

export function formatDateTime(iso, pattern = 'DD-MM-YYYY') {
  const date = formatDate(iso, pattern);
  const time = formatTime(iso);
  return time ? `${date} ${time}` : date;
}

/** Today's date as YYYY-MM-DD in the PC's local time zone (what the date inputs and the API expect). */
export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** "Sun, 25 Oct 2026" and "02:05 PM" for the header clock. */
export function clockParts(now = new Date()) {
  const date = `${WEEKDAYS[now.getDay()]}, ${pad(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  return { date, time: formatTime(`${todayIso(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`) };
}

export function initialOf(text) {
  const t = (text || '').trim();
  return t ? t[0].toUpperCase() : 'V';
}
