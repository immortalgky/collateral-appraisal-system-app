import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { usePropertyStore } from '../../store';
import { GroupContainer } from '../GroupContainer';
import { MoveToGroupModal } from '../MoveToGroupModal';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { PropertyContextMenu } from '../PropertyContextMenu';
import type { PropertyItem } from '../../types';

// Map property type to route segment
const getRouteSegment = (type: string): string => {
  const typeMap: Record<string, string> = {
    'Building': 'building',
    'Condominium': 'condo',
    'Land and building': 'land-building',
    'Lands': 'land',
    'Lease Agreement Building': 'building',
    'Lease Agreement Land and building': 'land-building',
    'Lease Agreement Lands': 'land',
  };
  return typeMap[type] || 'land';
};

type ViewMode = 'grid' | 'list';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  property: PropertyItem | null;
  groupId: string | null;
}

interface PropertiesTabProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const PropertiesTab = ({ viewMode, onViewModeChange }: PropertiesTabProps) => {
  const navigate = useNavigate();
  const { appraisalId } = useParams<{ appraisalId: string }>();

  const {
    groups,
    clipboard,
    addGroup,
    deleteGroup,
    deleteProperty,
    movePropertyToGroup,
    reorderPropertiesInGroup,
    copyProperty,
    pasteProperty,
  } = usePropertyStore();

  const [activeProperty, setActiveProperty] = useState<PropertyItem | null>(null);

  const [moveModalState, setMoveModalState] = useState<{
    isOpen: boolean;
    property: PropertyItem | null;
    fromGroupId: string | null;
  }>({ isOpen: false, property: null, fromGroupId: null });

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    property: PropertyItem | null;
    groupId: string | null;
  }>({ isOpen: false, property: null, groupId: null });

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    property: null,
    groupId: null,
  });

  // Drag and drop sensors (for grid view)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const property = active.data.current?.property as PropertyItem;
    setActiveProperty(property);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveProperty(null);
      return;
    }

    const activeGroupId = active.data.current?.groupId as string;
    const activeId = active.id as string;
    const overData = over.data.current;
    const overId = over.id as string;

    // Check if we're dropping over another property item
    if (overData?.type === 'property') {
      const overGroupId = overData.groupId as string;

      // Reordering within the same group
      if (activeGroupId === overGroupId) {
        const group = groups.find(g => g.id === activeGroupId);
        if (group) {
          const oldIndex = group.items.findIndex(item => item.id === activeId);
          const newIndex = group.items.findIndex(item => item.id === overId);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            reorderPropertiesInGroup(activeGroupId, oldIndex, newIndex);
          }
        }
      } else {
        // Moving between groups - drop on another item
        movePropertyToGroup(activeGroupId, overGroupId, activeId);
      }
    }
    // Check if we're dropping over a group container
    else if (overData?.type === 'group' || groups.some(g => g.id === overId)) {
      // Get the target group ID (either from data or from the over ID itself)
      const toGroupId = overData?.type === 'group' ? overId : groups.find(g => g.id === overId)?.id;

      if (toGroupId && activeGroupId !== toGroupId) {
        movePropertyToGroup(activeGroupId, toGroupId, activeId);
      }
    }

    setActiveProperty(null);
  };

  // Context menu handler (for grid view)
  const handleContextMenu = (e: React.MouseEvent, property: PropertyItem, groupId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      property,
      groupId,
    });
  };

  // Action handlers (shared between grid context menu and table action menu)
  const handleEditProperty = (property: PropertyItem, groupId: string) => {
    if (appraisalId) {
      const routeSegment = getRouteSegment(property.type);
      navigate(`/appraisal/${appraisalId}/property/${routeSegment}/${property.id}?groupId=${groupId}`);
    }
  };

  const handleMoveToProperty = (property: PropertyItem, groupId: string) => {
    setMoveModalState({
      isOpen: true,
      property,
      fromGroupId: groupId,
    });
  };

  const handleCopyProperty = (property: PropertyItem) => {
    copyProperty(property);
  };

  const handleDeleteProperty = (property: PropertyItem, groupId: string) => {
    setDeleteModalState({
      isOpen: true,
      property,
      groupId,
    });
  };

  // Context menu handlers (use state from context menu)
  const handleEdit = () => {
    if (contextMenu.property && contextMenu.groupId) {
      handleEditProperty(contextMenu.property, contextMenu.groupId);
    }
  };

  const handleMoveTo = () => {
    if (contextMenu.property && contextMenu.groupId) {
      handleMoveToProperty(contextMenu.property, contextMenu.groupId);
    }
  };

  const handleMoveSubmit = (toGroupId: string) => {
    if (moveModalState.property && moveModalState.fromGroupId) {
      movePropertyToGroup(moveModalState.fromGroupId, toGroupId, moveModalState.property.id);
    }
  };

  const handleCopy = () => {
    if (contextMenu.property) {
      handleCopyProperty(contextMenu.property);
    }
  };

  const handlePaste = () => {
    if (contextMenu.groupId && clipboard) {
      pasteProperty(contextMenu.groupId);
    }
  };

  const handleDelete = () => {
    if (contextMenu.property && contextMenu.groupId) {
      handleDeleteProperty(contextMenu.property, contextMenu.groupId);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteModalState.property && deleteModalState.groupId) {
      deleteProperty(deleteModalState.groupId, deleteModalState.property.id);
    }
  };

  const contextMenuItems = [
    {
      label: 'Edit',
      icon: 'pen-to-square',
      onClick: handleEdit,
    },
    {
      label: 'Move to',
      icon: 'arrow-right-arrow-left',
      onClick: handleMoveTo,
      disabled: groups.length <= 1,
    },
    {
      label: 'Copy',
      icon: 'copy',
      onClick: handleCopy,
    },
    {
      label: 'Paste',
      icon: 'paste',
      onClick: handlePaste,
      disabled: !clipboard,
    },
    {
      label: 'Delete',
      icon: 'trash',
      onClick: handleDelete,
      danger: true,
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm font-medium ${
              viewMode === 'grid'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Icon name="grid-2" style="solid" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm font-medium ${
              viewMode === 'list'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Icon name="list" style="solid" />
            <span>List</span>
          </button>
        </div>

        {/* Add New Group Button */}
        <Button variant="primary" onClick={addGroup} className="flex items-center gap-2">
          <Icon name="plus" />
          Add New Group
        </Button>
      </div>

      {/* Groups with Drag and Drop (only active for grid view) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4 flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Icon name="layer-group" className="text-4xl mb-3" />
              <p className="text-sm font-medium text-gray-500">No property groups yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add New Group" to create your first group</p>
            </div>
          ) : (
            groups.map(group => (
              <GroupContainer
                key={group.id}
                group={group}
                viewMode={viewMode}
                onDeleteGroup={deleteGroup}
                onContextMenu={handleContextMenu}
                onEdit={handleEditProperty}
                onMoveTo={handleMoveToProperty}
                onCopy={handleCopyProperty}
                onPaste={pasteProperty}
                onDelete={handleDeleteProperty}
                hasClipboard={!!clipboard}
              />
            ))
          )}
        </div>

        {/* Drag Overlay (for grid view) */}
        <DragOverlay dropAnimation={null}>
          {activeProperty ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg cursor-grabbing flex opacity-90">
              {/* Drag Handle */}
              <div className="flex items-center justify-center w-10 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                <Icon name="grip-vertical" className="text-gray-400" />
              </div>

              {/* Property Image */}
              <div className="relative w-44 h-28 bg-gray-100 flex-shrink-0">
                {activeProperty.image ? (
                  <img
                    src={activeProperty.image}
                    alt={activeProperty.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="image" className="text-gray-400 text-2xl" />
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-white rounded-full p-1 shadow-sm">
                  <Icon name="location-dot" className="text-green-500 text-[10px]" style="solid" />
                </div>
              </div>

              {/* Property Details */}
              <div className="flex-1 p-2.5 flex flex-col justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 text-sm mb-1.5 line-clamp-1">
                    {activeProperty.address}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Icon name="ruler-combined" className="text-gray-400 text-[10px]" style="solid" />
                      <span>{activeProperty.area}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="baht-sign" className="text-gray-400 text-[10px]" style="solid" />
                      <span className="truncate">{activeProperty.priceRange}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Icon name="location-dot" className="text-[10px]" style="solid" />
                    <span className="truncate">{activeProperty.location}</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                    {activeProperty.type}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <MoveToGroupModal
        isOpen={moveModalState.isOpen}
        onClose={() =>
          setMoveModalState({
            isOpen: false,
            property: null,
            fromGroupId: null,
          })
        }
        onSubmit={handleMoveSubmit}
        groups={groups}
        currentGroupId={moveModalState.fromGroupId || ''}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, property: null, groupId: null })}
        onConfirm={handleDeleteConfirm}
      />

      {/* Context Menu (for grid view) */}
      {contextMenu.visible && (
        <PropertyContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() =>
            setContextMenu({
              visible: false,
              x: 0,
              y: 0,
              property: null,
              groupId: null,
            })
          }
        />
      )}
    </div>
  );
};

export default PropertiesTab;
