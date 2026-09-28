import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

/**
 * PMA forced-sale price defaults to 70% of the selling price, and the appraiser may override it.
 *
 * So it is proposed only when the user edits the selling price. The two PMA forms used to watch the
 * selling price in an effect, which also fires when the page loads the record and reset()s the form
 * — overwriting a saved override with 70% on every open (lost for good on the next save), and
 * leaving the form dirty before anyone touched it. A watch() subscription sees reset() with no
 * field name, and setValue() with the name but no type; only a user's edit carries type 'change'.
 */
export function useForcedSalePriceDefault() {
  const { watch, setValue } = useFormContext();

  useEffect(() => {
    const subscription = watch((values, { name, type }) => {
      if (name !== 'sellingPrice' || type !== 'change') return;
      const forceSalePrice = (values.sellingPrice * 70) / 100;
      // shouldDirty: the proposal is a real change to forced-sale and has to be saved. Written from
      // inside the selling price's own change handler, so react-hook-form may then re-emit an isDirty
      // computed before this write; the PMA pages read dirtyFields, which this updates in place.
      setValue('forcedSalePrice', Math.round(forceSalePrice * 100) / 100, { shouldDirty: true });
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);
}
