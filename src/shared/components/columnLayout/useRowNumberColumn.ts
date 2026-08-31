import { useCallback, useEffect, useState } from 'react';

/**
 * The running row-number (`#`) column, toggled and persisted on its own.
 *
 * Kept OUT of the reorderable, persisted column set on purpose. That set forces `stickyColumn` to
 * index 0, so putting `#` in it would make it fight the column that genuinely wants to be pinned;
 * and its key is neither a field of the row type nor a sort target, so it would squat in the
 * stored order forever, surviving every future rename of the real columns.
 *
 * Defaults to on, so a user who has never opened the picker sees what they saw before.
 */
export function useRowNumberColumn(storageKey: string) {
  const key = `${storageKey}-rownumber`;

  const read = useCallback(() => {
    try {
      // Only an explicit "0" turns it off; anything else — absent, corrupt, unreadable — is on.
      return localStorage.getItem(key) !== '0';
    } catch {
      return true;
    }
  }, [key]);

  const [showRowNumber, setShow] = useState<boolean>(read);

  useEffect(() => {
    setShow(read());
  }, [read]);

  const toggleRowNumber = useCallback(() => {
    setShow(prev => {
      const next = !prev;
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // ignore quota / unavailable-storage errors — in-memory state still updates
      }
      return next;
    });
  }, [key]);

  return { showRowNumber, toggleRowNumber };
}
