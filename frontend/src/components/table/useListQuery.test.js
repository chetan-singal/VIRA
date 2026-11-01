import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useListQuery } from './useListQuery';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useListQuery', () => {
  it('sends the search only after the typing delay', () => {
    const { result } = renderHook(() => useListQuery({ delay: 250 }));

    act(() => result.current.setSearch('ram'));
    expect(result.current.search).toBe('ram');
    expect(result.current.params.q).toBe('');

    act(() => { vi.advanceTimersByTime(249); });
    expect(result.current.params.q).toBe('');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.params.q).toBe('ram');
  });

  it('keeps the same params object when typing is undone inside the delay', () => {
    const { result } = renderHook(() => useListQuery());
    const before = result.current.params;

    act(() => result.current.setSearch('a'));
    act(() => { vi.advanceTimersByTime(100); });
    act(() => result.current.setSearch(''));
    act(() => { vi.advanceTimersByTime(1000); });

    expect(result.current.params).toBe(before);
  });

  it('returns to page 0 when the search, a filter or the page size changes', () => {
    const { result } = renderHook(() => useListQuery({ filters: { type: '' }, sort: 'name,asc' }));

    act(() => result.current.setPage(3));
    expect(result.current.params.page).toBe(3);

    act(() => result.current.setFilter('type', 'MRP'));
    expect(result.current.params).toMatchObject({ page: 0, type: 'MRP', sort: 'name,asc' });

    act(() => result.current.setPage(2));
    act(() => result.current.setSize(20));
    expect(result.current.params).toMatchObject({ page: 0, size: 20 });

    act(() => result.current.setPage(2));
    act(() => result.current.setSearch('chain'));
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.params).toMatchObject({ page: 0, q: 'chain' });
  });

  it('clear empties the search and the clearable filters but keeps the rest', () => {
    const { result } = renderHook(() => useListQuery({ filters: { deleted: false, type: '' }, clearable: ['type'], size: 20 }));

    act(() => result.current.setFilter('deleted', true));
    act(() => result.current.setFilter('type', 'MRP'));
    act(() => result.current.setSearch('chain'));
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.isFiltered).toBe(true);

    act(() => result.current.clear());

    expect(result.current.search).toBe('');
    expect(result.current.params).toMatchObject({ q: '', deleted: true, type: '', page: 0, size: 20 });
    expect(result.current.isFiltered).toBe(false);
  });
});