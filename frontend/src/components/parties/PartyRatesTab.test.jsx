import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { itemApi, partyApi, pricingApi } from '../../api/endpoints';
import { ToastProvider } from '../ui/Toast';
import PartyRatesTab from './PartyRatesTab';

vi.mock('../../api/endpoints', () => ({
  partyApi: { itemRates: vi.fn() },
  itemApi: { list: vi.fn() },
  pricingApi: { quote: vi.fn(), savePermanent: vi.fn() },
}));

const party = (extra) => ({ id: 7, name: 'Ramesh Motors', deleted: false, ...extra });

const MRP_ROW = {
  itemId: 1, itemName: 'Brake Pad Set', unit: 'Pcs', itemType: 'MRP', mrp: 450, discountPercent: 15, netRate: null, rate: 382.5,
  updatedAt: '2026-10-29T10:15:00',
};
const NET_ROW = {
  itemId: 2, itemName: 'Clutch Cable', unit: 'Pcs', itemType: 'NET_RATE', mrp: null, discountPercent: null, netRate: 90, rate: 90,
  updatedAt: '2026-10-30T09:00:00',
};

const MRP_ITEM = { id: 1, name: 'Brake Pad Set', itemType: 'MRP', defaultRate: 405 };
const NET_ITEM = { id: 2, name: 'Clutch Cable', itemType: 'NET_RATE', defaultRate: 120 };
const MRP_QUOTE = { itemId: 1, itemType: 'MRP', mrp: 450, discountPercent: 10, rate: 405, source: 'ITEM_DEFAULT' };
const NET_QUOTE = { itemId: 2, itemType: 'NET_RATE', mrp: null, discountPercent: null, rate: 120, source: 'ITEM_DEFAULT' };

beforeEach(() => {
  for (const group of [partyApi, itemApi, pricingApi]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
  partyApi.itemRates.mockResolvedValue([MRP_ROW, NET_ROW]);
  itemApi.list.mockResolvedValue({ content: [MRP_ITEM, NET_ITEM], page: 0, size: 8, totalElements: 2, totalPages: 1 });
  pricingApi.quote.mockImplementation(({ itemId }) => Promise.resolve(itemId === 1 ? MRP_QUOTE : NET_QUOTE));
  pricingApi.savePermanent.mockResolvedValue(MRP_QUOTE);
});

function setup(partyData = party(), props = {}) {
  const view = (extra) => (
    <ToastProvider>
      <PartyRatesTab party={partyData} {...props} {...extra} />
    </ToastProvider>
  );
  const result = render(view());
  return { user: userEvent.setup(), rerender: (extra) => result.rerender(view(extra)) };
}

/** Opens the item picker and chooses an item by its name. */
async function pick(user, name) {
  await user.click(screen.getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name: new RegExp(`^${name}`) }));
}

const rowOf = (name) => screen.getByText(name).closest('tr');
const cells = (row) => within(row).getAllByRole('cell').map((c) => c.textContent);

describe('PartyRatesTab', () => {
  it('lists the saved rates, with a dash where the item type has no such rate', async () => {
    setup();

    expect(await screen.findByText('Brake Pad Set')).toBeInTheDocument();
    expect(partyApi.itemRates).toHaveBeenCalledWith(7, expect.anything());
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(
      ['Item', 'Unit', 'Type', 'MRP', 'Party Discount %', 'Party Net Rate', 'Rate', 'Updated', 'Action'],
    );
    expect(cells(rowOf('Brake Pad Set')).slice(0, 8)).toEqual(['Brake Pad Set', 'Pcs', 'MRP', '₹450.00', '15%', '—', '₹382.50', '29-10-2026']);
    expect(cells(rowOf('Clutch Cable')).slice(0, 8)).toEqual(['Clutch Cable', 'Pcs', 'Net Rate', '—', '—', '₹90.00', '₹90.00', '30-10-2026']);
    expect(screen.getByText("Saving a party rate locks the item's type. Remove the rates on the Items screen to change it.")).toBeInTheDocument();
  });

  it('edits the discount of an MRP item in its row and saves it as DISCOUNT_PERCENT', async () => {
    const { user } = setup();
    await screen.findByText('Brake Pad Set');

    await user.click(screen.getByRole('button', { name: 'Edit rate of Brake Pad Set' }));
    const input = screen.getByRole('textbox', { name: 'Party discount for Brake Pad Set' });
    expect(input).toHaveValue('15');
    await user.clear(input);
    await user.type(input, '12.5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(pricingApi.savePermanent).toHaveBeenCalledWith({
      itemId: 1, customer: 'PARTY', partyId: 7, field: 'DISCOUNT_PERCENT', newValue: 12.5,
    }));
    expect(await screen.findByText('Rate saved for Ramesh Motors.')).toBeInTheDocument();
    await waitFor(() => expect(partyApi.itemRates.mock.calls.length).toBeGreaterThan(1));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: /Party discount/ })).not.toBeInTheDocument());
  });

  it('edits the net rate of a Net Rate item in its row and saves it as NET_RATE', async () => {
    const { user } = setup();
    await screen.findByText('Clutch Cable');

    await user.click(screen.getByRole('button', { name: 'Edit rate of Clutch Cable' }));
    const input = screen.getByRole('textbox', { name: 'Party net rate for Clutch Cable' });
    expect(input).toHaveValue('90');
    await user.clear(input);
    await user.type(input, '95{Enter}');

    await waitFor(() => expect(pricingApi.savePermanent).toHaveBeenCalledWith({
      itemId: 2, customer: 'PARTY', partyId: 7, field: 'NET_RATE', newValue: 95,
    }));
    expect(await screen.findByText('Rate saved for Ramesh Motors.')).toBeInTheDocument();
  });

  it("shows the backend's message under the input, keeps the row open, and Cancel closes it without saving", async () => {
    pricingApi.savePermanent.mockRejectedValue(new ApiError({
      status: 400, code: 'VALIDATION_FAILED', message: 'Validation failed',
      fieldErrors: [{ field: 'newValue', message: 'Must be between 0 and 100' }],
    }));
    const { user } = setup();
    await screen.findByText('Brake Pad Set');

    await user.click(screen.getByRole('button', { name: 'Edit rate of Brake Pad Set' }));
    const input = screen.getByRole('textbox', { name: 'Party discount for Brake Pad Set' });
    await user.clear(input);
    await user.type(input, '101');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Must be between 0 and 100')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Party discount for Brake Pad Set' })).toHaveValue('101');
    expect(screen.queryByText(/Rate saved/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox', { name: /Party discount/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit rate of Brake Pad Set' })).toBeInTheDocument();
    expect(pricingApi.savePermanent).toHaveBeenCalledTimes(1);
  });

  it('does not save an empty value', async () => {
    const { user } = setup();
    await screen.findByText('Brake Pad Set');

    await user.click(screen.getByRole('button', { name: 'Edit rate of Brake Pad Set' }));
    await user.clear(screen.getByRole('textbox', { name: 'Party discount for Brake Pad Set' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a value.')).toBeInTheDocument();
    expect(pricingApi.savePermanent).not.toHaveBeenCalled();
  });

  it('checking an MRP item shows its quote card with the MRP read-only', async () => {
    const { user } = setup();
    await screen.findByText('Brake Pad Set');

    await user.click(screen.getByRole('combobox'));
    const option = await screen.findByRole('option', { name: /^Brake Pad Set/ });
    expect(option).toHaveTextContent('Default rate ₹405.00');
    expect(itemApi.list).toHaveBeenCalledWith({ q: '', size: 8, sort: 'name,asc' });
    await user.click(option);

    await waitFor(() => expect(pricingApi.quote).toHaveBeenCalledWith({ itemId: 1, customer: 'PARTY', partyId: 7 }, expect.anything()));
    const card = (await screen.findByText('Item default')).closest('.rate-card');
    expect(card).toHaveTextContent('Brake Pad Set');
    expect(card).toHaveTextContent('MRP Item');
    expect(card).toHaveTextContent('MRP₹450.00');
    expect(card).toHaveTextContent('Change the MRP on the Items screen.');
    expect(card).toHaveTextContent('Party Discount10%');
    expect(card).toHaveTextContent('Rate₹405.00');
    expect(within(card).getByRole('textbox', { name: 'Party Discount %' })).toHaveValue('10');
  });

  it('shows where a saved rate comes from', async () => {
    pricingApi.quote.mockResolvedValue({ ...MRP_QUOTE, discountPercent: 15, rate: 382.5, source: 'PARTY_OVERRIDE' });
    const { user } = setup();
    await screen.findByText('Brake Pad Set');

    await pick(user, 'Brake Pad Set');
    const card = (await screen.findByText('Saved for this party')).closest('.rate-card');
    expect(card).toHaveTextContent('Party Discount15%');
    expect(card).toHaveTextContent('Rate₹382.50');
  });

  it('saves an MRP item rate from the card as DISCOUNT_PERCENT, then reloads the card and the list', async () => {
    const { user } = setup();
    await screen.findByText('Brake Pad Set');
    await pick(user, 'Brake Pad Set');

    const input = await screen.findByRole('textbox', { name: 'Party Discount %' });
    await user.clear(input);
    await user.type(input, '12');
    const quotesBefore = pricingApi.quote.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Save for this party' }));

    await waitFor(() => expect(pricingApi.savePermanent).toHaveBeenCalledWith({
      itemId: 1, customer: 'PARTY', partyId: 7, field: 'DISCOUNT_PERCENT', newValue: 12,
    }));
    expect(await screen.findByText('Rate saved for Ramesh Motors.')).toBeInTheDocument();
    await waitFor(() => expect(pricingApi.quote.mock.calls.length).toBeGreaterThan(quotesBefore));
    await waitFor(() => expect(partyApi.itemRates.mock.calls.length).toBeGreaterThan(1));
  });

  it('saves a Net Rate item from the card as NET_RATE, with no MRP shown', async () => {
    const { user } = setup();
    await screen.findByText('Brake Pad Set');
    await pick(user, 'Clutch Cable');

    const card = (await screen.findByText('Item default')).closest('.rate-card');
    expect(card).toHaveTextContent('Net Rate Item');
    expect(card).toHaveTextContent('Net Rate₹120.00');
    expect(card).not.toHaveTextContent('Change the MRP');

    const input = within(card).getByRole('textbox', { name: 'Party Net Rate' });
    expect(input).toHaveValue('120');
    await user.clear(input);
    await user.type(input, '95');
    await user.click(within(card).getByRole('button', { name: 'Save for this party' }));

    await waitFor(() => expect(pricingApi.savePermanent).toHaveBeenCalledWith({
      itemId: 2, customer: 'PARTY', partyId: 7, field: 'NET_RATE', newValue: 95,
    }));
  });

  it('shows the backend message under the card input when the value is refused', async () => {
    pricingApi.savePermanent.mockRejectedValue(new ApiError({
      status: 400, code: 'VALIDATION_FAILED', message: 'Validation failed',
      fieldErrors: [{ field: 'newValue', message: 'At most 2 decimal places' }],
    }));
    const { user } = setup();
    await screen.findByText('Brake Pad Set');
    await pick(user, 'Brake Pad Set');

    await user.click(await screen.findByRole('button', { name: 'Save for this party' }));
    expect(await screen.findByText('At most 2 decimal places')).toBeInTheDocument();
  });

  it('makes the saved rates read-only for a deleted party but still lets an item be checked', async () => {
    const { user } = setup(party({ deleted: true }));
    await screen.findByText('Brake Pad Set');

    expect(screen.getByText(/This party is deleted, so its saved rates are read-only/)).toBeInTheDocument();
    const edit = screen.getByRole('button', { name: 'Edit rate of Brake Pad Set' });
    expect(edit).toBeDisabled();
    expect(edit.parentElement).toHaveAttribute('title', expect.stringContaining('The party is deleted. Restore the party first.'));

    await pick(user, 'Brake Pad Set');
    const card = (await screen.findByText('Item default')).closest('.rate-card');
    expect(card).toHaveTextContent('Rate₹405.00');
    expect(within(card).queryByRole('button', { name: 'Save for this party' })).not.toBeInTheDocument();
    expect(within(card).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows an empty state when the party has no saved rates', async () => {
    partyApi.itemRates.mockResolvedValue([]);
    setup();

    expect(await screen.findByText('No saved rates for this party')).toBeInTheDocument();
  });

  it('reloads the rates when the page asks for a refresh', async () => {
    const { rerender } = setup();
    await screen.findByText('Brake Pad Set');
    const callsBefore = partyApi.itemRates.mock.calls.length;

    rerender({ refreshKey: 1 });
    await waitFor(() => expect(partyApi.itemRates.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});