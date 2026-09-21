import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Disclosure, DisclosurePanel } from '@headlessui/react';
import clsx from 'clsx';
import type { PropertyGroup, PropertyItem } from '../types';
import type { PropertiesViewMode } from '@shared/types';
import { PropertyCard } from './PropertyCard';
import { PropertyCardGrid } from './PropertyCardGrid';
import { PropertyDenseTable } from './PropertyDenseTable';
import { GroupHeader } from './GroupHeader';
import { PropertyStackSection } from './PropertyStackSection';
import Icon from '@shared/components/Icon';
import PropertyTypeDropdown from '@features/appraisal/components/PropertyTypeDropdown.tsx';
import { AddPropertyBar } from './AddPropertyBar';

/**
 * How many properties of one type it takes before they collapse into a single pile.
 * Applies to every type — four land parcels stack exactly the way six machines do.
 */
const STACK_MIN = 3;

/** A run of the group: either one property on its own, or a pile of same-type ones. */
type GroupSegment =
  | { kind: 'item'; item: PropertyItem }
  | { kind: 'stack'; type: string; items: PropertyItem[] };

interface GroupContainerProps {
  group: PropertyGroup;
  viewMode: PropertiesViewMode;
  isPma?: boolean;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
  onEdit: (property: PropertyItem, groupId: string) => void;
  onMoveTo: (property: PropertyItem, groupId: string) => void;
  onCopy: (property: PropertyItem) => void;
  onPaste: (groupId: string) => void;
  onDelete: (property: PropertyItem, groupId: string) => void;
  onGoToPricingAnalysis: (groupId: string) => void;
  onShowOnMap: (propertyId: string) => void;
  hasClipboard: boolean;
  isDeletingGroup?: boolean;
}

export const GroupContainer = React.memo(
  ({
    group,
    viewMode,
    isPma = false,
    onDeleteGroup,
    onRenameGroup,
    onContextMenu,
    onEdit,
    onMoveTo,
    onCopy,
    onPaste,
    onDelete,
    onGoToPricingAnalysis,
    onShowOnMap,
    hasClipboard,
    isDeletingGroup = false,
  }: GroupContainerProps) => {
    const { t } = useTranslation('appraisal');
    const readOnly = usePageReadOnly();
    const canEdit = !readOnly && !isPma;

    /** Rows and cards can be dragged; the dense table cannot. Split view never renders a group. */
    const isSortable = viewMode === 'rows' || viewMode === 'cards';

    const droppableData = useMemo(() => ({ type: 'group' as const, group }), [group]);
    const { setNodeRef, isOver } = useDroppable({ id: group.id, data: droppableData });

    // Memoize item IDs so SortableContext doesn't get a new array reference every render
    // (especially important for empty groups where [] !== [])
    const sortableItemIds = useMemo(() => group.items.map(item => item.id), [group.items]);

    /** Which piles the user has opened. Piles start collapsed. */
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

    const toggleTypeExpansion = useCallback((type: string) => {
      setExpandedTypes(prev => {
        const next = new Set(prev);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        return next;
      });
    }, []);

    /**
     * Split the group into what actually gets rendered. A type with at least STACK_MIN members
     * becomes one pile, positioned where its first member sits; everything else stays a row.
     */
    const segments = useMemo<GroupSegment[]>(() => {
      const counts = new Map<string, number>();
      for (const item of group.items) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);

      const emitted = new Set<string>();
      const out: GroupSegment[] = [];
      for (const item of group.items) {
        if ((counts.get(item.type) ?? 0) >= STACK_MIN) {
          if (emitted.has(item.type)) continue;
          emitted.add(item.type);
          out.push({
            kind: 'stack',
            type: item.type,
            items: group.items.filter(i => i.type === item.type),
          });
        } else {
          out.push({ kind: 'item', item });
        }
      }
      return out;
    }, [group.items]);

    const emptyState = (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <Icon name="folder-open" className="text-2xl mb-2" />
        <p className="text-xs mb-3">{t('properties.dropHere')}</p>
        {canEdit && <PropertyTypeDropdown groupId={group.id} />}
      </div>
    );

    return (
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <Disclosure defaultOpen>
          {({ open }) => (
            <>
              <GroupHeader
                group={group}
                open={open}
                isPma={isPma}
                readOnly={readOnly}
                isDeletingGroup={isDeletingGroup}
                onRenameGroup={onRenameGroup}
                onDeleteGroup={onDeleteGroup}
                onGoToPricingAnalysis={onGoToPricingAnalysis}
              />

              <DisclosurePanel>
                {/* Only the two draggable views sit inside the droppable; the table reorders
                    through its row menu instead, and wrapping it would advertise a drop target
                    that does nothing. */}
                {isSortable ? (
                  <div
                    ref={setNodeRef}
                    className={clsx(
                      'min-h-[2.5rem] transition-colors',
                      isOver && 'bg-primary/5 ring-2 ring-inset ring-primary',
                    )}
                  >
                    <SortableContext
                      items={sortableItemIds}
                      strategy={
                        viewMode === 'cards' ? rectSortingStrategy : verticalListSortingStrategy
                      }
                    >
                      {viewMode === 'cards' ? (
                        <PropertyCardGrid group={group} onContextMenu={onContextMenu} />
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {segments.map(segment =>
                            segment.kind === 'item' ? (
                              <PropertyCard
                                key={segment.item.id}
                                property={segment.item}
                                groupId={group.id}
                                onContextMenu={onContextMenu}
                                onShowOnMap={onShowOnMap}
                              />
                            ) : (
                              <PropertyStackSection
                                key={segment.type}
                                type={segment.type}
                                items={segment.items}
                                groupId={group.id}
                                isExpanded={expandedTypes.has(segment.type)}
                                onToggle={toggleTypeExpansion}
                                onContextMenu={onContextMenu}
                                onShowOnMap={onShowOnMap}
                              />
                            ),
                          )}
                        </div>
                      )}
                    </SortableContext>

                    {group.items.length === 0 && emptyState}
                  </div>
                ) : group.items.length === 0 ? (
                  emptyState
                ) : (
                  <PropertyDenseTable
                    group={group}
                    onEdit={onEdit}
                    onMoveTo={onMoveTo}
                    onCopy={onCopy}
                    onPaste={onPaste}
                    onDelete={onDelete}
                    hasClipboard={hasClipboard}
                  />
                )}

                {/* The card grid carries its own "add" tile, so the footer bar would be a
                    second one right under it. */}
                {canEdit && group.items.length > 0 && viewMode !== 'cards' && (
                  <AddPropertyBar groupId={group.id} />
                )}
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
      </div>
    );
  },
);

GroupContainer.displayName = 'GroupContainer';
