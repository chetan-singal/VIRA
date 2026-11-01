import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Balance } from './Money';

describe('Balance', () => {
  it('a positive balance is plain money unless showDue is set', () => {
    render(<Balance value={650} />);
    expect(screen.getByText('₹650.00')).not.toHaveClass('balance-due');
    expect(screen.queryByText('Due')).not.toBeInTheDocument();
  });

  it('with showDue a positive balance is red and tagged Due', () => {
    render(<Balance value={650} showDue />);
    expect(screen.getByText('₹650.00')).toHaveClass('balance-due');
    expect(screen.getByText('Due')).toBeInTheDocument();
  });

  it('a negative balance reads Advance / Credit, with or without showDue', () => {
    const { rerender } = render(<Balance value={-300} showDue />);
    expect(screen.getByText('₹300.00')).toBeInTheDocument();
    expect(screen.getByText('Advance / Credit')).toBeInTheDocument();
    expect(screen.queryByText('Due')).not.toBeInTheDocument();

    rerender(<Balance value={-300} />);
    expect(screen.getByText('Advance / Credit')).toBeInTheDocument();
  });

  it('zero has no tag and a missing balance shows a dash', () => {
    const { rerender } = render(<Balance value={0} showDue />);
    expect(screen.getByText('₹0.00')).toBeInTheDocument();
    expect(screen.queryByText('Due')).not.toBeInTheDocument();

    rerender(<Balance value={null} showDue />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});