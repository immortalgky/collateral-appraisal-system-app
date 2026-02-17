type LandTitle = {
  titleDeedNumber: string;
  areaRai?: number;
  areaNgan?: number;
  areaSquareWa: number;
  isMissingFromSurvey?: boolean;
  governmentPricePerSqWa?: number;
  governmentPrice?: number;
};

type DecisionApproachTableProps = {
  data: LandTitle[];
  displayItems?: number;
};

const formatNumber = (value?: number) => {
  if (value === undefined || value === null) return '-';

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const convertToSquareWa = (rai: number = 0, ngan: number = 0, wa: number = 0) => {
  return rai * 400 + ngan * 100 + wa;
};

const LandGovernmentPriceTable = ({ data, displayItems }: DecisionApproachTableProps) => {
  const validRows = data.filter(item => item.isMissingFromSurvey === false);

  const displayedItems = displayItems == null ? data : data.slice(0, displayItems);

  const totalAreaNotMissOut = validRows.reduce((sum, row) => {
    return sum + convertToSquareWa(row.areaRai, row.areaNgan, row.areaSquareWa);
  }, 0);

  const totalArea = data.reduce((sum, row) => {
    return sum + convertToSquareWa(row.areaRai, row.areaNgan, row.areaSquareWa);
  }, 0);
  const totalGovernmentPrice = data.reduce((sum, row) => {
    return sum + (row.governmentPrice ?? 0);
  }, 0);
  const averagePrice = validRows.reduce(() => {
    return totalArea > 0 ? totalGovernmentPrice / totalAreaNotMissOut : 0;
  }, 0);

  return (
    <div className="col-span-12">
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="table w-full">
          <thead>
            <tr className="bg-primary-700">
              <th className="text-white text-sm font-medium py-3 px-4 text-left">Title Deed No.</th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">Sq.Wa</th>
              <th className="text-white text-sm font-medium py-3 px-4 text-center">
                Miss out on the Survey
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">
                Price per Sq.wa ( Baht )
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-right rounded-tr-lg">
                Price ( Bath )
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedItems.map(row => {
              return (
                <tr key={row.titleDeedNumber} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">{row.titleDeedNumber ?? ''}</td>
                  <td className="py-3 px-4">
                    {formatNumber(convertToSquareWa(row.areaRai, row.areaNgan, row.areaSquareWa))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.isMissingFromSurvey ? 'Yes' : 'No'}
                  </td>
                  <td className="py-3 px-4">{formatNumber(row.governmentPricePerSqWa)}</td>
                  <td className="py-3 px-4 text-right">{formatNumber(row.governmentPrice)}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-100">
              <td className="py-3 px-4 text-left">Average Price per Sq.Wa</td>
              <td colSpan={2} className="py-3 px-4 text-left">
                {formatNumber(totalAreaNotMissOut)}
              </td>
              <td className="py-3 px-4 text-left">{formatNumber(averagePrice)}</td>
              <td className="py-3 px-4 text-right">{formatNumber(totalGovernmentPrice)}</td>
            </tr>
            <tr className="bg-primary-700">
              <td className="py-3 px-4 text-left text-white">Total Area</td>
              <td colSpan={4} className="py-3 px-4 text-left text-white">
                {formatNumber(totalArea)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LandGovernmentPriceTable;
