/** Keeps digits, one dot and at most two decimals (and a leading minus when allowed). */
export function sanitizeMoney(raw, allowNegative = false) {
  let s = String(raw ?? '').replace(/[^\d.-]/g, '');
  const negative = allowNegative && s.startsWith('-');
  s = s.replace(/-/g, '');
  const [whole, ...rest] = s.split('.');
  const decimals = rest.join('').slice(0, 2);
  const text = rest.length > 0 ? `${whole}.${decimals}` : whole;
  return negative ? `-${text}` : text;
}

/** "" / "-" / "." -> null, otherwise a Number (the backend rounds and validates). */
export function moneyOrNull(text) {
  const t = String(text ?? '').trim();
  if (t === '' || t === '-' || t === '.' || t === '-.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function emptyToNull(text) {
  const t = String(text ?? '').trim();
  return t === '' ? null : t;
}

/** Fixed Jackson setting on the backend: unknown JSON properties are rejected, so only send known fields. */
export function pick(source, keys) {
  return Object.fromEntries(keys.map((k) => [k, source[k]]));
}
