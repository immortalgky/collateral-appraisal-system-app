import clsx from 'clsx';
import { RHFInputCell } from './table/RHFInputCell';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import { toFiniteNumber } from '@features/appraisal/components/priceAnalysis/domain/calculateWQS.ts';

export const AdjustFinalValueSection = ({ property }: { property: Record<string, unknown> }) => {
  const {
    finalValueFinalValue: finalValueFinalValuePath,
    finalValueFinalValueRounded: finalValueFinalValueRoundedPath,
    finalValueCoefficientOfDecision: finalValueCoefficientOfDecisionPath,
    finalValueStandardError: finalValueStandardErrorPath,
    finalValueIntersectionPoint: finalValueIntersectionPointPath,
    finalValuSlope: finalValuSlopePath,
    finalValueLowestEstimate: finalValueLowestEstimatePath,
    finalValueHighestEstimate: finalValueHighestEstimatePath,
    finalValueLandArea: finalValueLandAreaPath,
    finalValueAppraisalPrice: finalValueAppraisalPricePath,
    finalValueAppraisalPriceRounded: finalValueAppraisalPriceRoundedPath,
  } = wqsFieldPath;

  console.log('property type', property.propertyType);

  return (
    <div className="flex flex-col gap-4 text-sm py-2">
      <div className="grid grid-cols-12">
        <div className="col-span-3">Final value</div>
        <div className={clsx('col-span-2 text-right')}>
          <RHFInputCell
            fieldName={finalValueFinalValuePath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3 flex items-center">{'Final value (rounded)'}</div>
        <div className="col-span-2">
          <RHFInputCell fieldName={finalValueFinalValueRoundedPath()} inputType="number" />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Coefficient of decision</div>
        <div className="col-span-5 text-right">
          <RHFInputCell
            fieldName={finalValueCoefficientOfDecisionPath()}
            inputType="display"
            accessor={({ value }) => {
              const coeff = toFiniteNumber(value);
              return coeff < 0.85 ? (
                <div className="grid grid-cols-5 gap-0 justify-between items-center text-danger">
                  <div className="col-span-2">
                    <span>{value}</span>
                  </div>
                  <div className="col-span-3">
                    <span>{'Consider for the market survey data'}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-0">
                  <div className="col-span-2">
                    <span>{value}</span>
                  </div>
                  <div className="col-span-3"></div>
                </div>
              );
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Standard error</div>
        <div className={clsx('col-span-2 text-right')}>
          <RHFInputCell
            fieldName={finalValueStandardErrorPath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Intersection point</div>
        <div className={clsx('col-span-2 text-right')}>
          <RHFInputCell
            fieldName={finalValueIntersectionPointPath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Slope</div>
        <div className={clsx('col-span-2 text-right')}>
          <RHFInputCell
            fieldName={finalValuSlopePath()}
            inputType="display"
            accessor={({ value }) => (value ? value : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Lowest estimate</div>
        <div className={clsx('col-span-2 text-right')}>
          <RHFInputCell
            fieldName={finalValueLowestEstimatePath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Highest estimate</div>
        <div className={clsx('col-span-2 text-right')}>
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
      {property.propertyType === 'L' && (
        <div className="grid grid-cols-12">
          <div className="col-span-3">Area</div>
          <div className="col-span-2 text-right">
            <RHFInputCell
              fieldName={finalValueLandAreaPath()}
              inputType="display"
              accessor={({ value }) => (value ? value.toLocaleString() : 0)}
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-12">
        <div className="col-span-3">Appraisal Price</div>
        <div className="col-span-2 text-right">
          <RHFInputCell
            fieldName={finalValueAppraisalPricePath()}
            inputType="display"
            accessor={({ value }) => (value ? value.toLocaleString() : 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3 flex items-center">{'Appraisal Price (rounded)'}</div>
        <div className="col-span-2 text-right">
          <RHFInputCell fieldName={finalValueAppraisalPriceRoundedPath()} inputType="number" />
        </div>
      </div>
    </div>
  );
};
