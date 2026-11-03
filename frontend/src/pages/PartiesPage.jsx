import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { partyApi } from '../api/endpoints';
import { TextInput } from '../components/form/inputs';
import PartyListTiles from '../components/parties/PartyListTiles';
import EditRecordModal from '../components/records/EditRecordModal';
import RowActions from '../components/records/RowActions';
import DataTable from '../components/table/DataTable';
import Pagination from '../components/table/Pagination';
import { useListQuery } from '../components/table/useListQuery';
import Button from '../components/ui/Button';
import { Panel } from '../components/ui/Cards';
import { Balance } from '../components/ui/Money';
import StatusBadges from '../components/ui/StatusBadges';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import { useApi } from '../hooks/useApi';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'deleted', label: 'Deleted' },
];

/** Parties: Active and Deleted lists, search by name, city or phone, and New Party (SRS §9.1, §9.2). */
export default function PartiesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const list = useListQuery({ filters: { deleted: false }, clearable: [], size: 10, sort: 'name,asc' });
  const showingDeleted = list.filters.deleted === true;
  const parties = useApi((signal) => partyApi.list(list.params, { signal }), [list.params]);
  const tiles = useApi((signal) => partyApi.summary({ signal }), [], { enabled: !showingDeleted });
  const [adding, setAdding] = useState(false);

  const page = parties.data;
  const rows = page?.content ?? [];

  function handleChanged(change) {
    tiles.reload();
    const leavesThisTab = change.action === 'deleted' || change.action === 'restored';
    if (leavesThisTab && rows.length === 1 && list.page > 0) list.setPage(list.page - 1);
    else parties.reload();
  }

  function handleCreated(saved) {
    setAdding(false);
    toast.success(`Party ${saved.name} added.`);
    tiles.reload();
    if (showingDeleted) list.setFilter('deleted', false);
    else parties.reload();
  }

  const columns = [
    { key: 'no', header: 'S.No.', width: 64, render: (row, index) => (page?.page ?? 0) * (page?.size ?? list.size) + index + 1 },
    {
      key: 'name', header: 'Party Name', wrap: true,
      render: (row) => <Link to={`/parties/${row.id}`} onClick={(e) => e.stopPropagation()}><strong>{row.name}</strong></Link>,
    },
    { key: 'city', header: 'City', render: (row) => row.city || '—' },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
    { key: 'balance', header: 'Current Balance', align: 'right', render: (row) => <Balance value={row.currentBalance} showDue /> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadges record={row} /> },
    { key: 'actions', header: 'Action', align: 'right', render: (row) => <RowActions type="party" record={row} onChanged={handleChanged} /> },
  ];

  const addButton = <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>New Party</Button>;
  let emptyTitle = 'No parties yet';
  let emptyHint = addButton;
  if (list.isFiltered) {
    emptyTitle = 'No parties match';
    emptyHint = 'Try a different search or clear it.';
  } else if (showingDeleted) {
    emptyTitle = 'No deleted parties';
    emptyHint = 'A deleted party stays here and can be restored.';
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row-between">
        <span className="muted">A party can be deleted only when its balance is exactly ₹0.</span>
        {addButton}
      </div>

      <Tabs
        label="Party lists"
        tabs={TABS}
        active={showingDeleted ? 'deleted' : 'active'}
        onChange={(key) => list.setFilter('deleted', key === 'deleted')}
      />

      <Panel flush>
        <div className="toolbar">
          <TextInput
            className="grow"
            aria-label="Search parties"
            placeholder="Search by name, city or phone"
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
          />
          <Button onClick={list.clear} disabled={!list.isFiltered}>Clear</Button>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={parties.loading}
          error={parties.error}
          onRetry={parties.reload}
          onRowClick={(row) => navigate(`/parties/${row.id}`)}
          emptyTitle={emptyTitle}
          emptyHint={emptyHint}
          caption={showingDeleted ? 'Deleted parties' : 'Parties'}
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

      {!showingDeleted && <PartyListTiles summary={tiles.data} error={tiles.error} />}

      {adding && <EditRecordModal type="party" record={null} open onClose={() => setAdding(false)} onSaved={handleCreated} />}
    </div>
  );
}