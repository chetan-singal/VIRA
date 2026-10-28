import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import ConfirmDialog from './ConfirmDialog';

function setup(props = {}) {
  const onCancel = vi.fn();
  const onConfirm = props.onConfirm ?? vi.fn().mockResolvedValue(undefined);
  render(
    <ConfirmDialog open tone="danger" title="Delete Bill C-1?" confirmLabel="Delete Bill" onCancel={onCancel} onConfirm={onConfirm}>
      <p>Bill C-1 will be marked as deleted.</p>
    </ConfirmDialog>,
  );
  return { onCancel, onConfirm, user: userEvent.setup() };
}

describe('ConfirmDialog', () => {
  it('shows the title and body and puts the focus on the safe button', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Delete Bill C-1?' })).toBeInTheDocument();
    expect(screen.getByText('Bill C-1 will be marked as deleted.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('Esc and Cancel both cancel without confirming', async () => {
    const { onCancel, onConfirm, user } = setup();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('locks both buttons while the confirm is running', async () => {
    let finish;
    const onConfirm = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    const { user } = setup({ onConfirm });

    await user.click(screen.getByRole('button', { name: 'Delete Bill' }));

    expect(screen.getByRole('button', { name: 'Delete Bill' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled());
  });

  it('keeps the dialog open and shows the reason when the confirm fails', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'PARTY_INACTIVE', message: 'The party is deleted.' }));
    const { user } = setup({ onConfirm });

    await user.click(screen.getByRole('button', { name: 'Delete Bill' }));

    expect(await screen.findByText('The party is deleted.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Bill' })).toBeEnabled();
  });
});
