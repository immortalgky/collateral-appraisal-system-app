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
      // Deferred until the selling price's own change handler has finished. Written synchronously
      // from inside this callback, the proposal was overtaken by that handler's isDirty, computed
      // while forced-sale still held the previous proposal: type the selling price back to the
      // saved value and the form stayed dirty with no field dirty — badge on, leave guard silent.
      queueMicrotask(() =>
        setValue('forcedSalePrice', Math.round(forceSalePrice * 100) / 100, { shouldDirty: true }),
      );
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);
}
