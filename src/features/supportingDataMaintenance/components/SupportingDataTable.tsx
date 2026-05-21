import Pagination from '@/shared/components/Pagination';
import { SupportingDataTableRow } from './SupportingDataTableRow';
import { useState } from 'react';

interface SupportingDataTableProps {
  supportingDetails: any[];
  isReadOnly: boolean;
  onSelectSupportingData: (index: number) => void;
  onDeleteSupportingData: (index: number) => void;
}

export function SupportingDataTable({
  supportingDetails,
  isReadOnly,
  onSelectSupportingData,
  onDeleteSupportingData,
}: SupportingDataTableProps) {
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const totalCount = supportingDetails?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  // const listSupportingData =

  if (!supportingDetails || supportingDetails.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        No supporting data added yet. Click &quot;Add Item&quot; to create one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-50 border-b border-gray-200 shadow-sm">
            <th className="w-22 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              No.
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Property Name
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="w-1/3 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Address
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Coordinates
            </th>
            <th className="w-12 px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {supportingDetails.map((data, index) => (
            <SupportingDataTableRow
              key={data.id ?? index}
              index={index}
              data={data}
              isReadOnly={isReadOnly}
              onEdit={onSelectSupportingData}
              onDelete={onDeleteSupportingData}
            />
          ))}
        </tbody>
      </table>
      <Pagination
        currentPage={pageNumber}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPageNumber}
        onPageSizeChange={size => {
          setPageSize(size);
          setPageNumber(0);
        }}
      />
    </div>
  );
}
