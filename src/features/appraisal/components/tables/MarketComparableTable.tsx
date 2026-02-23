import { Icon } from '@/shared/components';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useState } from 'react';

interface MarketComparableItem {
  id: string;
  comparableNumber: string;
  surveyName: string;
  propertyType: string;
  infoDateTime: string;
  sourceInfo: string;
  notes: string;
  createdOn: string;
}

interface MarketComparableTableProps {
  headers: MarketComparableTableHeader[];
  data: MarketComparableItem[];
  parameters?: [];
  onSelect: (item: any) => void;
}

type MarketComparableTableHeader = MarketComparableTableRegularHeader;

interface MarketComparableTableRegularHeader {
  name: string;
  label: string;
}

const MarketComparableTable = ({ headers, data, onSelect }: MarketComparableTableProps) => {
  const isEmpty = !data || data.length === 0;

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, id: id });
  };

  return (
    <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      <div className="w-full overflow-x-auto">
        <table className="table min-w-max">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              {headers.map((header, index) => (
                <th key={index} className="text-gray-600 font-medium px-4 py-3 text-left">
                  {header.label}
                </th>
              ))}
              <th className="text-gray-600 font-medium px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={headers.length + 1} className="text-center py-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Icon style="regular" name="inbox" className="size-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No market comparables yet</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map(item => (
                <tr
                  key={item.id}
                  onDoubleClick={() => onSelect(item)}
                  className=" hover:bg-gray-50"
                >
                  <td className="px-4 py-3">{item.comparableNumber}</td>
                  <td className="px-4 py-3">{item.surveyName}</td>
                  <td className="px-4 py-3">{item.propertyType}</td>
                  <td className="px-4 py-3"> {new Date(item.createdOn).toLocaleString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Icon style="regular" name="pen-to-square" className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Icon style="regular" name="trash-can" className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={() => {}}
        title="Delete Market Comparable"
        message="Are you sure you want to delete this market comparable? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default MarketComparableTable;
