import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { shopApi } from '../api/endpoints';
import { ToastProvider } from '../components/ui/Toast';
import ShopProfilePage from './ShopProfilePage';

const { reloadShop } = vi.hoisted(() => ({ reloadShop: vi.fn() }));

vi.mock('../api/endpoints', () => ({
  shopApi: {
    get: vi.fn(),
    update: vi.fn(),
    uploadLogo: vi.fn(),
    removeLogo: vi.fn(),
    logoUrl: (version = 0) => `/api/shop-profile/logo?v=${version}`,
  },
}));
vi.mock('../state/AppState', () => ({ useAppState: () => ({ reloadShop }) }));

const PROFILE = {
  shopName: 'Chirag Auto Parts', address: '12 Market Road', phone: '9876543210', alternatePhone: null, email: null,
  city: 'Rajgarh', state: 'Rajasthan', pinCode: '301001', notes: null,
  cashBillPrefix: 'C-', partyBillPrefix: 'P-', voucherPrefix: 'PV-', supplierPaymentPrefix: 'SP-',
  startingBillNumber: 1001, openingCashInHand: 5000, openingCashInHandDate: '2026-04-01',
  printShowShopName: true, printShowAddress: true, printShowPhone: true, printShowLogo: true, printShowThankyou: true, printShowMrp: true,
  printTermsConditions: null, topLine: null, hasLogo: false, setupValuesLocked: false,
};
const SAVED_PAYLOAD = {
  shopName: 'Chirag Auto Parts', address: '99 New Road', phone: '9876543210', alternatePhone: null, email: null,
  city: 'Rajgarh', state: 'Rajasthan', pinCode: '301001', notes: null,
  cashBillPrefix: 'C-', partyBillPrefix: 'P-', voucherPrefix: 'PV-', supplierPaymentPrefix: 'SP-',
  startingBillNumber: 1001, openingCashInHand: 5000, openingCashInHandDate: '2026-04-01',
  printShowShopName: true, printShowAddress: true, printShowPhone: true, printShowLogo: true, printShowThankyou: true, printShowMrp: false,
  printTermsConditions: null, topLine: null,
};

beforeEach(() => {
  shopApi.get.mockReset();
  shopApi.update.mockReset();
  reloadShop.mockReset();
});

async function setup(profile = PROFILE) {
  shopApi.get.mockResolvedValue(profile);
  render(<ToastProvider><ShopProfilePage /></ToastProvider>);
  await screen.findByRole('textbox', { name: 'Shop Name' });
  return userEvent.setup();
}

const box = (name) => screen.getByRole('textbox', { name });
const saveButton = () => screen.getByRole('button', { name: 'Save changes' });

describe('ShopProfilePage', () => {
  it('fills the form from the saved profile, with Save and Reset disabled until something changes', async () => {
    await setup();

    expect(box('Shop Name')).toHaveValue('Chirag Auto Parts');
    expect(box('Address')).toHaveValue('12 Market Road');
    expect(box('Cash Bill Prefix')).toHaveValue('C-');
    expect(box('Supplier Payment Prefix')).toHaveValue('SP-');
    expect(box('Starting Bill Number')).toHaveValue('1001');
    expect(box('Opening Cash in Hand')).toHaveValue('5000');
    expect(screen.getByLabelText(/Opening Cash in Hand Date/)).toHaveValue('2026-04-01');
    expect(screen.getByRole('checkbox', { name: 'Show MRP' })).toBeChecked();
    expect(box('Starting Bill Number')).toBeEnabled();
    expect(screen.queryByText(/Locked because bills/)).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('makes the starting number and the opening cash read-only, with a note, once records exist', async () => {
    await setup({ ...PROFILE, setupValuesLocked: true });

    expect(box('Starting Bill Number')).toBeDisabled();
    expect(box('Opening Cash in Hand')).toBeDisabled();
    expect(screen.getByLabelText(/Opening Cash in Hand Date/)).toBeDisabled();
    expect(screen.getByText('Locked because bills, vouchers or payments exist (deleted ones count).')).toBeInTheDocument();
    expect(box('Shop Name')).toBeEnabled();
    expect(box('Voucher Prefix')).toBeEnabled();
  });

  it('enables Save and Reset after a change, and Reset puts the saved values back', async () => {
    const user = await setup();

    await user.type(box('Shop Name'), ' and Sons');
    expect(saveButton()).toBeEnabled();
    await user.click(screen.getByRole('checkbox', { name: 'Show logo' }));
    expect(screen.getByRole('checkbox', { name: 'Show logo' })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(box('Shop Name')).toHaveValue('Chirag Auto Parts');
    expect(screen.getByRole('checkbox', { name: 'Show logo' })).toBeChecked();
    expect(saveButton()).toBeDisabled();
  });

  it('saves every field, shows a toast, refreshes the app state and disables Save again', async () => {
    shopApi.update.mockResolvedValue({ ...PROFILE, address: '99 New Road', printShowMrp: false });
    const user = await setup();

    await user.clear(box('Address'));
    await user.type(box('Address'), '99 New Road');
    await user.click(screen.getByRole('checkbox', { name: 'Show MRP' }));
    await user.click(saveButton());

    await waitFor(() => expect(shopApi.update).toHaveBeenCalledWith(SAVED_PAYLOAD));
    expect(await screen.findByText('Shop profile saved.')).toBeInTheDocument();
    expect(reloadShop).toHaveBeenCalled();
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(box('Address')).toHaveValue('99 New Road');
  });

  it('refuses a blank shop name in the browser without calling the API', async () => {
    const user = await setup();

    await user.clear(box('Shop Name'));
    await user.click(saveButton());

    expect(await screen.findByText('Shop name is required.')).toBeInTheDocument();
    expect(shopApi.update).not.toHaveBeenCalled();
  });

  it('shows the backend field errors under the matching fields', async () => {
    shopApi.update.mockRejectedValue(new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Please correct the highlighted fields.',
      fieldErrors: [{ field: 'startingBillNumber', message: 'must be greater than or equal to 1' }],
    }));
    const user = await setup();

    await user.clear(box('Starting Bill Number'));
    await user.type(box('Starting Bill Number'), '0');
    await user.click(saveButton());

    expect(await screen.findByText('must be greater than or equal to 1')).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it('shows SETUP_VALUES_LOCKED as an alert at the top and keeps the form editable', async () => {
    shopApi.update.mockRejectedValue(new ApiError({
      status: 409, code: 'SETUP_VALUES_LOCKED', message: 'The starting bill number and the opening cash are locked.',
    }));
    const user = await setup();

    await user.type(box('City'), 'x');
    await user.click(saveButton());

    expect(await screen.findByText('The starting bill number and the opening cash are locked.')).toBeInTheDocument();
    expect(box('City')).toBeEnabled();
  });

  it('leaves out the Bill Top Line field, and does not send it, when the profile has no topLine', async () => {
    const { topLine, ...withoutTopLine } = PROFILE;
    shopApi.update.mockResolvedValue(withoutTopLine);
    const user = await setup(withoutTopLine);

    expect(screen.queryByRole('textbox', { name: 'Bill Top Line' })).not.toBeInTheDocument();
    await user.type(box('City'), 'x');
    await user.click(saveButton());

    await waitFor(() => expect(shopApi.update).toHaveBeenCalledTimes(1));
    expect(shopApi.update.mock.calls[0][0]).not.toHaveProperty('topLine');
  });
});