import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadges from './StatusBadges';

describe('StatusBadges', () => {
  it('renders nothing for a normal record', () => {
    const { container } = render(<StatusBadges record={{ edited: false, deleted: false }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Revised alone, with the edit date as its tooltip', () => {
    render(<StatusBadges record={{ edited: true, lastEditedAt: '2026-10-25T11:30:00', deleted: false }} />);
    expect(screen.getByText('Revised')).toHaveAttribute('title', 'Revised on 25-10-2026 11:30 AM');
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('renders Deleted alone', () => {
    render(<StatusBadges deleted deletedAt="2026-10-25T09:00:00" />);
    expect(screen.getByText('Deleted')).toHaveAttribute('title', 'Deleted on 25-10-2026 09:00 AM');
    expect(screen.queryByText('Revised')).not.toBeInTheDocument();
  });

  it('renders both together when a bill was edited and later deleted', () => {
    render(<StatusBadges record={{ edited: true, deleted: true }} />);
    expect(screen.getByText('Revised')).toBeInTheDocument();
    expect(screen.getByText('Deleted')).toBeInTheDocument();
  });
});
