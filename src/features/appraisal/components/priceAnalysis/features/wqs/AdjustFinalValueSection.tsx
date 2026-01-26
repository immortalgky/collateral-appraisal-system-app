import { useController, useFormContext, useWatch } from 'react-hook-form';
import { INTERCEPT, RSQ, SLOPE, STEYX } from '../../domain/excelUtils/regression';
import clsx from 'clsx';
import { useEffect, useMemo } from 'react';
import { useDerivedFields } from '../../components/useDerivedFieldArray';

export const AdjustFinalValueSection = ({ property }) => {
  const { setValue } = useFormContext();
  const { WQSScores, WQSCalculations, WQSFinalValue } = useWatch();

  const {
    finalValue,
    RSQResult,
    stdErrorResult,
    intersectionPointResult,
    slopeResult,
    lowestEstimate,
    highestEstimate,
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

    const finalValue = known_xs.length === known_ys.length ? WQSFinalValue.finalValue : 0;
    const RSQResult = known_xs.length === known_ys.length ? RSQ(known_ys, known_xs) : 0;
    const stdErrorResult = known_xs.length === known_ys.length ? STEYX(known_ys, known_xs) : 0;
    const intersectionPointResult =
      known_xs.length === known_ys.length ? INTERCEPT(known_ys, known_xs) : 0;
    const slopeResult = known_xs.length === known_ys.length ? SLOPE(known_ys, known_xs) : 0;
    const lowestEstimate = Number.isFinite(finalValue) ? finalValue - stdErrorResult : 0;
    const highestEstimate = Number.isFinite(finalValue) ? finalValue + stdErrorResult : 0;

    return {
      finalValue,
      RSQResult,
      stdErrorResult,
      intersectionPointResult,
      slopeResult,
      lowestEstimate,
      highestEstimate,
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
    ],
    ctx: {},
  });

  // useEffect(() => {
  //   const name = 'WQSFinalValue';
  //   setValue(`${name}.standardError`, stdErrorResult.toFixed(2));
  //   setValue(`${name}.coefficientOfDecision`, RSQResult.toFixed(4));
  //   setValue(`${name}.intersectionPoint`, intersectionPointResult.toFixed(2));
  //   setValue(`${name}.slope`, slopeResult.toFixed(2));
  //   setValue(`${name}.lowestEstimate`, lowestEstimate.toFixed(2));
  //   setValue(`${name}.highestEstimate`, highestEstimate.toFixed(2));
  // }, [
  //   RSQResult,
  //   highestEstitmate,
  //   intersectionPointResult,
  //   lowestEstimate,
  //   setValue,
  //   slopeResult,
  //   stdErrorResult,
  // ]);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="grid grid-cols-12">
        <div className="col-span-3">Final value</div>
        <div className={clsx('col-span-9')}>{finalValue ?? 0}</div>
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
      <div className="grid grid-cols-12">
        <div className="col-span-3">Include area</div>
        <div className="col-span-9"></div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Area</div>
        <div className="col-span-9">{property.collateralType === 'L' ? property.landArea : 0}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Appraisal Price</div>
        <div className="col-span-9">
          {property.collateralType === 'L'
            ? Number(
                (property.landArea * (WQSFinalValue.finalValue ?? 0)).toFixed(2),
              ).toLocaleString()
            : 0}
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">{'Appraisal Price (rounded)'}</div>
        <div className="col-span-9"></div>
      </div>
    </div>
  );
};
