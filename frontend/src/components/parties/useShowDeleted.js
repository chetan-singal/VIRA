import { useState } from 'react';

/**
 * The "Show deleted records" choice of a Selected Party tab. It is off while the party is active and on while the
 * party is deleted (so a deleted party's page still lists every row), until the user ticks or unticks the box.
 */
export function useShowDeleted(party) {
  const [choice, setChoice] = useState(null);
  return [choice ?? Boolean(party.deleted), setChoice];
}