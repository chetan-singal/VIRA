import { useState } from "react";
import React from "react";
const menu = [
  "Home",
  "Dashboard",
  "New Bill",
  "Daybook",
  "Parties",
  "Items",
  "Suppliers",
  "Payment Vouchers",
  "Part Search",
  "Shop Profile",
  "Settings"
];

function App() {
  const [page, setPage] = useState("Home");

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <div className="brand-name">VIRA</div>
            <div className="brand-subtitle">Billing & Business Management</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="status-dot" />
          <span>Local</span>
        </div>
      </header>

      <aside className="sidebar">
        <div className="menu-title">MAIN MENU</div>
        {menu.map((item) => (
          <button
            key={item}
            className={`menu-item ${page === item ? "active" : ""}`}
            onClick={() => setPage(item)}
          >
            {item}
          </button>
        ))}
        <div className="sidebar-bottom">
          <button className="menu-item exit" onClick={() => window.close()}>
            Exit
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="page-header">
          <div>
            <div className="eyebrow">VIRA</div>
            <h1>{page}</h1>
          </div>
          <div className="date-box">
            <span>Today</span>
            <strong>{new Date().toLocaleDateString("en-IN")}</strong>
          </div>
        </div>

        {page === "Home" ? <Home /> : <ComingSoon page={page} />}
      </main>
    </div>
  );
}

function Home() {
  return (
    <section>
      <div className="welcome-card">
        <div>
          <span className="eyebrow">WELCOME</span>
          <h2>Welcome to VIRA</h2>
          <p>Billing and business management for your spare-parts shop.</p>
        </div>
        <button className="primary" onClick={() => alert("New Bill module coming next.")}>
          Create New Bill
        </button>
      </div>

      <div className="stats-grid">
        <Stat title="Total Sales" value="₹0.00" />
        <Stat title="Cash Bill Sales" value="₹0.00" />
        <Stat title="Party Sales" value="₹0.00" />
        <Stat title="Cash in Hand" value="₹0.00" />
      </div>

      <div className="home-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions">
            <QuickAction title="New Bill" />
            <QuickAction title="Add Party" />
            <QuickAction title="Add Item" />
            <QuickAction title="Payment Voucher" />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="empty-state">
            <div className="empty-icon">—</div>
            <strong>No transactions yet</strong>
            <span>Your recent bills and payments will appear here.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ title, value }) {
  return (
    <div className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function QuickAction({ title }) {
  return (
    <button className="quick-action" onClick={() => alert(`${title} module coming next.`)}>
      <span>{title}</span>
      <b>→</b>
    </button>
  );
}

function ComingSoon({ page }) {
  return (
    <div className="panel module-placeholder">
      <div className="empty-icon">V</div>
      <h2>{page}</h2>
      <p>This module is part of the VIRA application and will be implemented next.</p>
    </div>
  );
}

export default App;
