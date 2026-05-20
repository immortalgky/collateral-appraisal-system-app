import { SupportingDataTableRow } from './SupportingDataTableRow';

export function SupportingDataTable({
  supportingDetails,
  onSelectSupportingData,
  onDeleteSupportingData,
}: {
  data: any;
  onSelectSupportingData: () => void;
  onDeleteSupportingData: () => void;
}) {
  <table className="w-full text-sm">
    <thead className="sticky top-0 z-10">
      <tr className="bg-gray-50 border-b border-gray-200 shadow-sm">
        <th className="w-14 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
      {supportingDetails.map(data => (
        <SupportingDataTableRow
          key={data.id}
          property={property}
          groupId={group.id}
          onEdit={onEdit}
          onMoveTo={onMoveTo}
          onCopy={onCopy}
          onPaste={onPaste}
          onDelete={onDelete}
          hasClipboard={hasClipboard}
        />
      ))}
    </tbody>
  </table>;
}
