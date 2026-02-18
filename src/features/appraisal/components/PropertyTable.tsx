import type { PropertyGroup, PropertyItem } from '../types';
import { PropertyTableRow } from './PropertyTableRow';

interface PropertyTableProps {
  group: PropertyGroup;
  onEdit: (property: PropertyItem, groupId: string) => void;
  onMoveTo: (property: PropertyItem, groupId: string) => void;
  onCopy: (property: PropertyItem) => void;
  onPaste: (groupId: string) => void;
  onDelete: (property: PropertyItem, groupId: string) => void;
  hasClipboard: boolean;
}

export const PropertyTable = ({
  group,
  onEdit,
  onMoveTo,
  onCopy,
  onPaste,
  onDelete,
  hasClipboard,
}: PropertyTableProps) => {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="w-14 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Image
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Address
          </th>
          <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Type
          </th>
          <th className="w-28 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Area
          </th>
          <th className="w-44 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Price Range
          </th>
          <th className="w-12 px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {group.items.map(property => (
          <PropertyTableRow
            key={property.id}
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
    </table>
  );
};
