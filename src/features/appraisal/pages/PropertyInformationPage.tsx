import { useState } from 'react';
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
import { usePropertyStore } from '../store';
import { GroupContainer } from '../components/GroupContainer';
import { AddPropertyModal } from '../components/AddPropertyModal';
import { EditPropertyModal } from '../components/EditPropertyModal';
import { MoveToGroupModal } from '../components/MoveToGroupModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { PropertyContextMenu } from '../components/PropertyContextMenu';
import type { PropertyItem } from '../types';

type ViewMode = 'grid' | 'list';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  property: PropertyItem | null;
  groupId: string | null;
}

export default function PropertyInformationPage() {
  const {
    groups,
    clipboard,
    addGroup,
    deleteGroup,
    addPropertyToGroup,
    updateProperty,
    deleteProperty,
    movePropertyToGroup,
    reorderPropertiesInGroup,
    copyProperty,
    pasteProperty,
  } = usePropertyStore();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeProperty, setActiveProperty] = useState<PropertyItem | null>(null);

  // Modal states
  const [addModalState, setAddModalState] = useState<{
    isOpen: boolean;
    groupId: string | null;
  }>({ isOpen: false, groupId: null });

  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    property: PropertyItem | null;
    groupId: string | null;
  }>({ isOpen: false, property: null, groupId: null });

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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
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

  // Handlers
  const handleAddProperty = (groupId: string) => {
    setAddModalState({ isOpen: true, groupId });
  };

  const handleAddPropertySubmit = (data: any) => {
    if (addModalState.groupId) {
      addPropertyToGroup(addModalState.groupId, data);
    }
  };

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

  const handleEdit = () => {
    if (contextMenu.property && contextMenu.groupId) {
      setEditModalState({
        isOpen: true,
        property: contextMenu.property,
        groupId: contextMenu.groupId,
      });
    }
  };

  const handleEditSubmit = (data: any) => {
    if (editModalState.property && editModalState.groupId) {
      updateProperty(editModalState.groupId, editModalState.property.id, data);
    }
  };

  const handleMoveTo = () => {
    if (contextMenu.property && contextMenu.groupId) {
      setMoveModalState({
        isOpen: true,
        property: contextMenu.property,
        fromGroupId: contextMenu.groupId,
      });
    }
  };

  const handleMoveSubmit = (toGroupId: string) => {
    if (moveModalState.property && moveModalState.fromGroupId) {
      movePropertyToGroup(moveModalState.fromGroupId, toGroupId, moveModalState.property.id);
    }
  };

  const handleCopy = () => {
    if (contextMenu.property) {
      copyProperty(contextMenu.property);
    }
  };

  const handlePaste = () => {
    if (contextMenu.groupId && clipboard) {
      pasteProperty(contextMenu.groupId);
    }
  };

  const handleDelete = () => {
    if (contextMenu.property && contextMenu.groupId) {
      setDeleteModalState({
        isOpen: true,
        property: contextMenu.property,
        groupId: contextMenu.groupId,
      });
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
      <div className="flex items-center justify-between mb-6 mt-4">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded flex items-center gap-2 transition-colors ${
              viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon name="grid-2" />
            <span className="text-sm">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded flex items-center gap-2 transition-colors ${
              viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon name="list" />
            <span className="text-sm">List</span>
          </button>
        </div>

        {/* Add New Group Button */}
        <Button variant="primary" onClick={addGroup} className="flex items-center gap-2">
          <Icon name="plus" />
          Add New Group
        </Button>
      </div>

      {/* Groups with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {groups.map(group => (
            <GroupContainer
              key={group.id}
              group={group}
              onAddProperty={handleAddProperty}
              onDeleteGroup={deleteGroup}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeProperty ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg cursor-grabbing flex opacity-90">
              {/* Drag Handle */}
              <div className="flex items-center justify-center w-12 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                <Icon name="grip-vertical" className="text-gray-500" />
              </div>

              {/* Property Image */}
              <div className="relative w-48 h-32 bg-gray-100 flex-shrink-0">
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
                <div className="absolute top-2 left-2 bg-white rounded-full p-1.5 shadow-md">
                  <Icon name="location-dot" className="text-green-500 text-xs" />
                </div>
              </div>

              {/* Property Details */}
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1">
                    {activeProperty.address}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Icon name="ruler-combined" className="text-gray-400" style="light" />
                      <span>{activeProperty.area}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="dollar-sign" className="text-gray-400" style="light" />
                      <span>{activeProperty.priceRange}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <Icon
                        name="location-dot"
                        className="text-gray-400 flex-shrink-0"
                        style="light"
                      />
                      <span className="truncate">{activeProperty.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                    {activeProperty.type}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <AddPropertyModal
        isOpen={addModalState.isOpen}
        onClose={() => setAddModalState({ isOpen: false, groupId: null })}
        onSubmit={handleAddPropertySubmit}
      />

      <EditPropertyModal
        isOpen={editModalState.isOpen}
        onClose={() => setEditModalState({ isOpen: false, property: null, groupId: null })}
        onSubmit={handleEditSubmit}
        property={editModalState.property}
      />

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

      {/* Context Menu */}
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
}
