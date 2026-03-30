import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import type { PropertyGroup, PropertyItem } from '../types';
import { PropertyCard } from './PropertyCard';
import { PropertyTable } from './PropertyTable';
import Icon from '@shared/components/Icon';
import Badge from '@shared/components/Badge';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import PropertyTypeDropdown, { PROPERTY_TYPES } from '@features/appraisal/components/PropertyTypeDropdown.tsx';

/** Look up the icon name for a given property type */
const getPropertyTypeIcon = (type: string): string => {
  return PROPERTY_TYPES.find(pt => pt.type === type)?.icon ?? 'cube';
};

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
  onGoToPricingAnalysis: (groupId: string) => void;
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
    onGoToPricingAnalysis,
    hasClipboard,
    isDeletingGroup = false,
  }: GroupContainerProps) => {
    const readOnly = usePageReadOnly();
    const droppableData = useMemo(() => ({ type: 'group' as const, group }), [group]);
    const { setNodeRef, isOver } = useDroppable({
      id: group.id,
      data: droppableData,
    });

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

    const handleOnClickPricingButton = useCallback(() => {
      onGoToPricingAnalysis(group.id);
    }, [onGoToPricingAnalysis, group.id]);

    // Card stacking: collapse same-type cards when >= 2 of same type
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

    /** Per-item stacking metadata for grid view */
    const stackInfo = useMemo(() => {
      if (viewMode !== 'grid') return null;
      const typeCounts: Record<string, number> = {};
      const typeFirstIndex: Record<string, number> = {};
      const typeItems: Record<string, PropertyItem[]> = {};
      group.items.forEach((item, index) => {
        typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
        if (typeFirstIndex[item.type] === undefined) typeFirstIndex[item.type] = index;
        (typeItems[item.type] ??= []).push(item);
      });
      const stackableTypes = new Set(
        Object.entries(typeCounts)
          .filter(([, c]) => c >= 3)
          .map(([t]) => t),
      );
      return group.items.map((item, index) => ({
        isStackable: stackableTypes.has(item.type),
        isFirst: typeFirstIndex[item.type] === index,
        count: typeCounts[item.type],
        typeItems: typeItems[item.type],
      }));
    }, [group.items, viewMode]);

    const toggleTypeExpansion = useCallback((type: string) => {
      setExpandedTypes(prev => {
        const next = new Set(prev);
        next.has(type) ? next.delete(type) : next.add(type);
        return next;
      });
    }, []);

    // Compute property type breakdown for summary stats
    const typeBreakdown = useMemo(() => {
      const counts: Record<string, number> = {};
      for (const item of group.items) {
        counts[item.type] = (counts[item.type] || 0) + 1;
      }
      return Object.entries(counts).map(([type, count]) => ({ type, count }));
    }, [group.items]);

    return (
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
        <Disclosure defaultOpen>
          {({ open }) => (
            <>
              {/* Group Header — compact with inline stats */}
              <div className="flex items-center justify-between px-3 py-2 border-l-4 border-primary rounded-tl-xl rounded-tr-xl">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <DisclosureButton className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                    <Icon
                      name="chevron-down"
                      className={`text-xs transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
                      style="solid"
                    />
                  </DisclosureButton>
                  {isEditing && !readOnly ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={handleKeyDown}
                      className="text-xs font-semibold text-gray-900 bg-white border border-primary rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary min-w-0 w-48"
                    />
                  ) : (
                    <h2
                      className={`text-xs font-semibold text-gray-900 ${readOnly ? '' : 'cursor-pointer hover:text-primary'} transition-colors`}
                      onClick={readOnly ? undefined : () => setIsEditing(true)}
                      title={readOnly ? undefined : 'Click to rename'}
                    >
                      {group.name}
                    </h2>
                  )}
                  <span className="text-[11px] text-gray-400">
                    ({group.items.length})
                  </span>
                  {/* Inline type breakdown badges */}
                  {typeBreakdown.length > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      {typeBreakdown.map(({ type, count }) => (
                        <Badge key={type} type="property" value={type} size="xs" dot={false}>
                          {count} <ParameterDisplay group="PropertyType" code={type} fallback={type} />
                        </Badge>
                      ))}
                    </>
                  )}
                  {!readOnly && (
                    <button
                      onClick={() => onDeleteGroup(group.id)}
                      disabled={isDeletingGroup}
                      className="ml-1 p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete group"
                    >
                      {isDeletingGroup ? (
                        <Icon name="spinner" className="text-[11px] animate-spin" />
                      ) : (
                        <Icon name="trash" className="text-[11px]" />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="relative p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 cursor-pointer rounded-md transition-colors"
                    onClick={() => handleOnClickPricingButton()}
                    title="Pricing Analysis"
                  >
                    <Icon name="badge-dollar" className="text-base" />
                    <span
                      className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                        group.pricingAnalysisId ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Collapsible content */}
              <DisclosurePanel>
                <div className="px-2 pb-2">
                  {/* Property Items */}
                  {viewMode === 'grid' ? (
                    // Grid view with drag & drop
                    <div
                      ref={setNodeRef}
                      className={`min-h-[40px] rounded-lg p-1.5 transition-all duration-200 ${
                        isOver
                          ? 'border-2 border-primary bg-primary/5'
                          : 'bg-gray-50/50'
                      }`}
                    >
                      <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                          {group.items.map((property, index) => {
                            const info = stackInfo?.[index];
                            const isExpanded = expandedTypes.has(property.type);

                            // Not stackable or no stack info → render normally
                            if (!info?.isStackable) {
                              return (
                                <PropertyCard
                                  key={property.id}
                                  property={property}
                                  groupId={group.id}
                                  onContextMenu={onContextMenu}
                                />
                              );
                            }

                            // Expanded + first → render collapse header + ALL cards of this type grouped together
                            if (isExpanded && info.isFirst) {
                              return (
                                <div key={property.id} className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-1.5 space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleTypeExpansion(property.type)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-left shadow-sm"
                                  >
                                    <Icon
                                      name={getPropertyTypeIcon(property.type)}
                                      className="text-sm text-gray-500"
                                      style="solid"
                                    />
                                    <span className="text-xs font-semibold text-gray-700 flex-1">
                                      <ParameterDisplay group="PropertyType" code={property.type} fallback={property.type} />
                                      {' '}List ( {info.count} )
                                    </span>
                                    <span className="text-[10px] text-gray-400">Collapse</span>
                                    <Icon name="chevron-up" className="text-xs text-gray-400" style="solid" />
                                  </button>
                                  {info.typeItems.map(p => (
                                    <PropertyCard
                                      key={p.id}
                                      property={p}
                                      groupId={group.id}
                                      onContextMenu={onContextMenu}
                                    />
                                  ))}
                                </div>
                              );
                            }

                            // Expanded + non-first → hidden (already rendered above by the first item)
                            if (isExpanded) {
                              return (
                                <div key={property.id} className="h-0 overflow-hidden">
                                  <div className="opacity-0 pointer-events-none">
                                    <PropertyCard
                                      property={property}
                                      groupId={group.id}
                                      onContextMenu={onContextMenu}
                                    />
                                  </div>
                                </div>
                              );
                            }

                            // Collapsed: first item renders the placeholder card, others are hidden
                            if (info.isFirst) {
                              const items = info.typeItems;
                              // Collect unique addresses (truncated)
                              const addresses = items
                                .map(p => p.address)
                                .filter(Boolean)
                                .slice(0, 3);
                              // Sum up areas
                              const areas = items
                                .map(p => p.area)
                                .filter(Boolean);
                              return (
                                <div key={property.id}>
                                  {/* Stack placeholder card */}
                                  <button
                                    type="button"
                                    onClick={() => toggleTypeExpansion(property.type)}
                                    className="w-full bg-white border border-gray-200 rounded-md shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150 flex items-center overflow-hidden text-left group"
                                  >
                                    {/* Thumbnail area — show property images or fallback icon */}
                                    <div className="w-24 h-16 bg-gray-50 flex-shrink-0 border-r border-gray-100 overflow-hidden">
                                      {items.some(p => p.image) ? (
                                        <div className={`w-full h-full grid ${
                                          items.filter(p => p.image).length === 1
                                            ? 'grid-cols-1'
                                            : items.filter(p => p.image).length <= 4
                                              ? 'grid-cols-2 grid-rows-2'
                                              : 'grid-cols-3 grid-rows-2'
                                        }`}>
                                          {items
                                            .filter(p => p.image)
                                            .slice(0, 6)
                                            .map(p => (
                                              <img
                                                key={p.id}
                                                src={p.image}
                                                alt={p.address}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                              />
                                            ))}
                                        </div>
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 transition-colors flex items-center justify-center">
                                            <Icon
                                              name={getPropertyTypeIcon(property.type)}
                                              className="text-2xl text-gray-400"
                                              style="solid"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 px-3 py-2 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-semibold text-gray-900">
                                          <ParameterDisplay group="PropertyType" code={property.type} fallback={property.type} />
                                          {' '}List
                                        </h3>
                                        <span className="text-xs font-semibold text-gray-500">
                                          ( {info.count} )
                                        </span>
                                      </div>

                                      {/* Detail chips */}
                                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        {addresses.length > 0 && (
                                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5 truncate max-w-[260px]">
                                            <Icon name="location-dot" className="text-[9px] text-gray-400" style="solid" />
                                            {addresses[0]}
                                            {addresses.length > 1 && ` +${addresses.length - 1}`}
                                          </span>
                                        )}
                                        {areas.length > 0 && (
                                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                                            <Icon name="ruler-combined" className="text-[9px] text-gray-400" style="solid" />
                                            {areas.join(', ')}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Chevron */}
                                    <div className="pr-4 flex flex-col items-center gap-1">
                                      <Icon name="chevron-down" className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors" style="solid" />
                                    </div>
                                  </button>

                                  {/* Hidden PropertyCard for dnd-kit (first item) */}
                                  <div className="h-0 overflow-hidden">
                                    <div className="opacity-0 pointer-events-none">
                                      <PropertyCard
                                        property={property}
                                        groupId={group.id}
                                        onContextMenu={onContextMenu}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // Non-first card, collapsed → hidden but kept in DOM for dnd-kit
                            return (
                              <div
                                key={property.id}
                                className="h-0 overflow-hidden"
                              >
                                <div className="opacity-0 pointer-events-none">
                                  <PropertyCard
                                    property={property}
                                    groupId={group.id}
                                    onContextMenu={onContextMenu}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </SortableContext>

                      {/* Empty State */}
                      {group.items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-4 text-gray-400">
                          <Icon name="folder-open" className="text-2xl mb-2" />
                          <p className="text-xs mb-3">Drop properties here or add below</p>
                          {!readOnly && <PropertyTypeDropdown groupId={group.id} />}
                        </div>
                      )}
                    </div>
                  ) : // List view - simple table without wrapper
                  group.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-50/50 rounded-lg">
                      <Icon name="folder-open" className="text-2xl mb-2" />
                      <p className="text-xs mb-3">Drop properties here or add below</p>
                      {!readOnly && <PropertyTypeDropdown groupId={group.id} />}
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

                  {/* Add Property Button (only when items exist) */}
                  {!readOnly && group.items.length > 0 && (
                    <div className="mt-2 flex justify-center">
                      <PropertyTypeDropdown groupId={group.id} />
                    </div>
                  )}
                </div>
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
      </div>
    );
  },
);
