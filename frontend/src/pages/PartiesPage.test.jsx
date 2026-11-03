import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { partyApi } from '../api/endpoints';
import { ToastProvider } from '../components/ui/Toast';
import PartiesPage from './PartiesPage';

vi.mock('../api/endpoints', () => ({
  partyApi: {
    list: vi.fn(), summary: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn(),
  },
  billApi: {}, voucherApi: {}, supplierPaymentApi: {}, supplierApi: {},
}));

const party = (extra) => ({
  id: 1, name: 'Party', phone: null, address: null, city: null, state: null, remarks: null,
  openingBalance: 0, currentBalance: 0, deleted: false, deletedAt: null, ...extra,
});
const RAMESH = party({ id: 1, name: 'Ramesh Motors', phone: '9876543210', city: 'Rajgarh', currentBalance: 1250 });
const SURESH = party({ id: 2, name: 'Suresh Spares', city: 'Alwar', currentBalance: -300 });
const ASHA = party({ id: 3, name: 'Asha Traders' });
const SUMMARY = { totalParties: 3, partiesWithBalance: 2, totalOutstanding: 1250, totalAdvance: 300 };
const FIRST_PAGE = { q: '', deleted: false, page: 0, size: 10, sort: 'name,asc' };

const pageOf = (content, extra = {}) => ({
  content, page: 0, size: 10, totalElements: content.length, totalPages: content.length > 0 ? 1 : 0, ...extra,
});
const lastListParams = () => partyApi.list.mock.calls.at(-1)[0];

beforeEach(() => {
  for (const fn of Object.values(partyApi)) fn.mockReset();
  partyApi.list.mockResolvedValue(pageOf([RAMESH, SURESH, ASHA]));
  partyApi.summary.mockResolvedValue(SUMMARY);
});

function setup() {
  render(
    <MemoryRouter initialEntries={['/parties']}>
      <ToastProvider>
        <Routes>
          <Route path="/parties" element={<PartiesPage />} />
          <Route path="/parties/:id" element={<div>Party page opened</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('PartiesPage', () => {
  it('lists the active parties and asks the backend for the first page of active parties', async () => {
    setup();

    expect(await screen.findByText('Ramesh Motors')).toBeInTheDocument();
    expect(screen.getByText('Suresh Spares')).toBeInTheDocument();
    expect(screen.getByText('Rajgarh')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(partyApi.list.mock.calls[0][0]).toEqual(FIRST_PAGE);
  });

  it('shows a due in red with a Due tag and an advance as Advance / Credit', async () => {
    setup();
    const table = await screen.findByRole('table');

    expect(await within(table).findByText('₹1,250.00')).toHaveClass('balance-due');
    expect(within(table).getByText('Due')).toBeInTheDocument();
    expect(within(table).getByText('₹300.00')).toBeInTheDocument();
    expect(within(table).getByText('Advance / Credit')).toBeInTheDocument();
  });

  it('the Deleted tab asks for deleted parties and hides the tiles', async () => {
    const user = setup();
    expect(await screen.findByText('Total Parties')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Deleted' }));

    await waitFor(() => expect(lastListParams()).toMatchObject({ deleted: true, page: 0 }));
    expect(screen.queryByText('Total Parties')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Active' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ deleted: false }));
    expect(await screen.findByText('Total Parties')).toBeInTheDocument();
  });

  it('search sends q and goes back to the first page, and Clear empties it', async () => {
    partyApi.list.mockResolvedValue(pageOf([RAMESH, SURESH], { totalElements: 25, totalPages: 3 }));
    const user = setup();
    await screen.findByText('Ramesh Motors');

    await user.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 1 }));

    await user.type(screen.getByRole('textbox', { name: 'Search parties' }), 'ram');
    await waitFor(() => expect(lastListParams()).toMatchObject({ q: 'ram', page: 0, deleted: false }));

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(lastListParams()).toEqual(FIRST_PAGE));
  });

  it('disables Delete for a party with a balance and gives the amount as the reason', async () => {
    setup();
    await screen.findByText('Ramesh Motors');

    expect(screen.getByRole('button', { name: 'Delete Party Ramesh Motors' })).toBeDisabled();
    expect(screen.getByTitle(/balance now ₹1,250\.00 due/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Party Suresh Spares' })).toBeDisabled();
    expect(screen.getByTitle(/balance now ₹300\.00 advance/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Party Asha Traders' })).toBeEnabled();
  });

  it('New Party opens the form, saves, and reloads the list and the tiles', async () => {
    partyApi.create.mockResolvedValue(party({ id: 9, name: 'New Motors' }));
    const user = setup();
    await screen.findByText('Ramesh Motors');
    const listCalls = partyApi.list.mock.calls.length;
    const tileCalls = partyApi.summary.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'New Party' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Party' });
    await user.type(within(dialog).getByLabelText(/^Party Name/), 'New Motors');
    await user.click(within(dialog).getByRole('button', { name: 'Save Party' }));

    await waitFor(() => expect(partyApi.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Motors' })));
    expect(await screen.findByText('Party New Motors added.')).toBeInTheDocument();
    await waitFor(() => expect(partyApi.list.mock.calls.length).toBeGreaterThan(listCalls));
    expect(partyApi.summary.mock.calls.length).toBeGreaterThan(tileCalls);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deleting a party at ₹0 reloads the list and the tiles', async () => {
    partyApi.remove.mockResolvedValue(null);
    const user = setup();
    await screen.findByText('Asha Traders');
    const listCalls = partyApi.list.mock.calls.length;
    const tileCalls = partyApi.summary.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Delete Party Asha Traders' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete Party' }));

    await waitFor(() => expect(partyApi.remove).toHaveBeenCalledWith(3));
    await waitFor(() => expect(partyApi.list.mock.calls.length).toBeGreaterThan(listCalls));
    expect(partyApi.summary.mock.calls.length).toBeGreaterThan(tileCalls);
  });

  it('the party name is a link and a click on the row opens the party page', async () => {
    const user = setup();
    expect(await screen.findByRole('link', { name: 'Ramesh Motors' })).toHaveAttribute('href', '/parties/1');

    await user.click(screen.getByText('Alwar'));

    expect(await screen.findByText('Party page opened')).toBeInTheDocument();
  });

  it('shows the summary tiles', async () => {
    setup();
    expect(await screen.findByText('Total Parties')).toBeInTheDocument();
    const tile = (label) => screen.getByText(label).closest('.stat-card');
    expect(within(tile('Total Parties')).getByText('3')).toBeInTheDocument();
    expect(within(tile('Parties with Balance')).getByText('2')).toBeInTheDocument();
    expect(within(tile('Total Outstanding')).getByText('₹1,250.00')).toBeInTheDocument();
    expect(within(tile('Advance Held')).getByText('₹300.00')).toBeInTheDocument();
  });

  it('leaves the Advance tile out when no advance is held', async () => {
    partyApi.summary.mockResolvedValue({ ...SUMMARY, totalAdvance: 0 });
    setup();

    expect(await screen.findByText('Total Outstanding')).toBeInTheDocument();
    expect(screen.queryByText('Advance Held')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no parties, and a different one for a search', async () => {
    partyApi.list.mockResolvedValue(pageOf([]));
    const user = setup();
    expect(await screen.findByText('No parties yet')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Search parties' }), 'zzz');
    expect(await screen.findByText('No parties match')).toBeInTheDocument();
  });
});