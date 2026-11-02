import { useState } from 'react';
import { bikeApi, categoryApi, itemApi } from '../api/endpoints';
import { Select, TextInput } from '../components/form/inputs';
import ItemDetails from '../components/items/ItemDetails';
import ItemForm from '../components/items/ItemForm';
import DataTable from '../components/table/DataTable';
import Pagination from '../components/table/Pagination';
import { useListQuery } from '../components/table/useListQuery';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Panel } from '../components/ui/Cards';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { InlineAlert } from '../components/ui/Feedback';
import IconButton from '../components/ui/IconButton';
import Modal from '../components/ui/Modal';
import { Money } from '../components/ui/Money';
import { useToast } from '../components/ui/Toast';
import { useApi } from '../hooks/useApi';
import { describeError } from '../lib/errors';

const TYPE_FILTER = [
  { value: '', label: 'All Types' },
  { value: 'MRP', label: 'MRP Item' },
  { value: 'NET_RATE', label: 'Net Rate Item' },
];

/** Saved rates for an item: the Cash rate counts as one, plus one per party. */
function overrideCount(overrides) {
  if (!overrides) return null;
  return (overrides.cash ? 1 : 0) + (overrides.parties?.length ?? 0);
}

/** Permanent delete (SRS §6.1). The count of saved rates comes from GET /api/items/{id}/rate-overrides. */
function DeleteItemDialog({ item, onCancel, onDeleted }) {
  const overrides = useApi((signal) => itemApi.rateOverrides(item.id, { signal }), [item.id]);
  const count = overrideCount(overrides.data);
  return (
    <ConfirmDialog
      open
      tone="danger"
      title="Delete this item permanently?"
      confirmLabel="Delete Item"
      onCancel={onCancel}
      onConfirm={async () => {
        await itemApi.remove(item.id);
        onDeleted(item);
      }}
    >
      <p><strong>{item.name}</strong> will be deleted. This cannot be undone.</p>
      <p>
        Its saved Party and Cash rates ({count ?? '…'}) are deleted with it. Bills already created are not affected;
        they keep their own copy of the item.
      </p>
      {overrides.error && <InlineAlert tone="warning">The number of saved rates could not be loaded.</InlineAlert>}
    </ConfirmDialog>
  );
}

/** Remove every Party and Cash rate for an item, which re-opens its Item Type (SRS §4.5). */
function UnlockItemDialog({ item, onCancel, onUnlocked }) {
  const overrides = useApi((signal) => itemApi.rateOverrides(item.id, { signal }), [item.id]);
  const count = overrideCount(overrides.data);
  return (
    <ConfirmDialog
      open
      tone="danger"
      icon="warning"
      title="Remove all saved rates?"
      confirmLabel="Remove rates"
      onCancel={onCancel}
      onConfirm={async () => {
        await itemApi.clearRateOverrides(item.id);
        onUnlocked(item);
      }}
    >
      <p>
        {count ?? '…'} saved {count === 1 ? 'rate' : 'rates'} for <strong>{item.name}</strong> will be removed
        (the Cash rate counts as one, plus one per party). This cannot be taken back.
      </p>
      <p>The Item Type itself is not changed. Once the rates are removed you can change the type and save.</p>
      {overrides.error && <InlineAlert tone="warning">The number of saved rates could not be loaded.</InlineAlert>}
    </ConfirmDialog>
  );
}

/** Items: search and filter, a table, the Item Details panel and the Add / Edit / Delete flows (SRS §4 to §6). */
export default function ItemsPage() {
  const toast = useToast();
  const list = useListQuery({ filters: { type: '', categoryId: '' }, size: 10, sort: 'name,asc' });
  const items = useApi((signal) => itemApi.list(list.params, { signal }), [list.params]);
  const categories = useApi((signal) => categoryApi.list({ signal }), []);
  const bikes = useApi((signal) => bikeApi.list({ signal }), []);

  const [selectedId, setSelectedId] = useState(null);
  const details = useApi((signal) => itemApi.get(selectedId, { signal }), [selectedId], { enabled: selectedId !== null });
  const [form, setForm] = useState(null); // { item }, with item null for Add New Item
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [unlockTarget, setUnlockTarget] = useState(null);

  const page = items.data;
  const rows = page?.content ?? [];
  const shown = details.data && details.data.id === selectedId ? details.data : null;
  const categoryFilter = [
    { value: '', label: 'All Categories' },
    ...(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ];

  async function openEdit(id) {
    try {
      setForm({ item: await itemApi.get(id) });
    } catch (error) {
      toast.error(describeError(error));
    }
  }

  function handleSaved(saved) {
    setForm(null);
    toast.success('Item saved.');
    setSelectedId(saved.id);
    items.reload();
    details.reload();
  }

  function handleDeleted(item) {
    setDeleteTarget(null);
    toast.success('Item deleted.');
    if (selectedId === item.id) setSelectedId(null);
    if (rows.length === 1 && list.page > 0) list.setPage(list.page - 1);
    else items.reload();
  }

  function handleUnlocked() {
    setUnlockTarget(null);
    toast.success('Rates removed. The Item Type can now be changed.');
    details.reload();
  }

  const columns = [
    { key: 'no', header: 'S.No.', width: 64, render: (row, index) => (page?.page ?? 0) * (page?.size ?? list.size) + index + 1 },
    { key: 'name', header: 'Item Name', wrap: true, render: (row) => <strong>{row.name}</strong> },
    {
      key: 'type', header: 'Type',
      render: (row) => <Badge tone={row.itemType === 'MRP' ? 'blue' : 'purple'}>{row.itemType === 'MRP' ? 'MRP' : 'Net Rate'}</Badge>,
    },
    { key: 'unit', header: 'Unit', render: (row) => row.unit },
    { key: 'category', header: 'Category', render: (row) => row.partCategory?.name ?? '—' },
    { key: 'rate', header: 'Default Rate', align: 'right', render: (row) => <Money value={row.defaultRate} /> },
    {
      key: 'actions', header: 'Action', align: 'right',
      render: (row) => (
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          <IconButton icon="edit" label={`Edit ${row.name}`} tone="edit" onClick={() => openEdit(row.id)} />
          <IconButton icon="delete" label={`Delete ${row.name}`} tone="delete" onClick={() => setDeleteTarget(row)} />
        </span>
      ),
    },
  ];

  const addButton = <Button variant="primary" icon="plus" onClick={() => setForm({ item: null })}>Add New Item</Button>;
  const lookupError = categories.error || bikes.error;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row-between">
        <span className="muted">Names, units, categories, compatible bikes and base prices.</span>
        {addButton}
      </div>

      {lookupError && (
        <InlineAlert tone="error" title="Categories or bikes could not be loaded">{describeError(lookupError)}</InlineAlert>
      )}

      <div className="split">
        <Panel flush>
          <div className="toolbar">
            <TextInput
              className="grow"
              aria-label="Search items"
              placeholder="Search by item name"
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
            />
            <Select aria-label="Item type" options={TYPE_FILTER} value={list.filters.type} onChange={(e) => list.setFilter('type', e.target.value)} />
            <Select aria-label="Category" options={categoryFilter} value={list.filters.categoryId} onChange={(e) => list.setFilter('categoryId', e.target.value)} />
            <Button onClick={list.clear} disabled={!list.isFiltered}>Clear</Button>
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            loading={items.loading}
            error={items.error}
            onRetry={items.reload}
            onRowClick={(row) => setSelectedId(row.id)}
            selectedKey={selectedId ?? undefined}
            emptyTitle={list.isFiltered ? 'No items match' : 'No items yet'}
            emptyHint={list.isFiltered ? 'Try a different search or clear the filters.' : addButton}
            caption="Items"
          />
          <Pagination
            page={page?.page ?? 0}
            size={page?.size ?? list.size}
            totalElements={page?.totalElements ?? 0}
            totalPages={page?.totalPages ?? 0}
            onPageChange={list.setPage}
            onSizeChange={list.setSize}
          />
        </Panel>

        <Panel title="Item Details" icon="items">
          <ItemDetails
            selected={selectedId !== null}
            item={shown}
            loading={details.loading}
            error={details.error}
            onRetry={details.reload}
            onEdit={() => openEdit(selectedId)}
            onDelete={() => shown && setDeleteTarget(shown)}
            onRemoveOverrides={() => shown && setUnlockTarget(shown)}
          />
        </Panel>
      </div>

      {form && (
        <Modal open size="lg" title={form.item ? `Edit Item — ${form.item.name}` : 'Add New Item'} onClose={() => setForm(null)}>
          <ItemForm
            item={form.item}
            categories={categories.data ?? []}
            bikes={bikes.data ?? []}
            onCategoryCreated={categories.reload}
            onBikeCreated={bikes.reload}
            onSaved={handleSaved}
            onCancel={() => setForm(null)}
          />
        </Modal>
      )}
      {deleteTarget && <DeleteItemDialog item={deleteTarget} onCancel={() => setDeleteTarget(null)} onDeleted={handleDeleted} />}
      {unlockTarget && <UnlockItemDialog item={unlockTarget} onCancel={() => setUnlockTarget(null)} onUnlocked={handleUnlocked} />}
    </div>
  );
}