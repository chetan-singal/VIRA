import { cx } from '../../lib/cx';

/** tone: green | purple | blue | amber | red | muted (default grey). */
export default function Badge({ tone, className, children, ...rest }) {
  return (
    <span className={cx('badge', tone && `badge-${tone}`, className)} {...rest}>
      {children}
    </span>
  );
}
