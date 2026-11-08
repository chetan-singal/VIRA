import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { settingsApi, setupApi, shopApi } from '../api/endpoints';
import { DateText } from '../components/ui/Money';
import { ToastProvider } from '../components/ui/Toast';
import { AppStateProvider } from '../state/AppState';
import SettingsPage from './SettingsPage';

vi.mock('../api/endpoints', () => ({
  setupApi: { status: vi.fn() },
  shopApi: { get: vi.fn() },
  settingsApi: { get: vi.fn(), update: vi.fn() },
  maintenanceApi: { check: vi.fn(), fixCash: vi.fn(), fixParty: vi.fn() },
}));

const STORED = {
  defaultBillType: 'PARTY',
  defaultFocusField: 'customer',
  defaultPrinter: 'Counter Printer',
  dateFormat: 'DD-MM-YYYY',
  theme: 'light',
};

// A tiny stand-in for the backend: PUT stores what it is given and GET returns it.
let stored;

beforeEach(() => {
  stored = { ...STORED };
  setupApi.status.mockResolvedValue({ setupComplete: true });
  shopApi.get.mockResolvedValue({ shopName: 'Chirag Auto Parts' });
  settingsApi.get.mockReset().mockImplementation(async () => ({ ...stored }));
  settingsApi.update.mockReset().mockImplementation(async (body) => {
    stored = { ...body };
    return { ...stored };
  });
});

afterEach(() => {
  vi.useRealTimers();
});

/** The page inside the real app state, with one date shown elsewhere in the app to prove the format changes. */
async function setup() {
  render(
    <ToastProvider>
      <AppStateProvider>
        <SettingsPage />
        <DateText value="2026-11-07" />
      </AppStateProvider>
    </ToastProvider>,
  );
  await screen.findByRole('radiogroup', { name: 'Default bill type' });
  return userEvent.setup();
}

const saveButton = () => screen.getByRole('button', { name: 'Save changes' });
const resetButton = () => screen.getByRole('button', { name: 'Reset' });
const printer = () => screen.getByRole('textbox', { name: 'Default Printer' });
const focusField = () => screen.getByRole('combobox', { name: 'Default Starting Focus Field' });
const dateFormat = () => screen.getByRole('combobox', { name: 'Date Format' });

describe('SettingsPage', () => {
  it('fills the controls from the saved settings, with Save and Reset disabled until something changes', async () => {
    await setup();

    expect(screen.getByRole('radio', { name: 'Party Bill' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Cash Bill' })).not.toBeChecked();
    expect(focusField()).toHaveValue('customer');
    expect(printer()).toHaveValue('Counter Printer');
    expect(screen.getByText(/The desktop app will list your printers in a later phase\./)).toBeInTheDocument();
    expect(dateFormat()).toHaveValue('DD-MM-YYYY');
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(saveButton()).toBeDisabled();
    expect(resetButton()).toBeDisabled();
  });

  it('shows today in the chosen date format as a live example', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 7, 12, 0, 0));
    const user = await setup();

    expect(screen.getByText('Example: today shows as 07-11-2026.')).toBeInTheDocument();
    await user.selectOptions(dateFormat(), 'MM-DD-YYYY');
    expect(screen.getByText('Example: today shows as 11-07-2026.')).toBeInTheDocument();
    await user.selectOptions(dateFormat(), 'YYYY-MM-DD');
    expect(screen.getByText('Example: today shows as 2026-11-07.')).toBeInTheDocument();
  });

  it('puts the saved values back with Reset', async () => {
    const user = await setup();

    await user.click(screen.getByRole('radio', { name: 'Cash Bill' }));
    await user.selectOptions(focusField(), 'bill_date');
    await user.type(printer(), ' 2');
    expect(saveButton()).toBeEnabled();

    await user.click(resetButton());

    expect(screen.getByRole('radio', { name: 'Party Bill' })).toBeChecked();
    expect(focusField()).toHaveValue('customer');
    expect(printer()).toHaveValue('Counter Printer');
    expect(saveButton()).toBeDisabled();
    expect(settingsApi.update).not.toHaveBeenCalled();
  });

  it('sends the five values, trims the printer name, confirms with a toast and disables Save again', async () => {
    const user = await setup();

    await user.click(screen.getByRole('radio', { name: 'Cash Bill' }));
    await user.selectOptions(focusField(), 'bill_date');
    await user.clear(printer());
    await user.type(printer(), '  Billing Desk  ');
    await user.selectOptions(dateFormat(), 'YYYY-MM-DD');
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    await user.click(saveButton());

    await waitFor(() => expect(settingsApi.update).toHaveBeenCalledTimes(1));
    expect(settingsApi.update).toHaveBeenCalledWith({
      defaultBillType: 'CASH',
      defaultFocusField: 'bill_date',
      defaultPrinter: 'Billing Desk',
      dateFormat: 'YYYY-MM-DD',
      theme: 'dark',
    });
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument();
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(printer()).toHaveValue('Billing Desk');
  });

  it('applies the saved theme and date format to the whole app at once', async () => {
    const user = await setup();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByText('07-11-2026')).toBeInTheDocument();

    await user.selectOptions(dateFormat(), 'MM-DD-YYYY');
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    await user.click(saveButton());

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(await screen.findByText('11-07-2026')).toBeInTheDocument();
  });

  it('shows the values the backend refuses under their fields and keeps the form editable', async () => {
    settingsApi.update.mockRejectedValue(new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Please correct the highlighted fields.',
      fieldErrors: [
        { field: 'dateFormat', message: 'Must be DD-MM-YYYY, MM-DD-YYYY or YYYY-MM-DD' },
        { field: 'theme', message: 'Must be light or dark' },
      ],
    }));
    const user = await setup();

    await user.selectOptions(dateFormat(), 'MM-DD-YYYY');
    await user.click(saveButton());

    expect(await screen.findByText('Must be DD-MM-YYYY, MM-DD-YYYY or YYYY-MM-DD')).toBeInTheDocument();
    expect(screen.getByText('Must be light or dark')).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText('Settings saved.')).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('shows any other failure as an alert above the form', async () => {
    settingsApi.update.mockRejectedValue(new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'The settings could not be saved.' }));
    const user = await setup();

    await user.click(screen.getByRole('radio', { name: 'Cash Bill' }));
    await user.click(saveButton());

    expect(await screen.findByText('The settings could not be saved.')).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });
});
