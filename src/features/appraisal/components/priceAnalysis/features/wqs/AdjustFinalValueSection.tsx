import { useController, useFormContext, useWatch } from 'react-hook-form';
import clsx from 'clsx';
import { NumberInput } from '@/shared/components';
import { formatNumber } from '@/shared/utils/formatUtils';
import { RHFInputCell } from '../../components/table/RHFInputCell';
import { wqsFieldPath } from './adapters/fieldPath';
import { toFiniteNumber } from './domain/calculations';

export const AdjustFinalValueSection = ({ property }) => {
  const {
    finalValueFinalValue: finalValueFinalValuePath,
    finalValueFinalValueRounded: finalValueFinalValueRoundedPath,
    finalValueCoefficientOfDecision: finalValueCoefficientOfDecisionPath,
    finalValueStandardError: finalValueStandardErrorPath,
    finalValueIntersectionPoint: finalValueIntersectionPointPath,
    finalValuSlope: finalValuSlopePath,
    finalValueLowestEstimate: finalValueLowestEstimatePath,
    finalValueHighestEstimate: finalValueHighestEstimatePath,
    finalValueAppraisalPrice: finalValueAppraisalPricePath,
    finalValueAppraisalPriceRounded: finalValueAppraisalPriceRoundedPath,
  } = wqsFieldPath;

  const { control, setValue } = useFormContext();
  const { WQSScores, WQSCalculations, WQSFinalValue } = useWatch();
  const {
    field: appraisalPriceRoundedField,
    fieldState: { error: appraisalPriceRoundedError },
  } = useController({ control, name: 'WQSFinalValue.appraisalPriceRounded' });
  const {
    field: finalValueRoundedField,
    fieldState: { error: finalValueRoundedError },
  } = useController({ control, name: 'WQSFinalValue.finalValueRounded' });

  return (
    <div className="flex flex-col gap-4 text-sm py-2">
      <div className="grid grid-cols-12">
        <div className="col-span-3">Final value</div>
        <div className={clsx('col-span-9')}>
          <RHFInputCell
            fieldName={finalValueFinalValuePath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3 flex items-center">{'Final value (rounded)'}</div>
        <div className="col-span-9">
          <RHFInputCell fieldName={finalValueFinalValueRoundedPath()} inputType="number" />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Coefficient of decision</div>
        <RHFInputCell
          fieldName={finalValueCoefficientOfDecisionPath()}
          inputType="display"
          accessor={({ value }) => {
            const coeff = toFiniteNumber(value);
            return coeff < 0.85 ? (
              <div className="text-danger">
                <span>{value}</span>
                <span>{'Consider for the market survey data'}</span>
              </div>
            ) : (
              <div>
                <span>{value}</span>
              </div>
            );
          }}
        />
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Standard error</div>
        <div className={clsx('col-span-9')}>
          <RHFInputCell
            fieldName={finalValueStandardErrorPath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Intersection point</div>
        <div className={clsx('col-span-9')}>
          <RHFInputCell
            fieldName={finalValueIntersectionPointPath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Slope</div>
        <div className={clsx('col-span-9')}>
          <RHFInputCell
            fieldName={finalValuSlopePath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Lowest estimate</div>
        <div className={clsx('col-span-9')}>
          <RHFInputCell
            fieldName={finalValueLowestEstimatePath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Highest estimate</div>
        <div className={clsx('col-span-9')}>
          <RHFInputCell
            fieldName={finalValueHighestEstimatePath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      {/* <div className="grid grid-cols-12">
        <div className="col-span-3">Include area</div>
        <div className="col-span-9"></div>
      </div> */}
      {property.collateralType === 'L' && (
        <div className="grid grid-cols-12">
          <div className="col-span-3">Area</div>
          <div className="col-span-9">{property.landArea ?? 0}</div>
        </div>
      )}
      <div className="grid grid-cols-12">
        <div className="col-span-3">Appraisal Price</div>
        <div className="col-span-9">
          <RHFInputCell
            fieldName={finalValueAppraisalPricePath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3 flex items-center">{'Appraisal Price (rounded)'}</div>
        <div className="col-span-9">
          <RHFInputCell fieldName={finalValueAppraisalPriceRoundedPath()} inputType="number" />
        </div>
      </div>
    </div>
  );
};
