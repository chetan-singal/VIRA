import { APP_VERSION } from '../config';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { cx } from '../lib/cx';
import { useAppState } from '../state/AppState';

/** "Ready | Database connected (local)" strip at the bottom of every screen. */
export default function StatusBar() {
  const online = useBackendStatus();
  const { shop } = useAppState();
  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-left">
        <span className={cx('status-dot', !online && 'offline')} aria-hidden="true" />
        <span>{online ? 'Ready' : 'Backend not reachable'}</span>
        <span className="status-sep" aria-hidden="true" />
        <span>{online ? 'Database connected (local)' : 'Retrying every 30 seconds…'}</span>
      </div>
      <div className="status-right">
        <span>{shop?.shopName ?? 'VIRA'}</span>
        <span className="status-sep" aria-hidden="true" />
        <span>v{APP_VERSION}</span>
      </div>
    </footer>
  );
}
