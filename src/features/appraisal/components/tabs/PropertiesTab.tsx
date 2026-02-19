import { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { usePropertyClipboardStore } from '../../store';
import { useEnrichedPropertyGroups } from '../../hooks/useEnrichedPropertyGroups';
import {
  useAddPropertyToGroup,
  useCreatePropertyGroup,
  useDeletePropertyGroup,
  useMovePropertyToGroup,
  useRemovePropertyFromGroup,
  useReorderPropertiesInGroup,
  useUpdatePropertyGroup,
} from '../../api/propertyGroup';
import { GroupContainer } from '../GroupContainer';
import { MoveToGroupModal } from '../MoveToGroupModal';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { PropertyContextMenu } from '../PropertyContextMenu';
import type { PropertyItem } from '../../types';

// Map property type to route segment
const getRouteSegment = (type: string): string => {
  const typeMap: Record<string, string> = {
    Building: 'building',
    Condo: 'condo',
    'Land and building': 'land-building',
    Lands: 'land',
    'Lease Agreement Building': 'building',
    'Lease Agreement Land and building': 'land-building',
    'Lease Agreement Lands': 'land',
    L: 'land',
    B: 'building',
    LB: 'land-building',
    U: 'condo',
  };
  return typeMap[type] || 'land';
};

// Map property type to description
const getPropertyDescription = (type: string) => {
  const typeMap: Record<string, string> = {
    L: 'Land',
    B: 'Building',
    LB: 'Land & Building',
    U: 'Condo',
  };
  return typeMap[type] || 'Unknown type';
};

// Only measure droppables before a drag starts — prevents ResizeObserver
// from firing on trivial CSS changes (hover states) and causing re-render loops.
const MEASURING_CONFIG = {
  droppable: { strategy: MeasuringStrategy.BeforeDragging },
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

  // API data
  const { groups, isLoading, error } = useEnrichedPropertyGroups(appraisalId);

  // Keep a stable ref to groups so DndContext callbacks don't change when groups change.
  // Changing onDragEnd/onDragStart triggers DndContext context updates which re-render
  // all useDroppable/useSortable consumers — bypassing React.memo and causing infinite loops.
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  // Clipboard (UI-only state)
  const { clipboard, copyProperty, clearClipboard } = usePropertyClipboardStore();

  // Mutations
  const createGroupMutation = useCreatePropertyGroup();
  const updateGroupMutation = useUpdatePropertyGroup();
  const deleteGroupMutation = useDeletePropertyGroup();
  const removePropertyMutation = useRemovePropertyFromGroup();
  const addPropertyToGroupMutation = useAddPropertyToGroup();
  const moveMutation = useMovePropertyToGroup();
  const reorderMutation = useReorderPropertiesInGroup();

  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

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
    }),
  );

  // ==================== Mutation Handlers ====================

  const handleAddGroup = useCallback(() => {
    if (!appraisalId) return;
    const groupNumber = groupsRef.current.length + 1;
    createGroupMutation.mutate(
      { appraisalId, groupName: `Group ${groupNumber}` },
      {
        onError: () => {
          toast.error('Failed to create group');
        },
      },
    );
  }, [appraisalId, createGroupMutation]);

  const handleRenameGroup = useCallback(
    (groupId: string, newName: string) => {
      if (!appraisalId) return;
      const group = groupsRef.current.find(g => g.id === groupId);
      if (!group) return;
      updateGroupMutation.mutate(
        {
          appraisalId,
          groupId,
          groupName: newName,
          useSystemCalc: group.useSystemCalc ?? false,
          description: group.description ?? null,
        },
        {
          onError: () => {
            toast.error('Failed to rename group');
          },
        },
      );
    },
    [appraisalId, updateGroupMutation],
  );

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      if (!appraisalId) return;
      setDeletingGroupId(groupId);
      deleteGroupMutation.mutate(
        { appraisalId, groupId },
        {
          onSuccess: () => {
            setDeletingGroupId(null);
          },
          onError: () => {
            setDeletingGroupId(null);
            toast.error('Failed to delete group');
          },
        },
      );
    },
    [appraisalId, deleteGroupMutation],
  );

  const handleRemoveProperty = useCallback(
    (groupId: string, propertyId: string) => {
      if (!appraisalId) return;
      removePropertyMutation.mutate(
        { appraisalId, groupId, propertyId },
        {
          onError: () => {
            toast.error('Failed to remove property from group');
          },
        },
      );
    },
    [appraisalId, removePropertyMutation],
  );

  const handleMoveProperty = useCallback(
    (
      fromGroupId: string,
      toGroupId: string,
      propertyId: string,
      targetPosition?: number,
    ) => {
      if (!appraisalId) return;
      moveMutation.mutate(
        {
          appraisalId,
          sourceGroupId: fromGroupId,
          propertyId,
          targetGroupId: toGroupId,
          targetPosition: targetPosition ?? null,
        },
        {
          onError: () => {
            toast.error('Failed to move property');
          },
        },
      );
    },
    [appraisalId, moveMutation],
  );

  const handlePasteProperty = useCallback(
    (groupId: string) => {
      if (!appraisalId || !clipboard) return;
      // Add the copied property to the target group
      addPropertyToGroupMutation.mutate(
        { appraisalId, groupId, propertyId: clipboard.id },
        {
          onSuccess: () => {
            clearClipboard();
          },
          onError: () => {
            toast.error('Failed to paste property');
          },
        },
      );
    },
    [appraisalId, clipboard, addPropertyToGroupMutation, clearClipboard],
  );

  // ==================== Drag & Drop ====================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const property = active.data.current?.property as PropertyItem;
    setActiveProperty(property);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) {
        setActiveProperty(null);
        return;
      }

      const currentGroups = groupsRef.current;
      const activeGroupId = active.data.current?.groupId as string;
      const activeId = active.id as string;
      const overData = over.data.current;
      const overId = over.id as string;

      // Check if we're dropping over another property item
      if (overData?.type === 'property') {
        const overGroupId = overData.groupId as string;

        if (activeGroupId === overGroupId) {
          // Reordering within the same group
          const group = currentGroups.find(g => g.id === activeGroupId);
          if (group && appraisalId) {
            const ids = group.items.map(i => i.id);
            const fromIndex = ids.indexOf(activeId);
            const toIndex = ids.indexOf(overId);
            if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
              const reordered = [...ids];
              reordered.splice(fromIndex, 1);
              reordered.splice(toIndex, 0, activeId);
              reorderMutation.mutate(
                { appraisalId, groupId: activeGroupId, orderedPropertyIds: reordered },
                { onError: () => toast.error('Failed to reorder properties') },
              );
            }
          }
        } else {
          // Cross-group drop on a property — compute target position
          const targetGroup = currentGroups.find(g => g.id === overGroupId);
          const targetIndex = targetGroup?.items.findIndex(i => i.id === overId) ?? -1;
          handleMoveProperty(
            activeGroupId,
            overGroupId,
            activeId,
            targetIndex >= 0 ? targetIndex : undefined,
          );
        }
      }
      // Check if we're dropping over a group container
      else if (overData?.type === 'group' || currentGroups.some(g => g.id === overId)) {
        const toGroupId =
          overData?.type === 'group' ? overId : currentGroups.find(g => g.id === overId)?.id;

        if (toGroupId && activeGroupId !== toGroupId) {
          handleMoveProperty(activeGroupId, toGroupId, activeId);
        }
      }

      setActiveProperty(null);
    },
    [appraisalId, reorderMutation, handleMoveProperty],
  );

  // ==================== Context Menu & Actions ====================

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, property: PropertyItem, groupId: string) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        property,
        groupId,
      });
    },
    [],
  );

  const handleEditProperty = useCallback(
    (property: PropertyItem, groupId: string) => {
      if (appraisalId) {
        const routeSegment = getRouteSegment(property.type);
        navigate(
          `/appraisal/${appraisalId}/property/${routeSegment}/${property.id}?groupId=${groupId}`,
        );
      }
    },
    [appraisalId, navigate],
  );

  const handleMoveToProperty = useCallback(
    (property: PropertyItem, groupId: string) => {
      setMoveModalState({
        isOpen: true,
        property,
        fromGroupId: groupId,
      });
    },
    [],
  );

  const handleCopyProperty = useCallback(
    (property: PropertyItem) => {
      copyProperty(property);
    },
    [copyProperty],
  );

  const handleDeleteProperty = useCallback(
    (property: PropertyItem, groupId: string) => {
      setDeleteModalState({
        isOpen: true,
        property,
        groupId,
      });
    },
    [],
  );

  // Context menu handlers
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
      handleMoveProperty(moveModalState.fromGroupId, toGroupId, moveModalState.property.id);
    }
  };

  const handleCopy = () => {
    if (contextMenu.property) {
      handleCopyProperty(contextMenu.property);
    }
  };

  const handlePaste = () => {
    if (contextMenu.groupId && clipboard) {
      handlePasteProperty(contextMenu.groupId);
    }
  };

  const handleDelete = () => {
    if (contextMenu.property && contextMenu.groupId) {
      handleDeleteProperty(contextMenu.property, contextMenu.groupId);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteModalState.property && deleteModalState.groupId) {
      handleRemoveProperty(deleteModalState.groupId, deleteModalState.property.id);
    }
  };

  const handleGoToPriceAnalysis = (groupId: string) => {
    // check condition before navigate

    navigate('/dev/price-analysis', { state: { groupId } });
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

  // ==================== Loading & Error States ====================

  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between mb-4">
          <div className="h-9 w-40 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-4 flex-1">
          {[1, 2].map(i => (
            <div key={i} className="border border-gray-200 rounded-lg bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                {[1, 2].map(j => (
                  <div key={j} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-red-50 rounded-xl border-2 border-dashed border-red-200">
        <Icon name="exclamation-triangle" className="text-4xl mb-3 text-red-400" />
        <p className="text-sm font-medium text-red-500">Failed to load property groups</p>
        <p className="text-xs text-red-400 mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  // ==================== Render ====================

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
        <Button
          variant="primary"
          onClick={handleAddGroup}
          className="flex items-center gap-2"
          disabled={createGroupMutation.isPending}
        >
          {createGroupMutation.isPending ? (
            <Icon name="spinner" className="animate-spin" />
          ) : (
            <Icon name="plus" />
          )}
          Add New Group
        </Button>
      </div>

      {/* Groups with Drag and Drop (only active for grid view) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        measuring={MEASURING_CONFIG}
      >
        <div className="space-y-4 flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Icon name="layer-group" className="text-4xl mb-3" />
              <p className="text-sm font-medium text-gray-500">No property groups yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Click "Add New Group" to create your first group
              </p>
            </div>
          ) : (
            groups.map(group => (
              <GroupContainer
                key={group.id}
                group={group}
                viewMode={viewMode}
                onDeleteGroup={handleDeleteGroup}
                onRenameGroup={handleRenameGroup}
                onContextMenu={handleContextMenu}
                onEdit={handleEditProperty}
                onMoveTo={handleMoveToProperty}
                onCopy={handleCopyProperty}
                onPaste={handlePasteProperty}
                onDelete={handleDeleteProperty}
                onGoToPriceAnalysis={handleGoToPriceAnalysis}
                hasClipboard={!!clipboard}
                isDeletingGroup={deletingGroupId === group.id}
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
                      <Icon
                        name="ruler-combined"
                        className="text-gray-400 text-[10px]"
                        style="solid"
                      />
                      <span>{activeProperty.area}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Icon name="location-dot" className="text-[10px]" style="solid" />
                    <span className="truncate">{activeProperty.location}</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                    {getPropertyDescription(activeProperty.type)}
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
        isLoading={moveMutation.isPending}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, property: null, groupId: null })}
        onConfirm={handleDeleteConfirm}
        isLoading={removePropertyMutation.isPending}
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
