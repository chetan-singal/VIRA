/** The 12 main-menu items, in the exact order of SRS §3. Reports is deliberately absent. */
export const MENU = [
  { key: 'home', label: 'Home', icon: 'home', path: '/', subtitle: 'Counter quick access' },
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard', subtitle: 'Business overview at a glance' },
  { key: 'new-bill', label: 'New Bill', icon: 'newBill', path: '/bills/new', also: ['/bills'], subtitle: 'Cash Bill and Party Bill' },
  { key: 'daybook', label: 'Daybook', icon: 'daybook', path: '/daybook', subtitle: 'Search and manage every bill' },
  { key: 'parties', label: 'Parties', icon: 'parties', path: '/parties', subtitle: 'Customers, balances and rates' },
  { key: 'items', label: 'Items', icon: 'items', path: '/items', subtitle: 'Item master and pricing' },
  { key: 'suppliers', label: 'Suppliers', icon: 'suppliers', path: '/suppliers', subtitle: 'Suppliers and outgoing payments' },
  { key: 'vouchers', label: 'Payment Vouchers', icon: 'vouchers', path: '/payment-vouchers', subtitle: 'Payments received from parties' },
  { key: 'part-search', label: 'Part Search', icon: 'search', path: '/part-search', subtitle: 'Find a part by name, category or bike' },
  { key: 'shop-profile', label: 'Shop Profile', icon: 'shop', path: '/shop-profile', subtitle: 'Shop details and bill presentation' },
  { key: 'settings', label: 'Settings', icon: 'settings', path: '/settings', subtitle: 'Application preferences', placement: 'bottom' },
  { key: 'exit', label: 'Exit', icon: 'exit', action: 'exit', placement: 'bottom' },
];

function underPath(pathname, base) {
  return base === '/' ? pathname === '/' : pathname === base || pathname.startsWith(`${base}/`);
}

export function isActive(item, pathname) {
  if (!item.path) return false;
  return [item.path, ...(item.also ?? [])].some((base) => underPath(pathname, base));
}

/** Page title and subtitle for the header; pages can override both with usePageTitle(). */
export function titleFor(pathname) {
  if (pathname === '/setup') return { title: 'First-run setup', subtitle: 'Shop details, numbering and opening cash' };
  if (/^\/bills\/[^/]+\/edit$/.test(pathname)) return { title: 'Edit Bill', subtitle: 'Change a saved bill' };
  if (pathname === '/dev/components') return { title: 'Component Gallery', subtitle: 'Phase 7 shared components, with stub data' };
  const item = MENU.find((m) => isActive(m, pathname) && m.path);
  return item ? { title: item.label, subtitle: item.subtitle } : { title: 'VIRA', subtitle: '' };
}
