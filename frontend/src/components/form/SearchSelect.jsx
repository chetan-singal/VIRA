import { useEffect, useId, useRef, useState } from 'react';
import { cx } from '../../lib/cx';

/**
 * Type-ahead picker for Parties and Suppliers.
 *   value:   { id, label } or null
 *   search:  async (text) => [{ id, label, detail? }]   — must be a stable (memoised) function
 *   onChange({ id, label })
 * Keyboard: type to filter, Up/Down to move, Enter to choose, Esc to close the list only.
 */
export default function SearchSelect({ id, value, onChange, search, placeholder = 'Search…', disabled = false, invalid = false, emptyText = 'No matches' }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null); // the query the current items were fetched for
  const [active, setActive] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (!open) return undefined;
    const mine = ++latest.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await search(query.trim());
        if (mine === latest.current) {
          setItems(found);
          setLoadedFor(query.trim());
          setActive(0);
        }
      } catch {
        if (mine === latest.current) setItems([]);
      } finally {
        if (mine === latest.current) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, query, search]);

  function close() {
    setOpen(false);
    setTyping(false);
    setQuery('');
    setLoadedFor(null);
  }

  function choose(item) {
    onChange({ id: item.id, label: item.label });
    close();
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      // Only choose from a list that belongs to what is typed now: a stale list could pick the wrong party.
      if (loadedFor === query.trim() && items[active]) choose(items[active]);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close();
    }
  }

  return (
    <div className="combo">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid ? 'true' : undefined}
        autoComplete="off"
        className="input"
        disabled={disabled}
        placeholder={placeholder}
        value={typing ? query : value?.label ?? ''}
        onFocus={() => {
          setOpen(true);
          setTyping(true);
          setQuery('');
        }}
        onBlur={close}
        onChange={(e) => {
          setTyping(true);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id={listId} role="listbox" className="combo-list">
          {items.map((item, index) => (
            <li
              key={item.id}
              role="option"
              aria-selected={index === active}
              className={cx('combo-option', index === active && 'active')}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(item);
              }}
              onMouseEnter={() => setActive(index)}
            >
              <span>{item.label}</span>
              {item.detail && <small>{item.detail}</small>}
            </li>
          ))}
          {!loading && items.length === 0 && <li className="combo-empty">{emptyText}</li>}
          {loading && items.length === 0 && <li className="combo-empty">Searching…</li>}
        </ul>
      )}
    </div>
  );
}
