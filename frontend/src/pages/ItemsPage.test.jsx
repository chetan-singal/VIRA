import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bikeApi, categoryApi, itemApi } from '../api/endpoints';
import { ToastProvider } from '../components/ui/Toast';
import ItemsPage from './ItemsPage';

vi.mock('../api/endpoints', () => ({
  itemApi: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), rateOverrides: vi.fn(), clearRateOverrides: vi.fn(),
  },
  categoryApi: { list: vi.fn(), create: vi.fn() },
  bikeApi: { list: vi.fn(), create: vi.fn() },
}));

const BRAKE = {
  id: 1, name: 'Brake Pad Set', unit: 'Pcs', partCategory: { id: 1, name: 'Brake Parts' }, bikes: [{ id: 1, name: 'Splendor Plus' }],
  itemType: 'MRP', mrp: 450, defaultDiscountPercent: 10, defaultNetRate: null, defaultRate: 405, typeLocked: null,
};
const CABLE = {
  id: 2, name: 'Clutch Cable', unit: 'Pcs', partCategory: null, bikes: [],
  itemType: 'NET_RATE', mrp: null, defaultDiscountPercent: null, defaultNetRate: 120, defaultRate: 120, typeLocked: null,
};
const FIRST_PAGE = { q: '', type: '', categoryId: '', page: 0, size: 10, sort: 'name,asc' };

const pageOf = (content, extra = {}) => ({
  content, page: 0, size: 10, totalElements: content.length, totalPages: content.length > 0 ? 1 : 0, ...extra,
});
const lastListParams = () => itemApi.list.mock.calls.at(-1)[0];

beforeEach(() => {
  for (const group of [itemApi, categoryApi, bikeApi]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
  itemApi.list.mockResolvedValue(pageOf([BRAKE, CABLE]));
  itemApi.get.mockImplementation((id) => Promise.resolve({ ...(id === 1 ? BRAKE : CABLE), id, typeLocked: false }));
  itemApi.rateOverrides.mockResolvedValue({ cash: null, parties: [] });
  categoryApi.list.mockResolvedValue([{ id: 1, name: 'Brake Parts' }]);
  bikeApi.list.mockResolvedValue([{ id: 1, name: 'Splendor Plus' }]);
});

function setup() {
  render(<ToastProvider><ItemsPage /></ToastProvider>);
  return userEvent.setup();
}

describe('ItemsPage', () => {
  it('lists the items and asks the backend for the first page', async () => {
    setup();

    expect(await screen.findByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.getByText('Clutch Cable')).toBeInTheDocument();
    expect(screen.getByText('₹405.00')).toBeInTheDocument();
    expect(screen.getByText('₹120.00')).toBeInTheDocument();
    expect(itemApi.list.mock.calls[0][0]).toEqual(FIRST_PAGE);
  });

  it('sends the search, the type and the category to the backend, and Clear resets them', async () => {
    const user = setup();
    await screen.findByText('Brake Pad Set');

    await user.type(screen.getByRole('textbox', { name: 'Search items' }), 'brake');
    await waitFor(() => expect(lastListParams()).toMatchObject({ q: 'brake', page: 0 }));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Item type' }), 'NET_RATE');
    await waitFor(() => expect(lastListParams()).toMatchObject({ q: 'brake', type: 'NET_RATE' }));

    await screen.findByRole('option', { name: 'Brake Parts' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), '1');
    await waitFor(() => expect(lastListParams()).toMatchObject({ type: 'NET_RATE', categoryId: '1' }));

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(lastListParams()).toEqual(FIRST_PAGE));
  });

  it('moves between pages and changes the page size', async () => {
    itemApi.list.mockResolvedValue(pageOf([BRAKE, CABLE], { totalElements: 25, totalPages: 3 }));
    const user = setup();
    await screen.findByText('Brake Pad Set');

    await user.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 1, size: 10 }));

    await user.selectOptions(screen.getByLabelText('Items per page'), '20');
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 0, size: 20 }));
  });

  it('shows the details of the clicked row, and only the net rate for a Net Rate item', async () => {
    const user = setup();
    expect(await screen.findByText('Select an item to see its details.')).toBeInTheDocument();

    await user.click(await screen.findByText('Brake Pad Set'));
    expect(await screen.findByText('Default Discount')).toBeInTheDocument();
    expect(itemApi.get).toHaveBeenCalledWith(1, expect.anything());
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('Splendor Plus')).toBeInTheDocument();

    await user.click(screen.getByText('Clutch Cable'));
    expect(await screen.findByText('Default Net Rate')).toBeInTheDocument();
    expect(screen.queryByText('Default Discount')).not.toBeInTheDocument();
  });

  it('shows the lock alert and removes the saved rates after a confirmation that names how many', async () => {
    itemApi.get.mockResolvedValue({ ...BRAKE, typeLocked: true });
    itemApi.rateOverrides.mockResolvedValue({
      cash: { discountPercent: 12, netRate: null },
      parties: [{ partyId: 3, discountPercent: 8, netRate: null }],
    });
    itemApi.clearRateOverrides.mockResolvedValue(null);
    const user = setup();

    await user.click(await screen.findByText('Brake Pad Set'));
    expect(await screen.findByText(/Item Type is locked because saved Party or Cash rates exist/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove rate overrides' }));
    expect(await screen.findByText(/2 saved rates/)).toBeInTheDocument();

    itemApi.get.mockResolvedValue({ ...BRAKE, typeLocked: false });
    await user.click(screen.getByRole('button', { name: 'Remove rates' }));
    await waitFor(() => expect(itemApi.clearRateOverrides).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Rates removed. The Item Type can now be changed.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Item Type is locked/)).not.toBeInTheDocument());
  });

  it('asks before deleting, states how many saved rates go with the item, and deletes it', async () => {
    itemApi.rateOverrides.mockResolvedValue({
      cash: null,
      parties: [{ partyId: 3, discountPercent: 8, netRate: null }, { partyId: 4, discountPercent: 9, netRate: null }],
    });
    itemApi.remove.mockResolvedValue(null);
    const user = setup();
    await screen.findByText('Brake Pad Set');

    await user.click(screen.getByRole('button', { name: 'Delete Brake Pad Set' }));
    expect(await screen.findByText(/saved Party and Cash rates \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemApi.remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete Brake Pad Set' }));
    await screen.findByText(/saved Party and Cash rates \(2\)/);
    await user.click(screen.getByRole('button', { name: 'Delete Item' }));
    await waitFor(() => expect(itemApi.remove).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Item deleted.')).toBeInTheDocument();
    await waitFor(() => expect(itemApi.list.mock.calls.length).toBeGreaterThan(1));
  });

  it('offers Add New Item when there are no items at all', async () => {
    itemApi.list.mockResolvedValue(pageOf([]));
    setup();

    expect(await screen.findByText('No items yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add New Item' })).toHaveLength(2);
  });

  it('adds a new item from the form, reloads the list and selects the new item', async () => {
    itemApi.create.mockResolvedValue({ ...BRAKE, id: 9, name: 'Chain Set' });
    const user = setup();
    await screen.findByText('Brake Pad Set');

    await user.click(screen.getByRole('button', { name: 'Add New Item' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add New Item' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Item Name' }), 'Chain Set');
    await user.type(within(dialog).getByRole('textbox', { name: 'MRP' }), '300');
    await user.type(within(dialog).getByRole('textbox', { name: 'Default Discount %' }), '5');
    await user.click(within(dialog).getByRole('button', { name: 'Save Item' }));

    await waitFor(() => expect(itemApi.create).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Item saved.')).toBeInTheDocument();
    await waitFor(() => expect(itemApi.get).toHaveBeenCalledWith(9, expect.anything()));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemApi.list.mock.calls.length).toBeGreaterThan(1);
  });

  it('opens the edit form for a row with that item fetched fresh', async () => {
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Edit Brake Pad Set' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Item — Brake Pad Set' });
    expect(itemApi.get).toHaveBeenCalledWith(1);
    expect(within(dialog).getByRole('textbox', { name: 'MRP' })).toHaveValue('450');
  });
});