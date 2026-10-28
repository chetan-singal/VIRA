/** tabs: [{ key, label, count? }]. Controlled: the parent owns `active`. */
export default function Tabs({ tabs, active, onChange, label = 'Sections' }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab.key === active}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && tab.count !== null && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
