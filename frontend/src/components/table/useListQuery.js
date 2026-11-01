import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * State for a searchable, filterable, paged list. The screen shows `search` in its box; the list API gets `params`.
 *
 *   const list = useListQuery({ filters: { type: '', categoryId: '' }, size: 10, sort: 'name,asc' });
 *   const { data } = useApi((signal) => itemApi.list(list.params, { signal }), [list.params]);
 *
 *  - typing changes `search` at once, but `params.q` follows `delay` ms after the last keystroke;
 *  - any change of search, filter or page size returns to page 0 (the backend counts pages from 0);
 *  - clear() empties the search and the filters named in `clearable` (default: all of them).
 * `params` keeps the same identity until something in it changes, so it is safe as a useApi dependency.
 */
export function useListQuery({ filters: initialFilters = {}, clearable, size: initialSize = 10, sort, delay = 250 } = {}) {
  const initial = useRef({ filters: initialFilters, clearable: clearable ?? Object.keys(initialFilters) });
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState({ q: '', filters: initialFilters, page: 0, size: initialSize });

  useEffect(() => {
    const text = search.trim();
    if (text === applied.q) return undefined;
    const timer = setTimeout(() => setApplied((a) => ({ ...a, q: text, page: 0 })), delay);
    return () => clearTimeout(timer);
  }, [search, applied.q, delay]);

  const setFilter = useCallback((name, value) => {
    setApplied((a) => ({ ...a, filters: { ...a.filters, [name]: value }, page: 0 }));
  }, []);

  const setPage = useCallback((page) => setApplied((a) => ({ ...a, page })), []);

  const setSize = useCallback((size) => setApplied((a) => ({ ...a, size, page: 0 })), []);

  const clear = useCallback(() => {
    setSearch('');
    setApplied((a) => {
      const filters = { ...a.filters };
      for (const name of initial.current.clearable) filters[name] = initial.current.filters[name];
      return { q: '', filters, page: 0, size: a.size };
    });
  }, []);

  const params = useMemo(
    () => ({ q: applied.q, ...applied.filters, page: applied.page, size: applied.size, sort }),
    [applied, sort],
  );

  const isFiltered = search.trim() !== '' || initial.current.clearable.some((name) => applied.filters[name] !== initial.current.filters[name]);

  return { search, setSearch, filters: applied.filters, setFilter, page: applied.page, setPage, size: applied.size, setSize, clear, params, isFiltered };
}