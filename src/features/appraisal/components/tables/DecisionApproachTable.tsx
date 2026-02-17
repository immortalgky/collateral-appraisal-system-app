type GroupValuation = {
  groupNumber: number;
  marketComparasionApproach?: number;
  costApproach?: number;
  incomeApproach?: number;
  residualApproach?: number;
  useApproach: string;
};

type DecisionApproachTableProps = {
  data: GroupValuation[];
};

const formatNumber = (value?: number) => {
  if (value === undefined || value === null) return '-';

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const DecisionApproachTable = ({ data }: DecisionApproachTableProps) => {
  const totalSummary = data.reduce((sum, row) => {
    const value = row.useApproach ? row[row.useApproach as keyof typeof row] : undefined;

    return sum + (typeof value === 'number' ? value : 0);
  }, 0);

  return (
    <div className="col-span-12">
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="table w-full">
          <thead>
            <tr className="bg-primary-700">
              <th className="text-white text-sm font-medium py-3 px-4 text-left rounded-tl-lg w-12">
                Group
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">
                Market Comparison Approach
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">Cost Approach</th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">
                Income Approach
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">
                Residual Approach
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-right rounded-tr-lg">
                Summary
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(row => {
              const summaryValue = row.useApproach
                ? row[row.useApproach as keyof typeof row]
                : undefined;
              return (
                <tr key={row.groupNumber} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-center">{row.groupNumber ?? '-'}</td>
                  <td
                    className={
                      row.useApproach === 'marketComparasionApproach'
                        ? 'font-bold py-3 px-4'
                        : 'py-3 px-4'
                    }
                  >
                    {formatNumber(row.marketComparasionApproach)}
                  </td>
                  <td
                    className={
                      row.useApproach === 'costApproach' ? 'font-bold py-3 px-4 ' : 'py-3 px-4'
                    }
                  >
                    {formatNumber(row.costApproach)}
                  </td>
                  <td
                    className={
                      row.useApproach === 'incomeApproach' ? 'font-bold py-3 px-4' : 'py-3 px-4'
                    }
                  >
                    {formatNumber(row.incomeApproach)}
                  </td>
                  <td
                    className={
                      row.useApproach === 'residualApproach' ? 'font-bold py-3 px-4' : 'py-3 px-4'
                    }
                  >
                    {formatNumber(row.residualApproach)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {summaryValue !== undefined ? formatNumber(summaryValue as number) : '-'}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-bold">
              <td colSpan={5} className="py-3 px-4 text-left">
                Total
              </td>
              <td className="py-3 px-4 text-right">{formatNumber(totalSummary)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DecisionApproachTable;
