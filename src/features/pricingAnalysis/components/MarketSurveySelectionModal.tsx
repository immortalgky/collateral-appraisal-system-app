import Button from '@/shared/components/Button';
import Modal from '@shared/components/Modal';
import Pagination from '@shared/components/Pagination';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ServerDataCtx } from '@features/pricingAnalysis/store/selectionContext';
import type { MarketComparableDetailType } from '../schemas';
import { useLocaleStore } from '@shared/store';
import { SurveySelectionTable } from './SurveySelectionTable';
import { MapPlaceholder } from './MapPlaceholder';

interface MarketSurveySelectionModalProps {
  isOpen: boolean;
  surveys: MarketComparableDetailType[];
  comparativeSurveys: MarketComparableDetailType[];
  onSelect: (survey: MarketComparableDetailType[]) => void;
  onCancel: () => void;
}

export const MarketSurveySelectionModal = ({
  isOpen,
  surveys,
  comparativeSurveys,
  onSelect,
  onCancel,
}: MarketSurveySelectionModalProps) => {
  const serverData = useContext(ServerDataCtx);
  const language = useLocaleStore(s => s.language);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(
        new Set(comparativeSurveys.map(s => s.id).filter((id): id is string => !!id)),
      );
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
    return Array.from(codeMap.values()).sort((a, b) =>
      a.factorCode.localeCompare(b.factorCode),
    );
  }, [surveys]);

  // Client-side pagination
  const totalCount = (surveys ?? []).length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedSurveys = (surveys ?? []).slice(
    page * pageSize,
    (page + 1) * pageSize,
  );

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
        const sid = s.id ?? '';
        if (checked) {
          next.add(sid);
        } else {
          next.delete(sid);
        }
      }
      return next;
    });
  };

  const handleSave = () => {
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
    <Modal isOpen={isOpen} onClose={handleCancel} title="Select Comparative Data" size="3xl">
      <div className="flex h-[70vh] gap-4">
        {/* Map placeholder — left panel */}
        <MapPlaceholder className="w-2/5 shrink-0" />

        {/* Table + pagination — right panel */}
        <div className="flex-1 flex flex-col min-w-0 border border-gray-200 rounded-lg overflow-hidden">
          <SurveySelectionTable
            surveys={paginatedSurveys}
            factorColumns={factorColumns}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
            allFactors={serverData?.allFactors ?? []}
            language={language}
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
            Cancel
          </Button>
          <Button variant="ghost" type="button" onClick={handleClear}>
            Clear
          </Button>
        </div>
        <Button variant="primary" type="button" onClick={handleSave}>
          Add ({selectedIds.size})
        </Button>
      </div>
    </Modal>
  );
};
