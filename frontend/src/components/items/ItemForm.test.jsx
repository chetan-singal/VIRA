import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { bikeApi, categoryApi, itemApi } from '../../api/endpoints';
import ItemForm from './ItemForm';

vi.mock('../../api/endpoints', () => ({
  itemApi: { create: vi.fn(), update: vi.fn() },
  categoryApi: { create: vi.fn() },
  bikeApi: { create: vi.fn() },
}));

const CATEGORIES = [{ id: 1, name: 'Brake Parts' }];
const BIKES = [{ id: 1, name: 'Splendor Plus' }, { id: 2, name: 'Pulsar 150' }];
const BRAKE = {
  id: 7, name: 'Brake Pad Set', unit: 'Pcs', partCategory: { id: 1, name: 'Brake Parts' }, bikes: [{ id: 1, name: 'Splendor Plus' }],
  itemType: 'MRP', mrp: 450, defaultDiscountPercent: 10, defaultNetRate: null, defaultRate: 405, typeLocked: true,
};

beforeEach(() => {
  itemApi.create.mockReset();
  itemApi.update.mockReset();
  categoryApi.create.mockReset();
  bikeApi.create.mockReset();
});

function setup(props = {}) {
  const handlers = { onSaved: vi.fn(), onCancel: vi.fn(), onCategoryCreated: vi.fn(), onBikeCreated: vi.fn() };
  render(<ItemForm item={null} categories={CATEGORIES} bikes={BIKES} {...handlers} {...props} />);
  return { user: userEvent.setup(), ...handlers };
}

const box = (name) => screen.getByRole('textbox', { name });

describe('ItemForm', () => {
  it('shows the pricing fields of the chosen type and clears the other type on a switch', async () => {
    const { user } = setup();
    expect(box('MRP')).toBeInTheDocument();
    expect(box('Default Discount %')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Default Net Rate' })).not.toBeInTheDocument();

    await user.type(box('MRP'), '99');
    await user.click(screen.getByRole('radio', { name: 'Net Rate Item' }));
    expect(box('Default Net Rate')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'MRP' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'MRP Item' }));
    expect(box('MRP')).toHaveValue('');
  });

  it('sends the MRP payload with the chosen unit, category, bikes and numbers', async () => {
    const saved = { id: 9, name: 'Brake Pad Set' };
    itemApi.create.mockResolvedValue(saved);
    const { user, onSaved } = setup();

    await user.type(box('Item Name'), '  Brake Pad Set ');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Unit' }), 'Box');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Part Category' }), '1');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Compatible Bikes' }), '2');
    expect(screen.getByRole('button', { name: 'Remove Pulsar 150' })).toBeInTheDocument();
    await user.type(box('MRP'), '450');
    await user.type(box('Default Discount %'), '10');
    await user.click(screen.getByRole('button', { name: 'Save Item' }));

    await waitFor(() => expect(itemApi.create).toHaveBeenCalledTimes(1));
    expect(itemApi.create).toHaveBeenCalledWith({
      name: 'Brake Pad Set', unit: 'Box', partCategoryId: 1, bikeIds: [2], itemType: 'MRP',
      mrp: 450, defaultDiscountPercent: 10, defaultNetRate: null,
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
  });

  it('sends only the net rate for a Net Rate item', async () => {
    itemApi.create.mockResolvedValue({ id: 3 });
    const { user } = setup();

    await user.type(box('Item Name'), 'Clutch Cable');
    await user.click(screen.getByRole('radio', { name: 'Net Rate Item' }));
    await user.type(box('Default Net Rate'), '120.5');
    await user.click(screen.getByRole('button', { name: 'Save Item' }));

    await waitFor(() => expect(itemApi.create).toHaveBeenCalledTimes(1));
    expect(itemApi.create).toHaveBeenCalledWith({
      name: 'Clutch Cable', unit: 'Pcs', partCategoryId: null, bikeIds: [], itemType: 'NET_RATE',
      mrp: null, defaultDiscountPercent: null, defaultNetRate: 120.5,
    });
  });

  it('refuses an empty form in the browser without calling the API', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Save Item' }));

    expect(await screen.findByText('Item name is required.')).toBeInTheDocument();
    expect(screen.getByText('MRP is required.')).toBeInTheDocument();
    expect(screen.getByText('Default discount is required.')).toBeInTheDocument();
    expect(itemApi.create).not.toHaveBeenCalled();
  });

  it('shows the backend field errors under the matching fields', async () => {
    itemApi.create.mockRejectedValue(new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Please correct the highlighted fields.',
      fieldErrors: [
        { field: 'mrp', message: 'MRP must be greater than 0' },
        { field: 'defaultDiscountPercent', message: 'Discount must be between 0 and 100' },
      ],
    }));
    const { user, onSaved } = setup();

    await user.type(box('Item Name'), 'X');
    await user.type(box('MRP'), '0');
    await user.type(box('Default Discount %'), '101');
    await user.click(screen.getByRole('button', { name: 'Save Item' }));

    expect(await screen.findByText('MRP must be greater than 0')).toBeInTheDocument();
    expect(screen.getByText('Discount must be between 0 and 100')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('disables the type radios while the type is locked and shows the lock hint', () => {
    setup({ item: BRAKE });

    expect(screen.getByRole('radio', { name: 'MRP Item' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Net Rate Item' })).toBeDisabled();
    expect(screen.getByText(/Locked: saved Party or Cash rates exist/)).toBeInTheDocument();
    expect(box('Item Name')).toHaveValue('Brake Pad Set');
    expect(box('MRP')).toHaveValue('450');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('shows ITEM_TYPE_LOCKED under Item Type and keeps the form open', async () => {
    itemApi.update.mockRejectedValue(new ApiError({
      status: 409, code: 'ITEM_TYPE_LOCKED', message: 'Item Type cannot be changed while saved Party or Cash rates exist.',
    }));
    const { user, onSaved } = setup({ item: { ...BRAKE, typeLocked: false } });

    await user.click(screen.getByRole('radio', { name: 'Net Rate Item' }));
    await user.type(box('Default Net Rate'), '400');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Item Type cannot be changed while saved Party or Cash rates exist.')).toBeInTheDocument();
    expect(itemApi.update).toHaveBeenCalledWith(7, expect.objectContaining({ itemType: 'NET_RATE', defaultNetRate: 400, mrp: null }));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('creates a new category and a new bike inline and selects them', async () => {
    categoryApi.create.mockResolvedValue({ id: 5, name: 'Hand Grips' });
    bikeApi.create.mockResolvedValue({ id: 6, name: 'Pulsar 220' });
    const { user, onCategoryCreated, onBikeCreated } = setup();

    await user.click(screen.getByRole('button', { name: 'Add New Category' }));
    await user.type(screen.getByRole('textbox', { name: 'New category name' }), 'Hand Grips{Enter}');
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Part Category' })).toHaveValue('5'));
    expect(categoryApi.create).toHaveBeenCalledWith('Hand Grips');
    expect(onCategoryCreated).toHaveBeenCalledWith({ id: 5, name: 'Hand Grips' });

    await user.click(screen.getByRole('button', { name: 'Add New Bike' }));
    await user.type(screen.getByRole('textbox', { name: 'New bike name' }), 'Pulsar 220{Enter}');
    expect(await screen.findByRole('button', { name: 'Remove Pulsar 220' })).toBeInTheDocument();
    expect(bikeApi.create).toHaveBeenCalledWith('Pulsar 220');
    expect(onBikeCreated).toHaveBeenCalledWith({ id: 6, name: 'Pulsar 220' });
    expect(itemApi.create).not.toHaveBeenCalled();
  });

  it('shows the duplicate-name message under the new category box', async () => {
    categoryApi.create.mockRejectedValue(new ApiError({ status: 409, code: 'DUPLICATE_NAME', message: 'That name already exists' }));
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Add New Category' }));
    await user.type(screen.getByRole('textbox', { name: 'New category name' }), 'brake parts');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('That name already exists')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'New category name' })).toBeInTheDocument();
  });
});