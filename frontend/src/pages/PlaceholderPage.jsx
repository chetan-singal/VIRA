import { Link } from 'react-router-dom';
import { Panel } from '../components/ui/Cards';
import Icon from '../components/ui/Icon';

/** Stands in for a screen that a later phase builds, so every menu route already works. */
export default function PlaceholderPage({ title, phase, summary, items = [] }) {
  return (
    <Panel>
      <div className="placeholder">
        <Icon name="gear" size={40} className="subtle" />
        <div className="placeholder-phase">Built in Phase {phase}</div>
        <h2>{title}</h2>
        {summary && <p className="muted">{summary}</p>}
        {items.length > 0 && <ul>{items.map((line) => <li key={line}>{line}</li>)}</ul>}
        <Link to="/" style={{ marginTop: 12 }}>Back to Home</Link>
      </div>
    </Panel>
  );
}

export function NotFoundPage() {
  return (
    <Panel>
      <div className="placeholder">
        <h2>Page not found</h2>
        <p className="muted">That address does not match any VIRA screen.</p>
        <Link to="/">Back to Home</Link>
      </div>
    </Panel>
  );
}
