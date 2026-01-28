import { useController, useFormContext, useWatch } from 'react-hook-form';
import { INTERCEPT, RSQ, SLOPE, STEYX } from '../../domain/excelUtils/regression';
import clsx from 'clsx';
import { useMemo } from 'react';
import { useDerivedFields } from '../../components/useDerivedFieldArray';
import { NumberInput } from '@/shared/components';
import { formatNumber } from '@/shared/utils/formatUtils';

export const AdjustFinalValueSection = ({ property }) => {
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

  const {
    finalValue,
    finalValueRounded,
    RSQResult,
    stdErrorResult,
    intersectionPointResult,
    slopeResult,
    lowestEstimate,
    highestEstimate,
    appraisalPrice,
  } = useMemo(() => {
    // WQS score section
    const known_xs = (WQSScores ?? [])
      .map(
        f =>
          f.surveys?.map(survey => ({
            score: survey.surveyScore ?? 0,
            weight: f.weight ?? 0,
          })) ?? [],
      )
      .reduce((acc, curr) => {
        curr.forEach((value, i) => {
          acc[i] = (acc[i] ?? 0) + value.score * value.weight;
        });
        return acc;
      }, []);

    // WQS calculation section
    const known_ys = (WQSCalculations ?? []).filter(c => c.marketId).map(c => c.adjustedValue ?? 0);

    const isEqualLength = known_xs.length === known_ys.length;

    const finalValue = isEqualLength
      ? Number.isFinite(WQSFinalValue.finalValue)
        ? WQSFinalValue.finalValue
        : 0
      : 0;
    const finalValueRounded = isEqualLength
      ? Number.isFinite(WQSFinalValue.finalValueRounded)
        ? WQSFinalValue.finalValueRounded
        : 0
      : 0;
    const RSQResult = isEqualLength
      ? Number.isFinite(RSQ(known_ys, known_xs))
        ? RSQ(known_ys, known_xs)
        : 0
      : 0;
    const stdErrorResult = isEqualLength
      ? Number.isFinite(STEYX(known_ys, known_xs))
        ? STEYX(known_ys, known_xs)
        : 0
      : 0;
    const intersectionPointResult = isEqualLength
      ? Number.isFinite(INTERCEPT(known_ys, known_xs))
        ? INTERCEPT(known_ys, known_xs)
        : 0
      : 0;
    const slopeResult = isEqualLength
      ? Number.isFinite(SLOPE(known_ys, known_xs))
        ? SLOPE(known_ys, known_xs)
        : 0
      : 0;
    const lowestEstimate = Number.isFinite(finalValueRounded)
      ? finalValueRounded - stdErrorResult
      : 0;
    const highestEstimate = Number.isFinite(finalValueRounded)
      ? finalValueRounded + stdErrorResult
      : 0;
    const appraisalPrice = Number.isFinite(WQSFinalValue.appraisalPrice)
      ? WQSFinalValue.appraisalPrice
      : 0;
    return {
      finalValue,
      finalValueRounded,
      RSQResult,
      stdErrorResult,
      intersectionPointResult,
      slopeResult,
      lowestEstimate,
      highestEstimate,
      appraisalPrice,
    };
  }, [WQSScores, WQSCalculations, WQSFinalValue]);

  useDerivedFields({
    rules: [
      {
        targetPath: 'WQSFinalValue.coefficientOfDecision',
        deps: ['WQSScores', 'WQSCalculations'],
        compute: () => parseFloat(RSQResult.toFixed(4)),
      },
      {
        targetPath: 'WQSFinalValue.standardError',
        deps: ['WQSScores', 'WQSCalculations'],
        compute: () => parseFloat(stdErrorResult.toFixed(2)),
      },
      {
        targetPath: 'WQSFinalValue.intersectionPoint',
        deps: ['WQSScores', 'WQSCalculations'],
        compute: () => parseFloat(intersectionPointResult.toFixed(2)),
      },
      {
        targetPath: 'WQSFinalValue.slope',
        deps: ['WQSScores', 'WQSCalculations'],
        compute: () => parseFloat(slopeResult.toFixed(2)),
      },
      {
        targetPath: 'WQSFinalValue.lowestEstimate',
        deps: ['WQSScores', 'WQSCalculations'],
        compute: () => parseFloat(lowestEstimate.toFixed(2)),
      },
      {
        targetPath: 'WQSFinalValue.highestEstimate',
        deps: ['WQSScores', 'WQSCalculations'],
        compute: () => parseFloat(highestEstimate.toFixed(2)),
      },
      {
        targetPath: 'WQSFinalValue.appraisalPrice',
        deps: ['WQSScores', 'WQSCalculations'],
        compute: () => {
          if (property.collateralType === 'L') {
            return parseFloat((property.landArea * finalValueRounded).toFixed(2));
          }
          return parseFloat(finalValueRounded.toFixed(2));
        },
      },
      {
        targetPath: 'WQSFinalValue.appraisalPriceRounded',
        deps: ['WQSScores', 'WQSCalculations'],
        compute: () => {
          if (property.collateralType === 'L') {
            return parseFloat(appraisalPrice.toFixed(2));
          }
          return parseFloat(appraisalPrice.toFixed(2));
        },
      },
    ],
    ctx: {},
  });

  return (
    <div className="flex flex-col gap-4 text-sm py-2">
      <div className="grid grid-cols-12">
        <div className="col-span-3">Final value</div>
        <div className={clsx('col-span-9')}>{finalValue ?? 0}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3 flex items-center">{'Appraisal Price (rounded)'}</div>
        <div className="col-span-9">
          <NumberInput
            {...finalValueRoundedField}
            error={finalValueRoundedError?.message}
            className="w-[130px]"
            fullWidth={false}
          />
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Coefficient of decision</div>
        <div className={(clsx('col-span-9'), RSQResult < 0.85 ? 'text-danger' : '')}>
          {RSQResult.toFixed(5) ?? 0}
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Standard error</div>
        <div className={clsx('col-span-9')}>{stdErrorResult.toFixed(6) ?? 0}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Intersection point</div>
        <div className={clsx('col-span-9')}>{intersectionPointResult}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Slope</div>
        <div className={clsx('col-span-9')}>{slopeResult}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Lowest estimate</div>
        <div className={clsx('col-span-9')}>{parseFloat(lowestEstimate.toFixed(2))}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Highest estimate</div>
        <div className={clsx('col-span-9')}>{parseFloat(highestEstimate.toFixed(2))}</div>
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
          {property.collateralType === 'L'
            ? formatNumber(property.landArea * finalValueRounded)
            : finalValueRounded}
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Appraisal Price</div>
        <div className="col-span-9">{WQSFinalValue.appraisalPriceRounded - appraisalPrice}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3 flex items-center">{'Appraisal Price (rounded)'}</div>
        <div className="col-span-9">
          <NumberInput
            {...appraisalPriceRoundedField}
            error={appraisalPriceRoundedError?.message}
            className="w-[130px]"
            fullWidth={false}
          />
        </div>
      </div>
    </div>
  );
};
