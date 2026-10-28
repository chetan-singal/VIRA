import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PageTitleContext = createContext({ override: null, setOverride: () => {} });

export function PageTitleProvider({ children }) {
  const [override, setOverride] = useState(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function usePageTitleState() {
  return useContext(PageTitleContext);
}

/** A page calls usePageTitle("ADS Rajgarh", "Party details") to replace the default header text. */
export function usePageTitle(title, subtitle = '') {
  const { setOverride } = useContext(PageTitleContext);
  useEffect(() => {
    if (!title) return undefined;
    setOverride({ title, subtitle });
    return () => setOverride(null);
  }, [title, subtitle, setOverride]);
}
