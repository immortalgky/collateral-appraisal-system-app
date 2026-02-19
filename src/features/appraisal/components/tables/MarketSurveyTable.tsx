interface MarketSurveyItem {
  id?: string;
  comparableNumber?: string;
  propertyType?: string;
  dataSource?: string;
  status?: string;
  [key: string]: unknown;
}

interface MarketSurveyTableProps {
  headers: MarketSurveyTableHeader[];
  data: MarketSurveyItem[];
  parameters?: [];
  onSelect: (item: any) => void;
}

type MarketSurveyTableHeader = MarketSurveyTableRegularHeader;

interface MarketSurveyTableRegularHeader {
  name: string;
  label: string;
}

const MarketSurveyTable = ({ headers, data, onSelect }: MarketSurveyTableProps) => {
  const isEmpty = !data || data.length === 0;

  return (
    <div className="w-full overflow-x-auto">
      <table className="table min-w-max">
        <thead>
          <tr className="border-b-1 border-misc-1">
            {headers.map((header, index) => (
              <th key={index} className="text-neutral-7 px-4 py-3 text-left">
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length + 1} className="text-center py-6"></td>
            </tr>
          ) : (
            data.map(item => (
              <tr
                key={item.id}
                onDoubleClick={() => onSelect(item)}
                className="border-b-1 border-misc-1 hover:bg-gray-50"
              >
                {headers.map((header, index) => (
                  <td key={index} className="px-4 py-4">
                    {String(item[header.name] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MarketSurveyTable;
