import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  onAddFactor: (
    selections: { factorId: string; isMandatory: boolean; isCalculationFactor: boolean }[],
  ) => void;
  onRemoveFactor: (factorId: string) => void;
  onToggleMandatory?: (factorId: string, isMandatory: boolean) => void;
  onToggleCalculation?: (factorId: string, isCalculationFactor: boolean) => void;
  onUpdateDefaults?: (
    factorId: string,
    defaultWeight: number | null,
    defaultIntensity: number | null,
  ) => void;
  onReorder?: (reorderedFactors: TemplateFactor[]) => void;
  isAdding?: boolean;
  isRemoving?: boolean;
  isUpdating?: boolean;
  showDefaultWeight?: boolean;
  showCalculation?: boolean;
  showMandatory?: boolean;
}

type FactorSortKey =
  | 'seq'
  | 'code'
  | 'name'
  | 'mandatory'
  | 'calculation'
  | 'weight'
  | 'intensity';

interface SortableRowProps {
  tf: TemplateFactor;
  factorMap: Map<string, MarketComparableFactorDtoType>;
  language: string;
  onToggleMandatory?: (factorId: string, isMandatory: boolean) => void;
  onToggleCalculation?: (factorId: string, isCalculationFactor: boolean) => void;
  onUpdateDefaults?: (
    factorId: string,
    defaultWeight: number | null,
    defaultIntensity: number | null,
  ) => void;
  onRemoveFactor: (factorId: string) => void;
  isUpdating?: boolean;
  isRemoving?: boolean;
  showDefaultWeight: boolean;
  showCalculation: boolean;
  showMandatory: boolean;
  /** When a column sort is active, manual drag-reorder is disabled. */
  sortActive: boolean;
  yesLabel: string;
  noLabel: string;
  unknownFactorLabel: string;
  toggleHint: string;
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
        onChange={e => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={e => {
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
        value != null ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-100',
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
  showCalculation,
  showMandatory,
  sortActive,
  yesLabel,
  noLabel,
  unknownFactorLabel,
  toggleHint,
}: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tf.factorId,
    disabled: sortActive,
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
      <td
        className={clsx('py-3 px-2 text-center', sortActive ? 'cursor-not-allowed' : 'cursor-grab')}
        {...(sortActive ? {} : attributes)}
        {...(sortActive ? {} : listeners)}
      >
        <Icon
          name="grip-vertical"
          style="solid"
          className={clsx('size-4', sortActive ? 'text-gray-200' : 'text-gray-400')}
        />
      </td>
      <td className="py-3 px-4 text-sm text-gray-500 text-center">{tf.displaySequence}</td>
      <td className="py-3 px-4 text-sm font-mono text-gray-700">{factorInfo?.factorCode ?? '-'}</td>
      <td className="py-3 px-4 text-sm text-gray-900">
        {getTranslatedFactorName(factorInfo?.translations, language) || unknownFactorLabel}
      </td>
      {showMandatory && (
        <td className="py-3 px-4 text-center">
          {onToggleMandatory ? (
            <button
              type="button"
              disabled={isUpdating}
              title={toggleHint}
              onClick={() => onToggleMandatory(tf.factorId, !tf.isMandatory)}
              className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ring-1 ring-inset ring-transparent hover:ring-current',
                tf.isMandatory
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                isUpdating && 'opacity-50 cursor-not-allowed',
              )}
            >
              {tf.isMandatory ? yesLabel : noLabel}
            </button>
          ) : (
            <span
              className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                tf.isMandatory ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500',
              )}
            >
              {tf.isMandatory ? yesLabel : noLabel}
            </span>
          )}
        </td>
      )}
      {showCalculation && (
        <td className="py-3 px-4 text-center">
          {onToggleCalculation ? (
            <button
              type="button"
              disabled={isUpdating}
              title={toggleHint}
              onClick={() => onToggleCalculation(tf.factorId, !tf.isCalculationFactor)}
              className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ring-1 ring-inset ring-transparent hover:ring-current',
                tf.isCalculationFactor
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                isUpdating && 'opacity-50 cursor-not-allowed',
              )}
            >
              {tf.isCalculationFactor ? yesLabel : noLabel}
            </button>
          ) : (
            <span
              className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                tf.isCalculationFactor ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500',
              )}
            >
              {tf.isCalculationFactor ? yesLabel : noLabel}
            </span>
          )}
        </td>
      )}
      {showDefaultWeight && (
        <>
          <td className="py-3 px-4 text-center">
            {onUpdateDefaults && tf.isCalculationFactor ? (
              <InlineNumberInput
                value={tf.defaultWeight}
                disabled={isUpdating}
                onCommit={w => onUpdateDefaults(tf.factorId, w, tf.defaultIntensity ?? null)}
              />
            ) : (
              <span className="text-sm text-gray-600">
                {tf.isCalculationFactor && tf.defaultWeight != null ? tf.defaultWeight : '-'}
              </span>
            )}
          </td>
          <td className="py-3 px-4 text-center">
            {onUpdateDefaults && tf.isCalculationFactor ? (
              <InlineNumberInput
                value={tf.defaultIntensity}
                disabled={isUpdating}
                onCommit={i => onUpdateDefaults(tf.factorId, tf.defaultWeight ?? null, i)}
              />
            ) : (
              <span className="text-sm text-gray-600">
                {tf.isCalculationFactor && tf.defaultIntensity != null ? tf.defaultIntensity : '-'}
              </span>
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
  showCalculation = true,
  showMandatory = true,
}: TemplateFactorManagerProps) => {
  const { t } = useTranslation('templateManagement');
  const language = useLocaleStore(s => s.language);
  const [showModal, setShowModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const factorMap = useMemo(() => new Map(allFactors.map(f => [f.id, f])), [allFactors]);
  const assignedFactorIds = factors.map(f => f.factorId);

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

  // Column sort follows the listing table: three-stage cycle where "unsorted" falls back to the
  // manual drag order (displaySequence). Drag-reorder is disabled while a sort is active.
  const [sortKey, setSortKey] = useState<FactorSortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: FactorSortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir('asc');
    }
  };

  const displayFactors = useMemo(() => {
    if (sortKey == null) return sortedFactors;
    const codeOf = (tf: TemplateFactor) => factorMap.get(tf.factorId)?.factorCode ?? '';
    const nameOf = (tf: TemplateFactor) =>
      getTranslatedFactorName(factorMap.get(tf.factorId)?.translations, language);
    return [...sortedFactors].sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case 'code':
          cmp = codeOf(a).localeCompare(codeOf(b));
          break;
        case 'name':
          cmp = nameOf(a).localeCompare(nameOf(b));
          break;
        case 'mandatory':
          cmp = Number(a.isMandatory) - Number(b.isMandatory);
          break;
        case 'calculation':
          cmp = Number(a.isCalculationFactor ?? false) - Number(b.isCalculationFactor ?? false);
          break;
        case 'weight':
          cmp = (a.defaultWeight ?? 0) - (b.defaultWeight ?? 0);
          break;
        case 'intensity':
          cmp = (a.defaultIntensity ?? 0) - (b.defaultIntensity ?? 0);
          break;
        case 'seq':
        default:
          cmp = a.displaySequence - b.displaySequence;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sortedFactors, sortKey, sortDir, language, factorMap]);

  const sortActive = sortKey !== null;

  const sortableHeader = (
    key: FactorSortKey,
    label: string,
    align: 'left' | 'center',
    widthClass?: string,
  ) => {
    const isActive = sortKey === key;
    return (
      <th
        className={clsx(
          'px-4 py-3 text-xs font-semibold text-gray-500',
          align === 'center' ? 'text-center' : 'text-left',
          widthClass,
        )}
        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => handleSort(key)}
          className={clsx(
            'group inline-flex items-center gap-1 select-none transition-colors hover:text-gray-700',
            align === 'center' && 'justify-center',
            isActive && 'text-primary',
          )}
        >
          <span>{label}</span>
          <Icon
            style="solid"
            name={isActive ? (sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
            className={clsx(
              'size-2.5',
              isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500',
            )}
          />
        </button>
      </th>
    );
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedFactors.findIndex(f => f.factorId === active.id);
    const newIndex = sortedFactors.findIndex(f => f.factorId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedFactors, oldIndex, newIndex).map((f, i) => ({
      ...f,
      displaySequence: i + 1,
    }));

    setLocalOrder(reordered);
    onReorder?.(reordered);
  };

  const activeFactor = activeId ? sortedFactors.find(f => f.factorId === activeId) : null;
  const activeFactorInfo = activeFactor ? factorMap.get(activeFactor.factorId) : null;

  const yesLabel = t('factorManager.yes');
  const noLabel = t('factorManager.no');
  const unknownFactorLabel = t('factorManager.unknownFactor');
  const toggleHint = t('factorManager.toggleHint');

  return (
    <div>
      <SectionHeader
        title={t('factorManager.sectionTitle')}
        subtitle={t('factorManager.sectionSubtitle', { n: factors.length })}
        icon="layer-group"
        iconColor="purple"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            {t('factorManager.addFactorButton')}
          </Button>
        }
      />

      {sortedFactors.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <Icon name="circle-info" style="regular" className="size-3.5 text-gray-300" />
          {t('factorManager.interactionHint')}
        </p>
      )}

      {sortedFactors.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg mt-3">
          <Icon name="layer-group" style="regular" className="size-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">{t('factorManager.emptyTitle')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('factorManager.emptyHint')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-2 py-3 text-xs font-semibold text-gray-500 text-center w-10" />
                  {sortableHeader('seq', t('factorManager.columns.seq'), 'center', 'w-16')}
                  {sortableHeader('code', t('factorManager.columns.code'), 'left')}
                  {sortableHeader('name', t('factorManager.columns.name'), 'left')}
                  {showMandatory &&
                    sortableHeader('mandatory', t('factorManager.columns.mandatory'), 'center')}
                  {showCalculation &&
                    sortableHeader('calculation', t('factorManager.columns.calculation'), 'center')}
                  {showDefaultWeight && (
                    <>
                      {sortableHeader('weight', t('factorManager.columns.defaultWeight'), 'center')}
                      {sortableHeader(
                        'intensity',
                        t('factorManager.columns.defaultIntensity'),
                        'center',
                      )}
                    </>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center w-20">
                    {t('factorManager.columns.action')}
                  </th>
                </tr>
              </thead>
              <SortableContext
                items={displayFactors.map(f => f.factorId)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {displayFactors.map(tf => (
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
                      showCalculation={showCalculation}
                      showMandatory={showMandatory}
                      sortActive={sortActive}
                      yesLabel={yesLabel}
                      noLabel={noLabel}
                      unknownFactorLabel={unknownFactorLabel}
                      toggleHint={toggleHint}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
            <DragOverlay>
              {activeFactor ? (
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="bg-white shadow-lg rounded-lg border border-primary/20">
                      <td className="py-3 px-2 text-center">
                        <Icon name="grip-vertical" style="solid" className="size-4 text-gray-400" />
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 text-center">
                        {activeFactor.displaySequence}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-gray-700">
                        {activeFactorInfo?.factorCode ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {getTranslatedFactorName(activeFactorInfo?.translations, language) ||
                          unknownFactorLabel}
                      </td>
                      {showMandatory && (
                        <td className="py-3 px-4 text-center">
                          <span
                            className={clsx(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              activeFactor.isMandatory
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-500',
                            )}
                          >
                            {activeFactor.isMandatory ? yesLabel : noLabel}
                          </span>
                        </td>
                      )}
                      {showCalculation && (
                        <td className="py-3 px-4 text-center">
                          <span
                            className={clsx(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              activeFactor.isCalculationFactor
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-500',
                            )}
                          >
                            {activeFactor.isCalculationFactor ? yesLabel : noLabel}
                          </span>
                        </td>
                      )}
                      {showDefaultWeight && (
                        <>
                          <td className="py-3 px-4 text-sm text-gray-600 text-center">
                            {activeFactor.defaultWeight != null ? activeFactor.defaultWeight : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 text-center">
                            {activeFactor.defaultIntensity != null
                              ? activeFactor.defaultIntensity
                              : '-'}
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
        onAdd={selections => {
          onAddFactor(selections);
          setShowModal(false);
        }}
        isAdding={isAdding}
        showCalculation={showCalculation}
        showMandatory={showMandatory}
      />
    </div>
  );
};

export default TemplateFactorManager;
