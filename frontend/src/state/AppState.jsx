import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setupApi, settingsApi, shopApi } from '../api/endpoints';

export const DEFAULT_SETTINGS = {
  defaultBillType: 'CASH',
  defaultFocusField: 'item_search',
  defaultPrinter: '',
  dateFormat: 'DD-MM-YYYY',
  theme: 'light',
};

// Components also work without a provider (unit tests, the component gallery).
const DEFAULT_STATE = {
  setup: { status: 'ready', complete: true, error: null },
  checkSetup: () => {},
  completeSetup: async () => {},
  settings: DEFAULT_SETTINGS,
  reloadSettings: async () => {},
  shop: null,
  reloadShop: async () => {},
};

const AppStateContext = createContext(DEFAULT_STATE);

export function AppStateProvider({ children }) {
  const [setup, setSetup] = useState({ status: 'loading', complete: false, error: null });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [shop, setShop] = useState(null);

  const checkSetup = useCallback(async () => {
    setSetup({ status: 'loading', complete: false, error: null });
    try {
      const result = await setupApi.status();
      setSetup({ status: 'ready', complete: Boolean(result.setupComplete), error: null });
    } catch (error) {
      setSetup({ status: 'error', complete: false, error });
    }
  }, []);

  const reloadSettings = useCallback(async () => {
    try {
      setSettings({ ...DEFAULT_SETTINGS, ...(await settingsApi.get()) });
    } catch {
      /* keep the defaults; the gate already reports an unreachable backend */
    }
  }, []);

  const reloadShop = useCallback(async () => {
    try {
      setShop(await shopApi.get());
    } catch {
      setShop(null);
    }
  }, []);

  /** The Phase 8 setup screen calls this after POST /api/setup succeeds. */
  const completeSetup = useCallback(async () => {
    setSetup({ status: 'ready', complete: true, error: null });
    await reloadShop();
  }, [reloadShop]);

  useEffect(() => { checkSetup(); }, [checkSetup]);
  useEffect(() => { if (setup.status === 'ready') reloadSettings(); }, [setup.status, reloadSettings]);
  useEffect(() => { if (setup.status === 'ready' && setup.complete) reloadShop(); }, [setup.status, setup.complete, reloadShop]);
  useEffect(() => { document.documentElement.dataset.theme = settings.theme === 'dark' ? 'dark' : 'light'; }, [settings.theme]);

  const value = useMemo(
    () => ({ setup, checkSetup, completeSetup, settings, reloadSettings, shop, reloadShop }),
    [setup, checkSetup, completeSetup, settings, reloadSettings, shop, reloadShop],
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  return useContext(AppStateContext);
}
