import { Navigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import { InlineAlert, Spinner } from '../components/ui/Feedback';
import { describeError } from '../lib/errors';
import { useAppState } from '../state/AppState';

export function SplashScreen({ label = 'Starting VIRA…' }) {
  return (
    <div className="fullscreen">
      <div className="fullscreen-card">
        <Spinner large label={label} />
        <p style={{ marginTop: 14 }}>{label}</p>
      </div>
    </div>
  );
}

export function BackendDown({ error, onRetry }) {
  return (
    <div className="fullscreen">
      <div className="fullscreen-card">
        <h1>VIRA can’t reach its backend</h1>
        <p>Start the VIRA backend (it listens on 127.0.0.1:8080), then try again.</p>
        <InlineAlert tone="error" className="form-error" title="Details">{describeError(error)}</InlineAlert>
        <Button variant="primary" icon="refresh" onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}

/**
 * Until first-run setup is complete only /setup is reachable (SRS §18.3). The backend stays permissive on
 * purpose (decision D8), so this gate is the only thing that enforces it.
 */
export default function SetupGate({ children }) {
  const { setup, checkSetup } = useAppState();
  const { pathname } = useLocation();

  if (setup.status === 'loading') return <SplashScreen />;
  if (setup.status === 'error') return <BackendDown error={setup.error} onRetry={checkSetup} />;
  const devGallery = import.meta.env.DEV && pathname === '/dev/components';
  if (!setup.complete && pathname !== '/setup' && !devGallery) return <Navigate to="/setup" replace />;
  if (setup.complete && pathname === '/setup') return <Navigate to="/" replace />;
  return children;
}
