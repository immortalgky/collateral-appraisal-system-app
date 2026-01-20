import { calculationRows, columnGroups, columns, DEFAULT_WQSSCORE_ROW, FACTORS } from './data/data';
import { RHFArrayTable } from './components/RHFArrayTable';

export const CalculationSection = () => {
  return (
    <div className="border border-neutral-300 rounded-lg overflow-clip">
      <RHFArrayTable
        name="WQSScores"
        columns={columns}
        groups={columnGroups}
        defaultRow={DEFAULT_WQSSCORE_ROW}
        ctx={FACTORS}
      />
      <div className="border-y border-neutral-300 flex justify-center h-14 text-sm items-center">
        {`Scoring Criteria : 1-2 Very low, 3-4 Fair, 5-6 Average, 7-8 Good, 9-10 Very Good`}
      </div>
      <RHFArrayTable
        name="WQSCalculations"
        dataAlignment="vertical"
        rows={calculationRows}
        hasHeader={false}
        hasAddButton={false}
        canEdit={true}
        watch={{ WQSScores: 'WQSScores' }}
      />
    </div>
  );
};
