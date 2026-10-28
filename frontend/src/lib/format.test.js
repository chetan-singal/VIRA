import { describe, expect, it } from 'vitest';
import { clockParts, formatDate, formatDateTime, formatMoney, formatTime, greeting, isZeroMoney, todayIso } from './format';

describe('formatMoney', () => {
  it('uses the rupee sign, Indian digit grouping and two decimals', () => {
    expect(formatMoney(1234567.5)).toBe('₹12,34,567.50');
    expect(formatMoney(450)).toBe('₹450.00');
    expect(formatMoney('99.9')).toBe('₹99.90');
  });

  it('shows a minus sign for negatives but never for a value that rounds to zero', () => {
    expect(formatMoney(-250)).toBe('-₹250.00');
    expect(formatMoney(-0.001)).toBe('₹0.00');
  });

  it('shows a dash for missing or non-numeric values', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('')).toBe('—');
    expect(formatMoney('abc')).toBe('—');
  });
});

describe('isZeroMoney', () => {
  it('is true only for exactly zero at two decimals', () => {
    expect(isZeroMoney(0)).toBe(true);
    expect(isZeroMoney('0.00')).toBe(true);
    expect(isZeroMoney(0.004)).toBe(true);
    expect(isZeroMoney(0.01)).toBe(false);
    expect(isZeroMoney(-650)).toBe(false);
    expect(isZeroMoney(null)).toBe(false);
  });
});

describe('dates', () => {
  it('formats the three Settings patterns without any timezone shift', () => {
    expect(formatDate('2026-10-25')).toBe('25-10-2026');
    expect(formatDate('2026-10-25', 'DD-MM-YYYY')).toBe('25-10-2026');
    expect(formatDate('2026-10-25', 'MM-DD-YYYY')).toBe('10-25-2026');
    expect(formatDate('2026-10-25', 'YYYY-MM-DD')).toBe('2026-10-25');
    expect(formatDate('2026-10-25T23:59:59.999')).toBe('25-10-2026');
  });

  it('shows a dash for anything that is not an ISO date', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('25/10/2026')).toBe('—');
  });

  it('formats times on a 12-hour clock', () => {
    expect(formatTime('2026-10-25T14:05:09.123')).toBe('02:05 PM');
    expect(formatTime('2026-10-25T00:00:00')).toBe('12:00 AM');
    expect(formatTime('2026-10-25T12:30:00')).toBe('12:30 PM');
    expect(formatTime('2026-10-25')).toBe('');
  });

  it('joins date and time, or just the date when there is no time', () => {
    expect(formatDateTime('2026-10-25T14:05:00', 'YYYY-MM-DD')).toBe('2026-10-25 02:05 PM');
    expect(formatDateTime('2026-10-25')).toBe('25-10-2026');
  });

  it('todayIso uses the local calendar date', () => {
    expect(todayIso(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });

  it('greets by the hour', () => {
    expect(greeting(new Date(2026, 9, 5, 9))).toBe('Good Morning');
    expect(greeting(new Date(2026, 9, 5, 14))).toBe('Good Afternoon');
    expect(greeting(new Date(2026, 9, 5, 19))).toBe('Good Evening');
  });

  it('builds the header clock parts', () => {
    expect(clockParts(new Date(2026, 9, 25, 14, 5))).toEqual({ date: 'Sun, 25 Oct 2026', time: '02:05 PM' });
  });
});
