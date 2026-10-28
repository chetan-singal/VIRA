import { Link, useLocation } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { cx } from '../lib/cx';
import { isActive, MENU } from '../lib/menu';
import { useAppState } from '../state/AppState';

function NavEntry({ item, pathname, onExit }) {
  const content = (
    <>
      <Icon name={item.icon} size={18} />
      <span>{item.label}</span>
    </>
  );
  if (item.action === 'exit') {
    return (
      <button type="button" className="nav-item" onClick={onExit}>
        {content}
      </button>
    );
  }
  const active = isActive(item, pathname);
  return (
    <Link to={item.path} className={cx('nav-item', active && 'active')} aria-current={active ? 'page' : undefined}>
      {content}
    </Link>
  );
}

/** The 12-item main menu (SRS §3), identical on every screen. Settings and Exit sit at the bottom. */
export default function Sidebar({ onExit }) {
  const { pathname } = useLocation();
  const { shop } = useAppState();
  const top = MENU.filter((m) => m.placement !== 'bottom');
  const bottom = MENU.filter((m) => m.placement === 'bottom');

  return (
    <aside className="sidebar" aria-label="Main menu">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">V</div>
        <div className="brand-text">
          <div className="brand-name truncate">{shop?.shopName ?? 'VIRA'}</div>
          <div className="brand-sub">VIRA · Billing</div>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Pages">
        <ul>
          {top.map((item) => (
            <li key={item.key}><NavEntry item={item} pathname={pathname} onExit={onExit} /></li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-bottom">
        <ul>
          {bottom.map((item) => (
            <li key={item.key}><NavEntry item={item} pathname={pathname} onExit={onExit} /></li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
