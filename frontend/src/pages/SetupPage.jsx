import { Link } from 'react-router-dom';

/** The only screen reachable before setup completes. Phase 8 replaces this body with the real form. */
export default function SetupPage() {
  return (
    <div className="fullscreen">
      <div className="fullscreen-card">
        <div className="brand-mark" style={{ margin: '0 auto' }}>V</div>
        <h1>Welcome to VIRA</h1>
        <p>First-run setup has not been completed yet. The setup form (shop name, numbering prefixes, starting bill number and opening cash) is built in Phase 8.</p>
        <p className="subtle" style={{ marginTop: 12, fontSize: 12 }}>
          During development, complete setup once with request 1 of docs/phase6.http, then reload this page.
        </p>
        <p className="subtle" style={{ marginTop: 12, fontSize: 12 }}><Link to="/dev/components">Open the component gallery</Link> (development only)</p>
      </div>
    </div>
  );
}
