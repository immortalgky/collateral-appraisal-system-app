import { useMemo, useRef, useState } from 'react';
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
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import SectionHeader from '@shared/components/sections/SectionHeader';
import AddFactorModal from './AddFactorModal';
import type { MarketComparableFactorDtoType } from '@/shared/schemas/v1';
import clsx from 'clsx';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';
import { useLocaleStore } from '@shared/store';

export interface TemplateFactor {
  templateFactorId?: string;
  id?: string;
  factorId: string;
  displaySequence: number;
  isMandatory: boolean;
  isCalculationFactor?: boolean;
  defaultWeight?: number | null;
  defaultIntensity?: number | null;
}

interface TemplateFactorManagerProps {
  factors: TemplateFactor[];
  allFactors: MarketComparableFactorDtoType[];
  onAddFactor: (selections: { factorId: string; isMandatory: boolean; isCalculationFactor: boolean }[]) => void;
  onRemoveFactor: (factorId: string) => void;
  onToggleMandatory?: (factorId: string, isMandatory: boolean) => void;
  onToggleCalculation?: (factorId: string, isCalculationFactor: boolean) => void;
  onUpdateDefaults?: (factorId: string, defaultWeight: number | null, defaultIntensity: number | null) => void;
  onReorder?: (reorderedFactors: TemplateFactor[]) => void;
  isAdding?: boolean;
  isRemoving?: boolean;
  isUpdating?: boolean;
  showDefaultWeight?: boolean;
}

interface SortableRowProps {
  tf: TemplateFactor;
  factorMap: Map<string, MarketComparableFactorDtoType>;
  language: string;
  onToggleMandatory?: (factorId: string, isMandatory: boolean) => void;
  onToggleCalculation?: (factorId: string, isCalculationFactor: boolean) => void;
  onUpdateDefaults?: (factorId: string, defaultWeight: number | null, defaultIntensity: number | null) => void;
  onRemoveFactor: (factorId: string) => void;
  isUpdating?: boolean;
  isRemoving?: boolean;
  showDefaultWeight: boolean;
}

const InlineNumberInput = ({
  value,
  onCommit,
  disabled,
}: {
  value: number | null | undefined;
  onCommit: (val: number | null) => void;
  disabled?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const handleStart = () => {
    setDraft(value != null ? String(value) : '');
    setEditing(true);
  };

  const handleCommit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    const newVal = trimmed === '' ? null : Number(trimmed);
    if (trimmed !== '' && isNaN(newVal!)) return;
    if (newVal === (value ?? null)) return;
    onCommit(newVal);
  };

  if (editing) {
    return (
      <input
        type="number"
        step="any"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCommit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-20 px-2 py-0.5 text-sm text-center border border-primary/30 rounded focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleStart}
      className={clsx(
        'inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded text-sm transition-colors',
        value != null
          ? 'text-gray-700 hover:bg-gray-100'
          : 'text-gray-400 hover:bg-gray-100',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {value != null ? value : '-'}
    </button>
  );
};

const SortableRow = ({
  tf,
  factorMap,
  language,
  onToggleMandatory,
  onToggleCalculation,
  onUpdateDefaults,
  onRemoveFactor,
  isUpdating,
  isRemoving,
  showDefaultWeight,
}: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tf.factorId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const factorInfo = factorMap.get(tf.factorId);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
    >
      <td className="py-3 px-2 text-center cursor-grab" {...attributes} {...listeners}>
        <Icon name="grip-vertical" style="solid" className="size-4 text-gray-400" />
      </td>
      <td className="py-3 px-4 text-sm text-gray-500 text-center">{tf.displaySequence}</td>
      <td className="py-3 px-4 text-sm font-mono text-gray-700">
        {factorInfo?.factorCode ?? '-'}
      </td>
      <td className="py-3 px-4 text-sm text-gray-900">
        {getTranslatedFactorName(factorInfo?.translations, language) || 'Unknown Factor'}
      </td>
      <td className="py-3 px-4 text-center">
        {onToggleMandatory ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onToggleMandatory(tf.factorId, !tf.isMandatory)}
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors',
              tf.isMandatory
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              isUpdating && 'opacity-50 cursor-not-allowed',
            )}
          >
            {tf.isMandatory ? 'Yes' : 'No'}
          </button>
        ) : (
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              tf.isMandatory
                ? 'bg-amber-50 text-amber-700'
                : 'bg-gray-100 text-gray-500',
            )}
          >
            {tf.isMandatory ? 'Yes' : 'No'}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-center">
        {onToggleCalculation ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onToggleCalculation(tf.factorId, !tf.isCalculationFactor)}
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors',
              tf.isCalculationFactor
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              isUpdating && 'opacity-50 cursor-not-allowed',
            )}
          >
            {tf.isCalculationFactor ? 'Yes' : 'No'}
          </button>
        ) : (
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              tf.isCalculationFactor
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-100 text-gray-500',
            )}
          >
            {tf.isCalculationFactor ? 'Yes' : 'No'}
          </span>
        )}
      </td>
      {showDefaultWeight && (
        <>
          <td className="py-3 px-4 text-center">
            {onUpdateDefaults ? (
              <InlineNumberInput
                value={tf.defaultWeight}
                disabled={isUpdating}
                onCommit={(w) => onUpdateDefaults(tf.factorId, w, tf.defaultIntensity ?? null)}
              />
            ) : (
              <span className="text-sm text-gray-600">{tf.defaultWeight != null ? tf.defaultWeight : '-'}</span>
            )}
          </td>
          <td className="py-3 px-4 text-center">
            {onUpdateDefaults ? (
              <InlineNumberInput
                value={tf.defaultIntensity}
                disabled={isUpdating}
                onCommit={(i) => onUpdateDefaults(tf.factorId, tf.defaultWeight ?? null, i)}
              />
            ) : (
              <span className="text-sm text-gray-600">{tf.defaultIntensity != null ? tf.defaultIntensity : '-'}</span>
            )}
          </td>
        </>
      )}
      <td className="py-3 px-4 text-center">
        <Button
          variant="ghost"
          size="xs"
          disabled={isRemoving}
          onClick={() => onRemoveFactor(tf.factorId)}
          leftIcon={<Icon name="trash-can" style="regular" className="size-3.5 text-danger" />}
        />
      </td>
    </tr>
  );
};

const TemplateFactorManager = ({
  factors,
  allFactors,
  onAddFactor,
  onRemoveFactor,
  onToggleMandatory,
  onToggleCalculation,
  onUpdateDefaults,
  onReorder,
  isAdding,
  isRemoving,
  isUpdating,
  showDefaultWeight = false,
}: TemplateFactorManagerProps) => {
  const language = useLocaleStore((s) => s.language);
  const [showModal, setShowModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const factorMap = new Map(allFactors.map((f) => [f.id, f]));
  const assignedFactorIds = factors.map((f) => f.factorId);

  // Local order state so drag reorder is instant (no waiting for cache update)
  const [localOrder, setLocalOrder] = useState<TemplateFactor[] | null>(null);
  const prevFactorsRef = useRef(factors);
  // Reset local override when props change (e.g. after cache update or server refetch)
  if (prevFactorsRef.current !== factors) {
    prevFactorsRef.current = factors;
    setLocalOrder(null);
  }

  const sortedFactors = useMemo(() => {
    const source = localOrder ?? factors;
    return [...source].sort((a, b) => a.displaySequence - b.displaySequence);
  }, [localOrder, factors]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedFactors.findIndex((f) => f.factorId === active.id);
    const newIndex = sortedFactors.findIndex((f) => f.factorId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedFactors, oldIndex, newIndex).map((f, i) => ({
      ...f,
      displaySequence: i + 1,
    }));

    setLocalOrder(reordered);
    onReorder?.(reordered);
  };

  const activeFactor = activeId ? sortedFactors.find((f) => f.factorId === activeId) : null;
  const activeFactorInfo = activeFactor ? factorMap.get(activeFactor.factorId) : null;

  return (
    <div>
      <SectionHeader
        title="Template Factors"
        subtitle={`${factors.length} factor(s) assigned`}
        icon="layer-group"
        iconColor="purple"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            Add Factor
          </Button>
        }
      />

      {sortedFactors.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg mt-3">
          <Icon name="layer-group" style="regular" className="size-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">No factors assigned yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Factor" to assign factors from the master list</p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <table className="table w-full">
              <thead>
                <tr className="bg-primary/10">
                  <th className="text-primary text-sm font-semibold py-3 px-2 text-center first:rounded-tl-lg w-10" />
                  <th className="text-primary text-sm font-semibold py-3 px-4 text-center w-16">#</th>
                  <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Code</th>
                  <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Name</th>
                  <th className="text-primary text-sm font-semibold py-3 px-4 text-center">Mandatory</th>
                  <th className="text-primary text-sm font-semibold py-3 px-4 text-center">Calculation</th>
                  {showDefaultWeight && (
                    <>
                      <th className="text-primary text-sm font-semibold py-3 px-4 text-center">Default Weight</th>
                      <th className="text-primary text-sm font-semibold py-3 px-4 text-center">Default Intensity</th>
                    </>
                  )}
                  <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg w-20">Action</th>
                </tr>
              </thead>
              <SortableContext
                items={sortedFactors.map((f) => f.factorId)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {sortedFactors.map((tf) => (
                    <SortableRow
                      key={tf.factorId}
                      tf={tf}
                      factorMap={factorMap}
                      language={language}
                      onToggleMandatory={onToggleMandatory}
                      onToggleCalculation={onToggleCalculation}
                      onUpdateDefaults={onUpdateDefaults}
                      onRemoveFactor={onRemoveFactor}
                      isUpdating={isUpdating}
                      isRemoving={isRemoving}
                      showDefaultWeight={showDefaultWeight}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
            <DragOverlay>
              {activeFactor ? (
                <table className="table w-full">
                  <tbody>
                    <tr className="bg-white shadow-lg rounded-lg border border-primary/20">
                      <td className="py-3 px-2 text-center">
                        <Icon name="grip-vertical" style="solid" className="size-4 text-gray-400" />
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 text-center">{activeFactor.displaySequence}</td>
                      <td className="py-3 px-4 text-sm font-mono text-gray-700">{activeFactorInfo?.factorCode ?? '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {getTranslatedFactorName(activeFactorInfo?.translations, language) || 'Unknown Factor'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          activeFactor.isMandatory ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500',
                        )}>
                          {activeFactor.isMandatory ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          activeFactor.isCalculationFactor ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500',
                        )}>
                          {activeFactor.isCalculationFactor ? 'Yes' : 'No'}
                        </span>
                      </td>
                      {showDefaultWeight && (
                        <>
                          <td className="py-3 px-4 text-sm text-gray-600 text-center">
                            {activeFactor.defaultWeight != null ? activeFactor.defaultWeight : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 text-center">
                            {activeFactor.defaultIntensity != null ? activeFactor.defaultIntensity : '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  </tbody>
                </table>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      <AddFactorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        factors={allFactors}
        excludeFactorIds={assignedFactorIds}
        onAdd={(selections) => {
          onAddFactor(selections);
          setShowModal(false);
        }}
        isAdding={isAdding}
      />
    </div>
  );
};

export default TemplateFactorManager;
