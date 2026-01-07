import { Icon } from '@/shared/components';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useDeleteMarketSurvey } from '../../api';

interface MarketSurveyItem {
  id: string | number;
  surveyNumber: string;
  surveyName: string;
  templateDesc: string;
  collateralCode: string;
  collateralDesc: string;
  marketSurveyData: MarketSurveyData[];
}

interface MarketSurveyData {
  factorCode: string;
  value: string;
  measurementUnit: string;
  otherRemark: string;
  factorDesc: string;
  fieldName: string;
  dataType: string;
  fieldLength?: number;
  fieldDecimal?: number;
  parameterGroup?: string;
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

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  const deleteMarket = useDeleteMarketSurvey();

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, id: id });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.id) {
      deleteMarket.mutate(deleteConfirm.id, {
        onSuccess: () => {
          toast.success('Market survey deleted successfully');
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || 'Failed to delete market. Please try again.');
        },
      });
    }
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
                <td colSpan={headers.length + 1} className="text-center py-6"></td>
              </tr>
            ) : (
              data.map(item => (
                <tr
                  key={item.id}
                  onDoubleClick={() => onSelect(item)}
                  className=" hover:bg-gray-50"
                >
                  <td className="px-4 py-3">{item.surveyNumber}</td>
                  <td className="px-4 py-3">{item.surveyName}</td>
                  <td className="px-4 py-3">{item.templateDesc}</td>
                  <td className="px-4 py-3">{item.collateralDesc}</td>
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
        onConfirm={handleConfirmDelete}
        title="Delete Market Survey"
        message="Are you sure you want to delete this market survey? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default MarketSurveyTable;
