import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { PropertyGroup, PropertyItem } from '../types';
import { PropertyCard } from './PropertyCard';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';

interface GroupContainerProps {
  group: PropertyGroup;
  onAddProperty: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
}

export const GroupContainer = ({
  group,
  onAddProperty,
  onDeleteGroup,
  onContextMenu,
}: GroupContainerProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: group.id,
    data: {
      type: 'group',
      group,
    },
  });

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      {/* Group Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {group.name}:
          </h2>
          <span className="text-sm text-gray-500">
            {group.items.length} item(s)
          </span>
          <button
            onClick={() => onDeleteGroup(group.id)}
            className="ml-2 text-red-500 hover:text-red-700"
            title="Delete group"
          >
            <Icon name="trash" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
            AP
          </span>
        </div>
      </div>

      {/* Property Items List */}
      <div
        ref={setNodeRef}
        className={`min-h-[150px] rounded-lg border-2 border-dashed p-3 transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <SortableContext
          items={group.items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {group.items.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                groupId={group.id}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        </SortableContext>

        {/* Empty State */}
        {group.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Icon name="folder-open" className="text-3xl mb-2" />
            <p className="text-xs">No properties in this group</p>
          </div>
        )}
      </div>

      {/* Add Property Button */}
      <div className="mt-3 flex justify-center">
        <button
          onClick={() => onAddProperty(group.id)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Icon name="plus" className="text-gray-500" />
          <span>Add property to group</span>
        </button>
      </div>
    </div>
  );
};
