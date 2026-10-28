import { cx } from '../../lib/cx';
import Icon from './Icon';

export function Panel({ title, icon, actions, flush = false, className, children }) {
  return (
    <section className={cx('panel', className)}>
      {(title || actions) && (
        <header className="panel-head">
          <h2 className="panel-title">{icon && <Icon name={icon} size={17} />}{title}</h2>
          {actions && <div className="row">{actions}</div>}
        </header>
      )}
      <div className={cx('panel-body', flush && 'flush')}>{children}</div>
    </section>
  );
}

/** tone: blue | green | orange | purple | pink | red */
export function StatCard({ tone = 'blue', icon, label, value, hint }) {
  return (
    <div className={cx('stat-card', `tone-${tone}`)}>
      {icon && <div className="stat-icon"><Icon name={icon} size={20} /></div>}
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value num">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}
