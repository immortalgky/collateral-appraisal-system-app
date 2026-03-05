import { useFormContext, useWatch } from 'react-hook-form';
import { RHFInputCell } from './table/RHFInputCell';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import { toFiniteNumber } from '@features/pricingAnalysis/domain/calculateWQS.ts';

export const AdjustFinalValueSection = ({ property }: { property: Record<string, unknown> }) => {
  const {
    finalValueCoefficientOfDecision: coeffPath,
    finalValueIncludeLandArea: includeLandAreaPath,
    finalValueHasBuildingCost: hasBuildingCostPath,
    finalValueLandArea: landAreaPath,
    finalValueUsableArea: usableAreaPath,
    finalValueAppraisalPrice: appraisalPricePath,
    finalValueAppraisalPriceRounded: appraisalPriceRoundedPath,
  } = wqsFieldPath;

  const { control } = useFormContext();
  const includeLandArea = useWatch({ control, name: includeLandAreaPath() });
  const appraisalPrice = useWatch({ control, name: appraisalPricePath() }) ?? 0;
  const appraisalPriceRounded = useWatch({ control, name: appraisalPriceRoundedPath() }) ?? 0;

  const isLand = property.propertyType === 'L';
  const isUsable = property.propertyType === 'U';
  const areaUnit = isLand ? 'Sq. Wa' : 'Sq. m.';
  const areaFieldPath = isLand ? landAreaPath() : usableAreaPath();

  const differentiate = toFiniteNumber(appraisalPrice) - toFiniteNumber(appraisalPriceRounded);

  return (
    <div className="flex flex-col gap-3 text-sm py-2">
      {/* Coefficient of decision */}
      <div className="grid grid-cols-12 items-center">
        <div className="col-span-3 text-gray-600">Coefficient of decision</div>
        <div className="col-span-6">
          <RHFInputCell
            fieldName={coeffPath()}
            inputType="display"
            accessor={({ value }) => {
              const coeff = toFiniteNumber(value);
              return coeff < 0.85 ? (
                <div className="flex items-center gap-4 text-danger">
                  <span>{value}</span>
                  <span className="text-xs">{'Consider for the market survey data'}</span>
                </div>
              ) : (
                <span>{value}</span>
              );
            }}
          />
        </div>
      </div>

      {/* Include Area toggle */}
      <div className="grid grid-cols-12 items-center">
        <div className="col-span-3 text-gray-600">Include Area</div>
        <div className="col-span-2">
          <RHFInputCell
            fieldName={includeLandAreaPath()}
            inputType="toggle"
            toggle={{ checked: includeLandArea, options: ['No', 'Yes'] }}
          />
        </div>
      </div>

      {/* Area (shown when include area is on) */}
      {includeLandArea && (isLand || isUsable) && (
        <div className="grid grid-cols-12 items-center">
          <div className="col-span-3 text-gray-600">Area</div>
          <div className="col-span-2 text-right">
            <RHFInputCell
              fieldName={areaFieldPath}
              inputType="display"
              accessor={({ value }) => (value ? Number(value).toLocaleString() : '0')}
            />
          </div>
          <div className="col-span-1 pl-2 text-gray-500">{areaUnit}</div>
        </div>
      )}

      {/* Appraisal Price */}
      <div className="grid grid-cols-12 items-center">
        <div className="col-span-3 text-gray-600">Appraisal Price</div>
        <div className="col-span-2 text-right">
          <RHFInputCell
            fieldName={appraisalPricePath()}
            inputType="display"
            accessor={({ value }) => (value ? Number(value).toLocaleString() : '0')}
          />
        </div>
        <div className="col-span-1 pl-2 text-gray-500">Baht</div>
      </div>

      {/* Appraisal Price (Rounded) + differentiate */}
      <div className="grid grid-cols-12 items-center">
        <div className="col-span-3 text-gray-600">{'Appraisal Price (Rounded)'}</div>
        <div className="col-span-2">
          <RHFInputCell fieldName={appraisalPriceRoundedPath()} inputType="number" />
        </div>
        <div className="col-span-1 pl-2 text-gray-500">Baht</div>
        {differentiate !== 0 && (
          <>
            <div className="col-span-2 text-right text-gray-500">
              {differentiate > 0 ? '+' : ''}{differentiate.toLocaleString()}
            </div>
            <div className="col-span-1 pl-2 text-xs text-gray-400">differentiate</div>
          </>
        )}
      </div>

      {/* Include building cost toggle */}
      <div className="grid grid-cols-12 items-center">
        <div className="col-span-3 text-gray-600">Include building cost</div>
        <div className="col-span-2">
          <RHFInputCell
            fieldName={hasBuildingCostPath()}
            inputType="toggle"
            toggle={{ checked: false, options: ['No', 'Yes'] }}
          />
        </div>
      </div>
    </div>
  );
};
