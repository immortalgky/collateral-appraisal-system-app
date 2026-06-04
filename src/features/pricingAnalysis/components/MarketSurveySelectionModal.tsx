import Button from '@/shared/components/Button';
import Modal from '@shared/components/Modal';
import { useTranslation } from 'react-i18next';
import Pagination from '@shared/components/Pagination';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ServerDataCtx } from '@features/pricingAnalysis/store/selectionContext';
import type { MarketComparableDetailType } from '../schemas';
import { useLocaleStore } from '@shared/store';
import { SurveySelectionTable } from './SurveySelectionTable';
import { SurveySelectionMap, type SubjectPin } from './SurveySelectionMap';

interface MarketSurveySelectionModalProps {
  isOpen: boolean;
  surveys: MarketComparableDetailType[];
  comparativeSurveys: MarketComparableDetailType[];
  onSelect: (survey: MarketComparableDetailType[]) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

export const MarketSurveySelectionModal = ({
  isOpen,
  surveys,
  comparativeSurveys,
  onSelect,
  onCancel,
  readOnly,
}: MarketSurveySelectionModalProps) => {
  const { t } = useTranslation('pricingAnalysis');
  const serverData = useContext(ServerDataCtx);
  const language = useLocaleStore(s => s.language);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  // Hovered survey id — shared between map and table for cross-highlight (emphasis).
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Pan target — set ONLY by table-row hover so the map scrolls to that pin
  // (hovering a pin must NOT move the map).
  const [panToId, setPanToId] = useState<string | null>(null);

  // Subject collateral pins — ALL of this group's properties that have coords
  // (land/condo; for LB the coords come from the land). Built from the group
  // detail so it's robust to how each method picks its single subject property.
  const groupProperties = serverData?.groupDetail?.properties;
  const propertiesMap = serverData?.propertiesMap;

  // Single source for the group's subject collateral, with a shared stable id so
  // the table row and the map pin cross-highlight/pan correctly. `property` is the
  // enriched detail (via propertiesMap) used to resolve per-factor subject values.
  const groupSubjects = useMemo(
    () =>
      [...(groupProperties ?? [])]
        .sort((a, b) => (a.sequenceInGroup ?? 0) - (b.sequenceInGroup ?? 0))
        .map((p, i) => ({
          id: p.propertyId ?? `subject-${i}`,
          label: p.propertyName || p.propertyType || 'Subject collateral',
          lat: Number(p.latitude),
          lon: Number(p.longitude),
          property: (p.propertyId ? propertiesMap?.[p.propertyId] : undefined) ?? {},
        })),
    [groupProperties, propertiesMap],
  );

  // Map pins — only subjects with real coordinates.
  const subjectPins = useMemo<SubjectPin[]>(
    () =>
      groupSubjects.flatMap(s =>
        Number.isFinite(s.lat) && Number.isFinite(s.lon) && !(s.lat === 0 && s.lon === 0)
          ? [{ id: s.id, lat: s.lat, lon: s.lon, label: s.label }]
          : [],
      ),
    [groupSubjects],
  );

  // Table rows — all group properties (shown at top, with resolved factor values).
  const subjectRows = useMemo(
    () => groupSubjects.map(s => ({ id: s.id, label: s.label, property: s.property })),
    [groupSubjects],
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(comparativeSurveys.map(s => s.id).filter((id): id is string => !!id)));
      setPage(0);
    }
  }, [isOpen]);

  // Build union of all factor codes across all surveys
  const factorColumns = useMemo(() => {
    const codeMap = new Map<string, { factorCode: string }>();
    for (const survey of surveys ?? []) {
      for (const f of survey.factorData ?? []) {
        const code = f.factorCode;
        if (code && !codeMap.has(code)) {
          codeMap.set(code, { factorCode: code });
        }
      }
    }
    return Array.from(codeMap.values()).sort((a, b) => a.factorCode.localeCompare(b.factorCode));
  }, [surveys]);

  // Client-side pagination
  const totalCount = (surveys ?? []).length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedSurveys = (surveys ?? []).slice(page * pageSize, (page + 1) * pageSize);

  // Validate total number of surveys must at least minimum survey.
  const minimunSelection = 3;
  const belowMinimumSelection = selectedIds.size < minimunSelection;

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = (checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const s of paginatedSurveys) {
        if (!s.id) continue; // never track a phantom empty-string id
        if (checked) {
          next.add(s.id);
        } else {
          next.delete(s.id);
        }
      }
      return next;
    });
  };

  const handleSave = () => {
    if (belowMinimumSelection) {
      return;
    }
    onSelect((surveys ?? []).filter(s => selectedIds.has(s.id ?? '')));
    onCancel();
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleClear = () => {
    setSelectedIds(new Set());
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={t('surveySelection.title')} size="3xl">
      <div className="flex h-[70vh] gap-4">
        {/* Map — left panel. Shows ALL surveys (table is paginated); click a pin to (de)select. */}
        <SurveySelectionMap
          className="w-2/5 shrink-0"
          surveys={surveys ?? []}
          selectedIds={selectedIds}
          onToggle={readOnly ? () => {} : handleToggle}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          panToId={panToId}
          subjectPins={subjectPins}
          readOnly={readOnly}
        />

        {/* Table + pagination — right panel */}
        <div className="flex-1 flex flex-col min-w-0 border border-gray-200 rounded-lg overflow-hidden">
          <SurveySelectionTable
            surveys={paginatedSurveys}
            factorColumns={factorColumns}
            selectedIds={selectedIds}
            onToggle={readOnly ? () => {} : handleToggle}
            onToggleAll={readOnly ? () => {} : handleToggleAll}
            allFactors={serverData?.allFactors ?? []}
            language={language}
            hoveredId={hoveredId}
            onRowHover={id => {
              setHoveredId(id);
              setPanToId(id);
            }}
            subjectRows={subjectRows}
          />
          {totalCount > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              showPageSizeSelector
              showItemCount
            />
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex justify-between gap-2 border-t border-gray-200 pt-4">
        <div className="flex gap-2">
          <Button variant="ghost" type="button" onClick={handleCancel}>
            {t('surveySelection.cancel')}
          </Button>
          {!readOnly && (
            <Button variant="ghost" type="button" onClick={handleClear}>
              {t('footer.cancel')}
            </Button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {!readOnly && belowMinimumSelection && (
            <span className="text-danger">
              {t('surveySelection.selected', { count: minimunSelection })}
            </span>
          )}
          {!readOnly && (
            <Button
              variant="primary"
              type="button"
              onClick={handleSave}
              disabled={belowMinimumSelection}
            >
              {t('surveySelection.confirm')} ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
