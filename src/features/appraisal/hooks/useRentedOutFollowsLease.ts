import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

/**
 * Picking "tied to a lease" (obligation 03) makes the property rented out. Only the appraiser's own
 * pick does it (`type === 'change'`): a record loading carries none, so opening one never dirties
 * the form. The rented-out toggle locks while the pick stands (its `disableWhen`); dropping the
 * pick unlocks it with its value kept.
 */
export function useRentedOutFollowsLease(enabled = true) {
  const { watch, getValues, setValue } = useFormContext();
  useEffect(() => {
    if (!enabled) return;
    const subscription = watch((_values, { name, type }) => {
      if (name !== 'obligationType' || type !== 'change') return;
      if (getValues('obligationType')?.includes('03')) {
        setValue('isRentedOut', true, { shouldDirty: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [enabled, watch, getValues, setValue]);
}
