import { useEffect, useState } from 'react';
import { setupApi } from '../api/endpoints';
import { STATUS_POLL_MS } from '../config';

/** true while the backend (and therefore MySQL) answers; re-checked every 30 seconds. */
export function useBackendStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        await setupApi.status();
        if (alive) setOnline(true);
      } catch {
        if (alive) setOnline(false);
      }
    };
    const id = setInterval(ping, STATUS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return online;
}
