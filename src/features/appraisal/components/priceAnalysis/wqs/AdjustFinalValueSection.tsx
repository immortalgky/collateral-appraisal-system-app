import { useFormContext, useWatch } from 'react-hook-form';
import { RSQ } from './components/excelUtils/regression';

export const AdjustFinalValueSection = () => {
  const { WQSScores, WQSCalculations } = useWatch();
  const known_ys = WQSScores.map(f => f.surveys?.map(survey => survey.value ?? 0) ?? []).reduce(
    (acc, curr) => {
      curr.forEach((value, i) => {
        acc[i] = (acc[i] ?? 0) + value;
      });
      return acc;
    },
    [],
  ); // wqs calculaitno
  const known_xs = WQSCalculations.filter(c => c.marketId).map(c => c.adjustedValue ?? 0); // wqs scores
  console.log(known_ys, known_xs);

  // if (known_ys.length > 2 && known_xs.length > 2) console.log(RSQ(known_ys, known_xs));

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="grid grid-cols-12">
        <div className="col-span-3">Coefficient of decision</div>
        <div className="col-span-9"></div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Include area</div>
        <div className="col-span-9"></div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Area</div>
        <div className="col-span-9"></div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Appraisal Price</div>
        <div className="col-span-9"></div>
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
