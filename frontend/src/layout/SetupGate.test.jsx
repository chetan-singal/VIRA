import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { setupApi } from '../api/endpoints';
import { AppStateProvider } from '../state/AppState';
import SetupGate from './SetupGate';

vi.mock('../api/endpoints', () => ({
  setupApi: { status: vi.fn() },
  settingsApi: { get: vi.fn().mockResolvedValue({}) },
  shopApi: { get: vi.fn().mockResolvedValue({ shopName: 'Chirag Auto Parts' }) },
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppStateProvider>
        <SetupGate>
          <Routes>
            <Route path="/setup" element={<p>setup page</p>} />
            <Route path="*" element={<p>app page</p>} />
          </Routes>
        </SetupGate>
      </AppStateProvider>
    </MemoryRouter>,
  );
}

describe('SetupGate (SRS §18.3)', () => {
  beforeEach(() => {
    setupApi.status.mockReset();
  });
  
  it('shows a splash while the status is loading', () => {
    setupApi.status.mockReturnValue(new Promise(() => {}));
    renderAt('/');
    expect(screen.getByText('Starting VIRA…')).toBeInTheDocument();
  });

  it('sends every route to /setup until setup is complete', async () => {
    setupApi.status.mockResolvedValue({ setupComplete: false });
    renderAt('/daybook');
    expect(await screen.findByText('setup page')).toBeInTheDocument();
  });

  it('lets the app through once setup is complete', async () => {
    setupApi.status.mockResolvedValue({ setupComplete: true });
    renderAt('/daybook');
    expect(await screen.findByText('app page')).toBeInTheDocument();
  });

  it('keeps /setup away from a shop that is already set up', async () => {
    setupApi.status.mockResolvedValue({ setupComplete: true });
    renderAt('/setup');
    expect(await screen.findByText('app page')).toBeInTheDocument();
    expect(screen.queryByText('setup page')).not.toBeInTheDocument();
  });

  it('shows the backend-down screen and recovers on Try again', async () => {
    setupApi.status.mockRejectedValueOnce(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Cannot reach the VIRA backend.' }));
    renderAt('/');
    expect(await screen.findByText('VIRA can’t reach its backend')).toBeInTheDocument();

    setupApi.status.mockResolvedValue({ setupComplete: true });
    await userEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('app page')).toBeInTheDocument();
  });
});
