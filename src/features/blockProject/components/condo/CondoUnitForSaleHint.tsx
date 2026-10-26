import { useFormContext, useWatch } from 'react-hook-form';

import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

import { CondoDerivedHint } from './CondoDerivedHint';
import { useCondoRollup } from './useCondoRollup';

/**
 * Under Unit For Sale: what the unit list counts, and whether the entered number agrees. "Use this
 * value" only sets the form value; the field stays editable and nothing saves until Save. Nothing
 * at all while the list is empty, and no button on a read-only page.
 *
 * The value is set as a number, the shape NumberInput and the loaded record both use, so RHF's
 * dirty check (value vs the form's defaults) clears the field again when the count equals the saved
 * figure. Setting it to a figure that differs from the saved one is a real edit and stays dirty.
 */
export function CondoUnitForSaleHint() {
  const { control, setValue } = useFormContext();
  const isReadOnly = usePageReadOnly();
  const { units } = useCondoRollup();
  const entered = useWatch({ control, name: 'unitForSaleCount' });
  if (units === 0) return null;
  return (
    <CondoDerivedHint
      derived={units}
      entered={typeof entered === 'number' ? entered : null}
      onUse={
        isReadOnly
          ? undefined
          : () => setValue('unitForSaleCount', units, { shouldDirty: true, shouldValidate: true })
      }
    />
  );
}
