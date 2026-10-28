import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { exitApp } from '../lib/exitApp';
import Header from './Header';
import { PageTitleProvider } from './PageTitle';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

/** Sidebar + header + page + status bar. Every screen except first-run setup renders inside it. */
export default function AppShell() {
  const [exitOpen, setExitOpen] = useState(false);
  const toast = useToast();

  function exit() {
    const closed = exitApp();
    setExitOpen(false);
    if (!closed) toast.info('A browser tab cannot be closed by the app. Close this tab yourself; the desktop app closes its own window.');
  }

  return (
    <PageTitleProvider>
      <div className="app-shell">
        <Sidebar onExit={() => setExitOpen(true)} />
        <div className="app-main">
          <Header />
          <main className="app-content"><Outlet /></main>
          <StatusBar />
        </div>
      </div>
      <ConfirmDialog open={exitOpen} title="Close VIRA?" icon="exit" confirmLabel="Exit" onCancel={() => setExitOpen(false)} onConfirm={exit}>
        <p>Everything you saved is already stored. Close the application?</p>
      </ConfirmDialog>
    </PageTitleProvider>
  );
}
