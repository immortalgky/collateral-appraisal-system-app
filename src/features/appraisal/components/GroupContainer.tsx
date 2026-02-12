import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { PropertyGroup, PropertyItem } from '../types';
import { PropertyCard } from './PropertyCard';
import { PropertyTable } from './PropertyTable';
import { PropertyTypeDropdown } from './PropertyTypeDropdown';
import Icon from '@shared/components/Icon';

type ViewMode = 'grid' | 'list';

interface GroupContainerProps {
  group: PropertyGroup;
  viewMode: ViewMode;
  onDeleteGroup: (groupId: string) => void;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
  onEdit: (property: PropertyItem, groupId: string) => void;
  onMoveTo: (property: PropertyItem, groupId: string) => void;
  onCopy: (property: PropertyItem) => void;
  onPaste: (groupId: string) => void;
  onDelete: (property: PropertyItem, groupId: string) => void;
  hasClipboard: boolean;
  isDeletingGroup?: boolean;
}

export const GroupContainer = ({
  group,
  viewMode,
  onDeleteGroup,
  onContextMenu,
  onEdit,
  onMoveTo,
  onCopy,
  onPaste,
  onDelete,
  hasClipboard,
  isDeletingGroup = false,
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">{group.name}</h2>
          <span className="text-xs text-gray-500">
            ({group.items.length} item{group.items.length !== 1 ? 's' : ''})
          </span>
          <button
            onClick={() => onDeleteGroup(group.id)}
            disabled={isDeletingGroup}
            className="ml-1 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete group"
          >
            {isDeletingGroup ? (
              <Icon name="spinner" className="text-xs animate-spin" />
            ) : (
              <Icon name="trash" className="text-xs" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">
            AP
          </span>
        </div>
      </div>

      {/* Property Items */}
      {viewMode === 'grid' ? (
        // Grid view with drag & drop
        <div
          ref={setNodeRef}
          className={`min-h-[100px] rounded-lg border-2 border-dashed p-2 transition-colors ${
            isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50/50'
          }`}
        >
          <SortableContext
            items={group.items.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {group.items.map(property => (
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
            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
              <Icon name="folder-open" className="text-2xl mb-2" />
              <p className="text-xs">No properties in this group</p>
            </div>
          )}
        </div>
      ) : // List view - simple table without wrapper
      group.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <Icon name="folder-open" className="text-2xl mb-2" />
          <p className="text-xs">No properties in this group</p>
        </div>
      ) : (
        <PropertyTable
          group={group}
          onEdit={onEdit}
          onMoveTo={onMoveTo}
          onCopy={onCopy}
          onPaste={onPaste}
          onDelete={onDelete}
          hasClipboard={hasClipboard}
        />
      )}

      {/* Add Property Button */}
      <div className="mt-2 flex justify-center">
        <PropertyTypeDropdown groupId={group.id} />
      </div>
    </div>
  );
};
