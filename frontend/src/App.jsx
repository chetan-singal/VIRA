import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import AppShell from './layout/AppShell';
import SetupGate from './layout/SetupGate';
import DevComponentsPage from './pages/DevComponentsPage';
import HomePage from './pages/HomePage';
import ItemsPage from './pages/ItemsPage';
import PartiesPage from './pages/PartiesPage';
import PartyPage from './pages/PartyPage';
import PlaceholderPage, { NotFoundPage } from './pages/PlaceholderPage';
import SettingsPage from './pages/SettingsPage';
import SetupPage from './pages/SetupPage';
import ShopProfilePage from './pages/ShopProfilePage';
import SuppliersPage from './pages/SuppliersPage';
import { AppStateProvider } from './state/AppState';

/* Screens that later phases build. Each already has its route, menu highlight and header title. */
const PLACEHOLDERS = [
  { path: 'dashboard', title: 'Dashboard', phase: 11, summary: 'Business overview for Today, This Month, This Year or a custom period.',
    items: ['Five KPI cards, with a red warning for negative Cash in Hand', 'Sales Trend and the two-segment Sales Distribution', 'Recent Bills, Payments and Supplier Payments with row actions'] },
  { path: 'bills/new', title: 'New Bill', phase: 9, summary: 'Cash Bill and Party Bill entry.',
    items: ['F2 item search, 15-row scrolling grid, totals and round-off', 'The Permanent / This Bill Only pricing popup', 'The same screen edits an existing bill'] },
  { path: 'bills/:id/edit', title: 'Edit Bill', phase: 9, summary: 'The New Bill screen in edit mode.' },
  { path: 'daybook', title: 'Daybook', phase: 10, summary: 'Every bill, with filters, summary tiles and the row-action control.',
    items: ['Include deleted bills toggle (summary stays unchanged)', 'Status column with Revised and Deleted badges', 'Bill preview pane'] },
  { path: 'payment-vouchers', title: 'Payment Vouchers', phase: 10, summary: 'Payments received from parties, with the entry form on the right.' },
  { path: 'part-search', title: 'Part Search', phase: 11, summary: 'Find a part by name, Part Category or Compatible Bike.' },
  { path: 'settings', title: 'Settings', phase: 8, summary: 'The five preferences and Recalculate Balances.' },
];

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AppStateProvider>
          <SetupGate>
            <Routes>
              <Route path="/setup" element={<SetupPage />} />
              <Route element={<AppShell />}>
                <Route index element={<HomePage />} />
                <Route path="items" element={<ItemsPage />} />
                <Route path="parties" element={<PartiesPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="suppliers/:id" element={<SuppliersPage />} />
                <Route path="parties/:id" element={<PartyPage />} />
                <Route path="shop-profile" element={<ShopProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
                {PLACEHOLDERS.map((p) => (
                  <Route key={p.path} path={p.path} element={<PlaceholderPage {...p} />} />
                ))}
                {import.meta.env.DEV && <Route path="dev/components" element={<DevComponentsPage />} />}
                <Route path="home" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </SetupGate>
        </AppStateProvider>
      </ToastProvider>
    </HashRouter>
  );
}