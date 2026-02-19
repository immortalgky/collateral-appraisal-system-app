import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { PropertyGroup, PropertyItem } from '../types';
import { PropertyCard } from './PropertyCard';
import { PropertyTable } from './PropertyTable';
import Icon from '@shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import PropertyTypeDropdown from '@features/appraisal/components/PropertyTypeDropdown.tsx';

type ViewMode = 'grid' | 'list';

interface GroupContainerProps {
  group: PropertyGroup;
  viewMode: ViewMode;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
  onEdit: (property: PropertyItem, groupId: string) => void;
  onMoveTo: (property: PropertyItem, groupId: string) => void;
  onCopy: (property: PropertyItem) => void;
  onPaste: (groupId: string) => void;
  onDelete: (property: PropertyItem, groupId: string) => void;
  onGoToPriceAnalysis: (groupId: string) => void;
  hasClipboard: boolean;
  isDeletingGroup?: boolean;
}

export const GroupContainer = React.memo(
  ({
    group,
    viewMode,
    onDeleteGroup,
    onRenameGroup,
    onContextMenu,
    onEdit,
    onMoveTo,
    onCopy,
    onPaste,
    onDelete,
    hasClipboard,
    isDeletingGroup = false,
  }: GroupContainerProps) => {
    const droppableData = useMemo(() => ({ type: 'group' as const, group }), [group]);
    const { setNodeRef, isOver } = useDroppable({
      id: group.id,
      data: droppableData,
    });

    const navigate = useNavigate();

    // Memoize item IDs so SortableContext doesn't get a new array reference every render
    // (especially important for empty groups where [] !== [])
    const sortableItemIds = useMemo(() => group.items.map(item => item.id), [group.items]);

    // Inline rename state
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(group.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [isEditing]);

    // Sync editValue when group.name changes from API
    useEffect(() => {
      if (!isEditing) {
        setEditValue(group.name);
      }
    }, [group.name, isEditing]);

    const commitRename = useCallback(() => {
      const trimmed = editValue.trim();
      setIsEditing(false);
      if (trimmed && trimmed !== group.name) {
        onRenameGroup(group.id, trimmed);
      } else {
        setEditValue(group.name);
      }
    }, [editValue, group.id, group.name, onRenameGroup]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitRename();
        } else if (e.key === 'Escape') {
          setEditValue(group.name);
          setIsEditing(false);
        }
      },
      [commitRename, group.name],
    );

    return (
      <div className="border border-gray-200 rounded-lg bg-white p-4">
        {/* Group Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                className="text-sm font-semibold text-gray-900 bg-white border border-primary rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary min-w-0 w-48"
              />
            ) : (
              <h2
                className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-primary transition-colors"
                onClick={() => setIsEditing(true)}
                title="Click to rename"
              >
                {group.name}
              </h2>
            )}
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
            <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
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
  },
);
