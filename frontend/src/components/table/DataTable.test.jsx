import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import DataTable from './DataTable';

const columns = [
  { key: 'no', header: 'No.' },
  { key: 'name', header: 'Name', render: (r) => r.name.toUpperCase() },
];
const rows = [{ id: 1, no: 'A-1', name: 'first' }, { id: 2, no: 'A-2', name: 'second', deleted: true }];

describe('DataTable', () => {
  it('renders headers and cells, using a column render function when given', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('A-1')).toBeInTheDocument();
    expect(screen.getByText('FIRST')).toBeInTheDocument();
  });

  it('mutes rows flagged deleted', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByText('A-2').closest('tr')).toHaveClass('row-deleted');
    expect(screen.getByText('A-1').closest('tr')).not.toHaveClass('row-deleted');
  });

  it('shows a loading state, an empty state and an error with Try again', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<DataTable columns={columns} rows={[]} loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');

    rerender(<DataTable columns={columns} rows={[]} emptyTitle="No bills yet" />);
    expect(screen.getByText('No bills yet')).toBeInTheDocument();

    rerender(<DataTable columns={columns} rows={[]} error={new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Cannot reach the VIRA backend.' })} onRetry={onRetry} />);
    expect(screen.getByText('Cannot reach the VIRA backend.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('makes rows clickable for master-detail screens', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} onRowClick={onRowClick} selectedKey={1} />);
    await userEvent.click(screen.getByText('A-2'));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
    expect(screen.getByText('A-1').closest('tr')).toHaveClass('selected');
  });
});
