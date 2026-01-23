import { useFormContext, useWatch } from 'react-hook-form';
import { INTERCEPT, RSQ, SLOPE, STEYX } from './components/excelUtils/regression';
import clsx from 'clsx';

export const AdjustFinalValueSection = ({ property }) => {
  const { WQSScores, WQSCalculations, WQSFinalValue } = useWatch();
  const known_ys = (WQSScores ?? [])
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
    }, []); // wqs calculaitno
  const known_xs = (WQSCalculations ?? []).filter(c => c.marketId).map(c => c.adjustedValue ?? 0); // wqs scores

  // if (known_ys.length > 2 && known_xs.length > 2) console.log(RSQ(known_ys, known_xs));

  if (known_xs.length < 2 || known_ys.length < 2 || known_xs.length !== known_ys.length) {
    return <div>0</div>;
  }

  console.log(property);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="grid grid-cols-12">
        <div className="col-span-3">Coefficient of decision</div>
        <div className={(clsx('col-span-9'), RSQ(known_ys, known_xs) < 0.85 ? 'text-danger' : '')}>
          {RSQ(known_ys, known_xs).toFixed(5) ?? 0}
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Standard error</div>
        <div className={clsx('col-span-9')}>{STEYX(known_ys, known_xs) ?? 0}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Intersection point</div>
        <div className={clsx('col-span-9')}>{INTERCEPT(known_ys, known_xs) ?? 0}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Slope</div>
        <div className={clsx('col-span-9')}>{SLOPE(known_ys, known_xs) ?? 0}</div>
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
      <div className="grid grid-cols-12">
        <div className="col-span-3">{'Include building cost'}</div>
        <div className="col-span-9"></div>
      </div>
    </div>
  );
};
