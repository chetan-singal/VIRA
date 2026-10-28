import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

function setup(path = '/', onExit = vi.fn()) {
  const { container } = render(<MemoryRouter initialEntries={[path]}><Sidebar onExit={onExit} /></MemoryRouter>);
  return { container, onExit };
}

describe('Sidebar', () => {
  it('has exactly the 12 menu items of SRS §3, in order, and no Reports', () => {
    const { container } = setup();
    const labels = [...container.querySelectorAll('.nav-item')].map((el) => el.textContent);
    expect(labels).toEqual([
      'Home', 'Dashboard', 'New Bill', 'Daybook', 'Parties', 'Items', 'Suppliers',
      'Payment Vouchers', 'Part Search', 'Shop Profile', 'Settings', 'Exit',
    ]);
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
  });

  it('highlights the current page, including pages below it', () => {
    setup('/parties/12');
    expect(screen.getByRole('link', { name: 'Parties' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('highlights New Bill while a bill is being edited', () => {
    setup('/bills/7/edit');
    expect(screen.getByRole('link', { name: 'New Bill' })).toHaveAttribute('aria-current', 'page');
  });

  it('Exit is a button that asks the shell to confirm', async () => {
    const { onExit } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Exit' }));
    expect(onExit).toHaveBeenCalled();
  });
});
