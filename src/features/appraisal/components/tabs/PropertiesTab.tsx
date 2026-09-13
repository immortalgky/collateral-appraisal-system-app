import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBasePath, useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
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
import Icon from '@shared/components/Icon';
import { PropertyCardContent } from '../PropertyCardContent';
import { usePropertyClipboardStore } from '../../store';
import { useEnrichedPropertyGroups } from '../../hooks/useEnrichedPropertyGroups';
import {
  useCopyPropertyToGroup,
  useCreatePropertyGroup,
  useDeletePropertyGroup,
  useMovePropertyToGroup,
  useReorderPropertiesInGroup,
  useUpdatePropertyGroup,
} from '../../api/propertyGroup';
import { useDeleteProperty } from '../../api/property';
import { GroupContainer } from '../GroupContainer';
import { PropertiesViewSwitcher } from '../PropertiesViewSwitcher';
import { PropertySplitView } from '../PropertySplitView';
import { MachinerySummaryStrip } from '../MachinerySummaryStrip';
import { useMachinerySummaryStatus } from '../../hooks/useMachinerySummaryStatus';
import { PropertiesMapModal } from '../PropertiesMapModal';
import { MoveToGroupModal } from '../MoveToGroupModal';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { PropertyContextMenu } from '../PropertyContextMenu';
import type { PropertyItem } from '../../types';
import type { PropertiesViewMode } from '@shared/types';
import { usePropertyBasePath } from '../../hooks/usePropertyBasePath';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { getRouteSegment as getRouteSegmentFromConfig } from '../../utils/propertyTypeConfig';
import { usePricingValidationGate } from '@features/pricingAnalysis/hooks/usePricingValidationGate';
import type { GroupPropertyRef } from '../../hooks/usePropertyGroupMandatoryValidation';

const getRouteSegment = (type: string): string => getRouteSegmentFromConfig(type) ?? 'land';

// Only measure droppables before a drag starts — prevents ResizeObserver
// from firing on trivial CSS changes (hover states) and causing re-render loops.
const MEASURING_CONFIG = {
  droppable: { strategy: MeasuringStrategy.BeforeDragging },
};

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  property: PropertyItem | null;
  groupId: string | null;
}

interface PropertiesTabProps {
  viewMode: PropertiesViewMode;
  onViewModeChange: (mode: PropertiesViewMode) => void;
  /**
   * The property editor, when the URL has one open and the split view can hold it. Passed
   * straight through — this tab does not decide whether an editor exists, only where it sits.
   */
  editorSlot?: ReactNode;
}

export const PropertiesTab = ({ viewMode, onViewModeChange, editorSlot }: PropertiesTabProps) => {
  const { t } = useTranslation('appraisal');
  const readOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const appraisalId = useAppraisalId();
  const propertyBasePath = usePropertyBasePath();
  const isPma = propertyBasePath === 'property-pma';

  // Pre-flight validation gate for pricing analysis (plug-and-play; reusable elsewhere)
  const { open: openPricingValidation, modal: pricingValidationModal } = usePricingValidationGate();

  // API data
  const { groups, isLoading, error } = useEnrichedPropertyGroups(appraisalId);

  // The machinery summary lives here now, as a strip above the groups (or a pinned rail entry in
  // the split view) — shown, as the old tab was, only when the appraisal holds machinery.
  const machineCount = useMemo(
    () =>
      groups.reduce(
        (n, group) => n + group.items.filter(item => (item.type as string) === 'MAC').length,
        0,
      ),
    [groups],
  );
  const hasMachinery = machineCount > 0 && !isPma;
  const machinerySummary = useMachinerySummaryStatus(hasMachinery ? appraisalId : undefined);
  const openMachinerySummary = () => navigate(`${basePath}/property/machinery-summary`);

  // Keep a stable ref to groups so DndContext callbacks don't change when groups change.
  // Changing onDragEnd/onDragStart triggers DndContext context updates which re-render
  // all useDroppable/useSortable consumers — bypassing React.memo and causing infinite loops.
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  // Clipboard (UI-only state)
  const { clipboard, copyProperty } = usePropertyClipboardStore();

  // Mutations
  const createGroupMutation = useCreatePropertyGroup();
  const updateGroupMutation = useUpdatePropertyGroup();
  const deleteGroupMutation = useDeletePropertyGroup();
  const deletePropertyMutation = useDeleteProperty();
  const copyPropertyMutation = useCopyPropertyToGroup();
  const moveMutation = useMovePropertyToGroup();
  const reorderMutation = useReorderPropertiesInGroup();

  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [highlightPropertyId, setHighlightPropertyId] = useState<string | null>(null);

  // Properties map modal — holds the id of the property whose pin was clicked.
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  /** Which property the split view is showing. Lives here so switching views keeps the choice. */
  const [splitSelectedId, setSplitSelectedId] = useState<string | null>(null);
  const handleShowOnMap = useCallback((propertyId: string) => setMapSelectedId(propertyId), []);
  const allProperties = useMemo(() => groups.flatMap(g => g.items), [groups]);

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

  // Scroll to and highlight newly pasted property
  useEffect(() => {
    if (!highlightPropertyId) return;
    const el = document.querySelector(`[data-property-id="${highlightPropertyId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    el.classList.add('animate-flash-highlight');
    const handleEnd = () => {
      el.classList.remove('animate-flash-highlight');
      el.removeEventListener('animationend', handleEnd);
    };
    el.addEventListener('animationend', handleEnd);
    setHighlightPropertyId(null);
  }, [highlightPropertyId, groups]);

  // ==================== Mutation Handlers ====================

  const handleAddGroup = useCallback(() => {
    if (!appraisalId) return;
    const groupNumber = groupsRef.current.length + 1;
    createGroupMutation.mutate(
      { appraisalId, groupName: `Group ${groupNumber}` },
      {
        onError: () => {
          toast.error(t('properties.toasts.groupCreateFailed'));
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
          description: group.description ?? null,
        },
        {
          onError: () => {
            toast.error(t('properties.toasts.groupRenameFailed'));
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
            toast.error(t('properties.toasts.groupDeleteFailed'));
          },
        },
      );
    },
    [appraisalId, deleteGroupMutation],
  );

  const handleMoveProperty = useCallback(
    (fromGroupId: string, toGroupId: string, propertyId: string, targetPosition?: number) => {
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
            toast.error(t('properties.toasts.propertyMoveFailed'));
          },
        },
      );
    },
    [appraisalId, moveMutation],
  );

  const handlePasteProperty = useCallback(
    (groupId: string) => {
      if (!appraisalId || !clipboard) return;
      copyPropertyMutation.mutate(
        { appraisalId, propertyId: clipboard.id, targetGroupId: groupId },
        {
          onSuccess: data => {
            setHighlightPropertyId(data.id);
          },
          onError: () => {
            toast.error(t('properties.toasts.propertyPasteFailed'));
          },
        },
      );
    },
    [appraisalId, clipboard, copyPropertyMutation],
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
                { onError: () => toast.error(t('properties.toasts.reorderFailed')) },
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
          `${basePath}/${propertyBasePath}/${routeSegment}/${property.id}?groupId=${groupId}`,
        );
      }
    },
    [basePath, propertyBasePath, navigate],
  );

  const handleMoveToProperty = useCallback((property: PropertyItem, groupId: string) => {
    setMoveModalState({
      isOpen: true,
      property,
      fromGroupId: groupId,
    });
  }, []);

  const handleCopyProperty = useCallback(
    (property: PropertyItem) => {
      copyProperty(property);
    },
    [copyProperty],
  );

  const handleDeleteProperty = useCallback((property: PropertyItem, groupId: string) => {
    setDeleteModalState({
      isOpen: true,
      property,
      groupId,
    });
  }, []);

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
    if (!appraisalId || !deleteModalState.property) return;
    deletePropertyMutation.mutate(
      { appraisalId, propertyId: deleteModalState.property.id },
      {
        onSuccess: () => {
          setDeleteModalState({ isOpen: false, property: null, groupId: null });
        },
        onError: () => {
          toast.error(t('properties.toasts.propertyDeleteFailed'));
        },
      },
    );
  };

  const navigateToPricingAnalysis = useCallback(
    (groupId: string) => {
      const group = groupsRef.current.find(g => g.id === groupId);
      const paId = group?.pricingAnalysisId;
      navigate(
        paId
          ? `${basePath}/groups/${groupId}/pricing-analysis/${paId}`
          : `${basePath}/groups/${groupId}/pricing-analysis`,
      );
    },
    [basePath, navigate],
  );

  // Validate the group first; only navigate once every rule passes.
  const handleGoToPricingAnalysis = useCallback(
    (groupId: string) => {
      // Read-only entry (opened from Search, or a terminal/non-editable appraisal) can only
      // view the analysis and cannot fix anything the pre-flight would flag, so skip the
      // validation gate entirely and go straight to the page.
      if (readOnly) {
        navigateToPricingAnalysis(groupId);
        return;
      }

      const group = groupsRef.current.find(g => g.id === groupId);
      // item.type carries the backend property type code; the validation registry normalises it.
      const properties: GroupPropertyRef[] = (group?.items ?? []).map((item, index) => ({
        id: item.id,
        typeCode: item.type,
        sequenceNumber: item.sequenceNumber ?? index + 1,
      }));
      openPricingValidation({ groupId, appraisalId, properties }, () =>
        navigateToPricingAnalysis(groupId),
      );
    },
    [readOnly, openPricingValidation, navigateToPricingAnalysis, appraisalId],
  );

  const contextMenuItems = readOnly
    ? [{ label: t('properties.contextMenu.view'), icon: 'eye', onClick: handleEdit }]
    : isPma
      ? // PMA mode: only Edit (opens the PMA editor); Move/Copy/Paste/Delete are hidden.
        [{ label: t('properties.contextMenu.edit'), icon: 'pen-to-square', onClick: handleEdit }]
      : [
          {
            label: t('properties.contextMenu.edit'),
            icon: 'pen-to-square',
            onClick: handleEdit,
          },
          {
            label: t('properties.contextMenu.moveTo'),
            icon: 'arrow-right-arrow-left',
            onClick: handleMoveTo,
            disabled: groups.length <= 1,
          },
          {
            label: t('properties.contextMenu.copy'),
            icon: 'copy',
            onClick: handleCopy,
          },
          {
            label: t('properties.contextMenu.paste'),
            icon: 'paste',
            onClick: handlePaste,
            disabled: !clipboard,
          },
          {
            label: t('properties.contextMenu.delete'),
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
        <p className="text-sm font-medium text-red-500">{t('properties.loadError')}</p>
        <p className="text-xs text-red-400 mt-1">{t('properties.loadErrorHint')}</p>
      </div>
    );
  }

  // ==================== Render ====================

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-gray-500">
          <b className="font-semibold text-gray-700 tabular-nums">{groups.length}</b>{' '}
          {t('properties.toolbar.groups')}
          <span className="mx-1.5 text-gray-400">·</span>
          <b className="font-semibold text-gray-700 tabular-nums">{allProperties.length}</b>{' '}
          {t('properties.toolbar.properties')}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <PropertiesViewSwitcher value={viewMode} onChange={onViewModeChange} />

          {/* Primary, to match the rest of the toolbar. Adding a property is the more frequent
              action, but it lives on every group's own footer rather than up here. */}
          {!readOnly && !isPma && (
            <button
              type="button"
              onClick={handleAddGroup}
              disabled={createGroupMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {createGroupMutation.isPending ? (
                <Icon name="spinner" className="animate-spin text-[11px]" />
              ) : (
                <Icon name="plus" className="text-[11px]" />
              )}
              {t('properties.addNewGroup')}
            </button>
          )}
        </div>
      </div>

      {/* The split view gets the same drag context as the other layouts: its rail is a list of
          every property in the appraisal, which is the most natural place of all to reorder
          them. The handlers below only read `active`/`over` data, so they work unchanged. */}
      {viewMode === 'split' && groups.length > 0 ? (
        <DndContext
          sensors={readOnly ? [] : sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          measuring={MEASURING_CONFIG}
        >
          <div className="flex-1 min-h-0">
            <PropertySplitView
              groups={groups}
              selectedId={splitSelectedId}
              onSelect={setSplitSelectedId}
              onEdit={handleEditProperty}
              onMoveTo={handleMoveToProperty}
              onCopy={handleCopyProperty}
              onPaste={handlePasteProperty}
              onDelete={handleDeleteProperty}
              onShowOnMap={handleShowOnMap}
              onGoToPricingAnalysis={handleGoToPricingAnalysis}
              onContextMenu={handleContextMenu}
              onRenameGroup={handleRenameGroup}
              onDeleteGroup={handleDeleteGroup}
              deletingGroupId={deletingGroupId}
              hasClipboard={!!clipboard}
              editorSlot={editorSlot}
              machinerySummary={
                hasMachinery
                  ? { status: machinerySummary.status, onOpen: openMachinerySummary }
                  : undefined
              }
            />
          </div>

          {/* The rail's rows are one line tall, so the floating preview is too — a full card
              hovering over a 14rem column would hide the drop target it is aiming at. */}
          <DragOverlay dropAnimation={null}>
            {activeProperty ? (
              <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-lg ring-2 ring-primary">
                <Icon name="grip-vertical" className="text-[10px] text-gray-400" />
                <span className="truncate">{activeProperty.address}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <DndContext
          sensors={readOnly ? [] : sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          measuring={MEASURING_CONFIG}
        >
          <div className="space-y-2 flex-1 overflow-y-auto">
            {/* First in the scrolling list rather than above it: it scrolls away with the groups
                instead of holding a strip of the screen once it has been read. */}
            {hasMachinery && (
              <MachinerySummaryStrip
                state={machinerySummary}
                machineCount={machineCount}
                readOnly={readOnly}
                onOpen={openMachinerySummary}
              />
            )}
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Icon name="layer-group" className="text-4xl mb-3" />
                <p className="text-sm font-medium text-gray-500">{t('properties.noGroups')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('properties.noGroupsHint')}</p>
              </div>
            ) : (
              groups.map(group => (
                <GroupContainer
                  key={group.id}
                  group={group}
                  viewMode={viewMode}
                  isPma={isPma}
                  onDeleteGroup={handleDeleteGroup}
                  onRenameGroup={handleRenameGroup}
                  onContextMenu={handleContextMenu}
                  onEdit={handleEditProperty}
                  onMoveTo={handleMoveToProperty}
                  onCopy={handleCopyProperty}
                  onPaste={handlePasteProperty}
                  onDelete={handleDeleteProperty}
                  onGoToPricingAnalysis={handleGoToPricingAnalysis}
                  onShowOnMap={handleShowOnMap}
                  hasClipboard={!!clipboard}
                  isDeletingGroup={deletingGroupId === group.id}
                />
              ))
            )}
          </div>

          {/* Drag Overlay (list and card views) */}
          <DragOverlay dropAnimation={null}>
            {activeProperty ? (
              <div
                className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl ring-2 ring-primary cursor-grabbing flex items-stretch opacity-95 ${
                  // A full-width row floating over a grid of 200 px cards reads as the wrong
                  // object; cap it so the preview stays about the size of what is being dragged.
                  viewMode === 'cards' ? 'max-w-[20rem]' : ''
                }`}
              >
                <div className="flex items-center justify-center w-5 flex-shrink-0 text-gray-400">
                  <Icon name="grip-vertical" className="text-[11px]" />
                </div>
                <PropertyCardContent property={activeProperty} showArrow={false} size="compact" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

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
        readOnly={readOnly}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, property: null, groupId: null })}
        onConfirm={handleDeleteConfirm}
        isLoading={deletePropertyMutation.isPending}
      />

      <PropertiesMapModal
        isOpen={mapSelectedId != null}
        onClose={() => setMapSelectedId(null)}
        appraisalId={appraisalId}
        properties={allProperties}
        selectedPropertyId={mapSelectedId ?? ''}
      />

      {/* Pricing-analysis pre-flight validation modal */}
      {pricingValidationModal}

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
