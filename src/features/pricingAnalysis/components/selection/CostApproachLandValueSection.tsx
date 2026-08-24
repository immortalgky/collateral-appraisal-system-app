import { Icon } from '@/shared/components';
import { NumberInput } from '@/shared/components/inputs';
import type { TFunction } from 'i18next';
import type { Method } from '../../types/selection';
import { isCostApproachLandPricingMethod } from './costApproachLandPricingMethods';

interface CostApproachLandValueSectionProps {
  method: Method;
  isManualMode?: boolean;
  isReadOnly: boolean;
  disabled?: boolean;
  /** Whether the anchor's property group contains a land-bearing property (L/LB/LSL/LS). A
   *  pure Building/Condo/Machinery group has nothing for "Land Value" to price. */
  hasLandProperty: boolean;
  landValueInput: number | null;
  onLandValueChange: (e: { target: { name?: string; value: number | null } }) => void;
  onLandValueBlur: () => void;
  onLandValueKeyDown: (e: React.KeyboardEvent) => void;
  t: TFunction<'pricingAnalysis'>;
  /** 'list' (default): full "Land Value / Building cost / Total" breakdown for the dense list
   *  row. 'grid': compact form for the grid hero-value tile — the tile's hero number already
   *  shows the total (auto-filled elsewhere), so this only adds the Land Value input plus an
   *  optional Building cost caption, at most 2 extra lines instead of list's 3, so land-pricing
   *  tiles don't grow taller than their siblings in the grid row. */
  variant?: 'list' | 'grid';
}

/** "+ Land Value / + Building cost / = Total" section for manual-mode Cost Approach
 *  land-pricing methods, in both list and grid layouts. A plain presentational component (no
 *  hooks of its own) so it can be declared at module scope — keeping it out of the parent's
 *  render body avoids React treating it as a new component type on every re-render, which would
 *  unmount/remount the NumberInput (and drop focus) on every keystroke. */
export const CostApproachLandValueSection = ({
  method,
  isManualMode,
  isReadOnly,
  disabled,
  hasLandProperty,
  landValueInput,
  onLandValueChange,
  onLandValueBlur,
  onLandValueKeyDown,
  t,
  variant = 'list',
}: CostApproachLandValueSectionProps) => {
  if (!isCostApproachLandPricingMethod(method.methodType) || !isManualMode || !hasLandProperty)
    return null;

  const buildingValue = method.buildingValue ?? 0;
  const landValueTotal = (landValueInput ?? method.landValue ?? 0) + buildingValue;

  const landValueField = isReadOnly ? (
    <span>{Number(method.landValue ?? 0).toLocaleString()}</span>
  ) : (
    <NumberInput
      value={landValueInput}
      disabled={disabled}
      onChange={onLandValueChange}
      onBlur={onLandValueBlur}
      onKeyDown={onLandValueKeyDown}
      decimalPlaces={2}
      placeholder="0.00"
      fullWidth={false}
      className={variant === 'grid' ? 'w-34 text-xs' : 'w-40'}
      rightIcon={<Icon name="baht-sign" style="light" className="size-3" />}
    />
  );

  if (variant === 'grid') {
    return (
      <div className="flex flex-col gap-0.5 text-xs text-gray-500 mt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0">{t('costApproach.landValue')}</span>
          {landValueField}
        </div>
        {buildingValue > 0 && (
          <div className="flex items-center justify-between gap-2 text-gray-400">
            <span>{t('costApproach.buildingCost')}</span>
            <span>{buildingValue.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-row text-gray-500 ml-5 p-2">
      <ul className="w-full flex flex-col items-end gap-1 py-1">
        <li className="w-full flex justify-between items-center gap-2">
          <p>{t('costApproach.landValue')}</p>
          {landValueField}
        </li>
        {buildingValue > 0 && (
          <li className="w-full flex justify-between items-center gap-2">
            <p>{t('costApproach.buildingCost')}</p>
            <p>{buildingValue.toLocaleString()}</p>
          </li>
        )}
        <li className="w-full flex justify-between items-center gap-2 font-medium text-gray-700">
          <p>{t('costApproach.total')}</p>
          <p>{landValueTotal.toLocaleString()}</p>
        </li>
      </ul>
    </div>
  );
};
