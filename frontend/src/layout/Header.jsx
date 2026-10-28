import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { clockParts, initialOf } from '../lib/format';
import { titleFor } from '../lib/menu';
import { useAppState } from '../state/AppState';
import { usePageTitleState } from './PageTitle';

/** Page title on the left; the date, time and shop badge on the right. VIRA is single-user: no login, no role menu. */
export default function Header() {
  const { pathname } = useLocation();
  const { override } = usePageTitleState();
  const { shop } = useAppState();
  const [now, setNow] = useState(() => new Date());
  const meta = override ?? titleFor(pathname);
  const clock = clockParts(now);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.title = `${meta.title} · VIRA`;
  }, [meta.title]);

  return (
    <header className="app-header">
      <div>
        <h1 className="header-title">{meta.title}</h1>
        {meta.subtitle && <p className="header-subtitle">{meta.subtitle}</p>}
      </div>
      <div className="header-right">
        <div className="header-clock"><strong>{clock.date}</strong> &nbsp;|&nbsp; {clock.time}</div>
        <div className="shop-chip" title={shop?.shopName ?? 'VIRA'}>
          <span className="shop-chip-avatar" aria-hidden="true">{initialOf(shop?.shopName ?? 'VIRA')}</span>
          <span className="truncate">{shop?.shopName ?? 'VIRA'}</span>
        </div>
      </div>
    </header>
  );
}
