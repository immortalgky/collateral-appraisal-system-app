import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { useAppraisalId, useAppraisalContext } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';

import {
  useGetProjectUnits,
  useGetProjectUnitUploads,
  useUploadProjectUnits,
  useUploadReappraisalUnits,
  useReappraisalPreview,
} from '../../api/projectUnit';
import type { ReappraisalPreviewResult } from '../../api/projectUnit';
import { useGetUnitPriceSource } from '../../api/projectUnitPrice';
import {
  checkXlsx,
  MAX_REAPPRAISAL_XLSX_UPLOAD_MB,
  MAX_XLSX_UPLOAD_MB,
} from '../../utils/xlsxUpload';
import UnitVerificationDialog from '../UnitVerificationDialog';
import {
  CondoUnitFilters,
  CondoUnitImportRow,
  CondoUnitTable,
  type SaleFilter,
} from '../condo/unitsPrice/CondoUnitListingParts';
import { isCondo } from '../../types';
import type { ProjectType, ProjectUnit, ProjectUnitUpload } from '../../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };

// ── Upload history ────────────────────────────────────────────────────────────

// Read-only on purpose. Deleting a batch used to remove its units, which is a real undo only
// for the very first upload of a new project — in a reappraisal the units come from the
// collateral master, and the batch that owns them is the seed. Removing it took the whole
// inventory with the sale state, prices and AS400 ids that no workbook carries. Deleting a
// re-match batch was no better: it dropped the rows the file added but left the units it had
// marked sold and the prices it had overwritten, so the button promised an undo it could not
// deliver. The history is a record of what happened, nothing more.

/**
 * One line saying what a batch did to the project.
 *
 * The re-match counters are null for anything that is not a re-match, and for rows written
 * before the server started recording them — "not recorded" and "changed nothing" are different
 * answers and are not collapsed into one.
 */
function useUploadOutcome() {
  const { t } = useTranslation('blockProject');

  return (upload: ProjectUnitUpload): string => {
    const isRematch = upload.autoSoldUnits !== null && upload.autoSoldUnits !== undefined;

    if (!isRematch) {
      if (upload.addedUnits > 0)
        return t('unitListing.outcome.imported', { count: upload.addedUnits });
      return t('unitListing.outcome.notRecorded');
    }

    const parts: string[] = [];
    if (upload.autoSoldUnits)
      parts.push(t('unitListing.outcome.autoSold', { count: upload.autoSoldUnits }));
    if (upload.updatedUnits)
      parts.push(t('unitListing.outcome.updated', { count: upload.updatedUnits }));
    if (upload.addedUnits) parts.push(t('unitListing.outcome.added', { count: upload.addedUnits }));
    return parts.length > 0 ? parts.join(' · ') : t('unitListing.outcome.noChange');
  };
}

function UploadHistoryList({
  uploads,
  isLoading,
}: {
  uploads: ProjectUnitUpload[];
  isLoading: boolean;
}) {
  const { t, i18n } = useTranslation('blockProject');
  const describe = useUploadOutcome();

  if (isLoading) {
    return (
      <div className="space-y-2 px-4 py-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-(--palette-surface-3) rounded animate-pulse" />
        ))}
      </div>
    );
  }
  if (uploads.length === 0)
    return (
      <p className="text-xs text-(--palette-gray-400) text-center py-6">
        {t('unitListing.noUploadHistory')}
      </p>
    );

  return (
    <ul className="divide-y divide-(--palette-line-soft)">
      {uploads.map(upload => (
        <li
          key={upload.id}
          className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-1 items-center px-4 py-2.5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={clsx(
                'truncate text-xs',
                upload.isSystemGenerated
                  ? 'text-(--palette-gray-500) italic'
                  : 'text-(--palette-ink)',
              )}
              title={upload.fileName}
            >
              {upload.fileName}
            </span>
            {upload.isSystemGenerated && (
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-(--palette-surface-3) text-(--palette-gray-500)">
                {t('unitListing.systemBatch')}
              </span>
            )}
            {upload.isUsed && (
              <Badge type="status" value="completed">
                {t('unitListing.cols.used')}
              </Badge>
            )}
          </div>
          <span className="text-xs text-(--palette-gray-500) whitespace-nowrap">
            {describe(upload)}
          </span>
          <span className="text-xs text-(--palette-gray-400) whitespace-nowrap tabular-nums">
            {formatLocaleDateTime(upload.uploadedAt, i18n.language)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface UnitListingTabProps {
  projectType: ProjectType;
}

/**
 * The unit listing of every project type: Condo (tower and room), Land and Building (plot and
 * house) and Land and Building (Construction) (L, plot only), on the same import row, filters and table. The column set and
 * the filters follow `projectType`; upload and history are identical.
 *
 * Divergences from originals:
 * - Accepts .xlsx only, up to 5 MB, like the backend (ProjectExcelUpload).
 */
export default function UnitListingTab({ projectType }: UnitListingTabProps) {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId();
  const readOnly = usePageReadOnly();
  const { appraisal } = useAppraisalContext();
  const isReappraisal = appraisal?.appraisalType === 'ReAppraisal';

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [saleFilter, setSaleFilter] = useState<SaleFilter>('all');
  const [towerFilter, setTowerFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [query, setQuery] = useState('');
  const condo = isCondo(projectType);
  const village = projectType === 'LB';

  const {
    data: unitsData,
    isLoading: unitsLoading,
    isError: unitsError,
    isFetching: unitsFetching,
  } = useGetProjectUnits(appraisalId ?? '');
  const { data: uploadsData, isLoading: uploadsLoading } = useGetProjectUnitUploads(
    appraisalId ?? '',
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // A new unit list cascades away every unit price, so the replace-confirm must say so. Until the
  // count is known (loading, refreshing or failed, even if a cached count exists) assume there are prices: the stronger warning is the safe one.
  const {
    data: priceSource,
    isFetching: priceSourceFetching,
    isError: priceSourceFailed,
  } = useGetUnitPriceSource(appraisalId ?? '', {
    enabled: pendingFile !== null,
    alwaysRefetch: true,
  });
  const mayHaveStoredPrices =
    !priceSource || priceSourceFetching || priceSourceFailed || priceSource.pricedUnitCount > 0;
  const { mutate: uploadUnits, isPending: isUploading } = useUploadProjectUnits();
  const { mutate: uploadReappraisalUnits, isPending: isReappraisalUploading } =
    useUploadReappraisalUnits();
  const { mutate: previewReappraisal, isPending: isPreviewing } = useReappraisalPreview();
  // The replace-confirm (and its price-clear warning) is decided from the loaded unit list, so no
  // file is accepted before that is known, nor while the price source behind the warning is fetching.
  // Fetching counts too: a cached (possibly empty) list is not what the confirm should decide on.
  const unitsUnknown = unitsLoading || unitsFetching || (unitsError && unitsData === undefined);
  const isUploadBusy = isUploading || isPreviewing || isReappraisalUploading;
  const uploadBlocked =
    readOnly || isUploadBusy || unitsUnknown || (pendingFile !== null && priceSourceFetching);

  const units = unitsData?.units ?? [];
  const uploads = uploadsData ?? [];

  useEffect(() => {
    setPageNumber(prev => {
      const totalPages = Math.max(1, Math.ceil(units.length / pageSize));
      return Math.min(prev, totalPages - 1);
    });
  }, [unitsData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (pageNumber: number) => {
    setPageNumber(pageNumber);
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPageSize(pageSize);
    setPageNumber(0);
  };

  const handleSaleFilterChange = (key: SaleFilter) => {
    setSaleFilter(key);
    setPageNumber(0);
  };

  const handleTowerFilterChange = (v: string) => {
    setTowerFilter(v);
    // Model and floor options are about to be re-scoped to the new tower — a model or floor
    // chosen under the old tower (or "all towers") may no longer be valid.
    setModelFilter('');
    setFloorFilter('');
    setPageNumber(0);
  };

  const handleFloorFilterChange = (v: string) => {
    setFloorFilter(v);
    setPageNumber(0);
  };

  const handleModelFilterChange = (v: string) => {
    setModelFilter(v);
    setPageNumber(0);
  };

  const handleQueryChange = (v: string) => {
    setQuery(v);
    setPageNumber(0);
  };

  const [historyOpen, setHistoryOpen] = useState(false);
  const [verificationState, setVerificationState] = useState<{
    file: File;
    result: ReappraisalPreviewResult;
  } | null>(null);

  const doUpload = (file: File) => {
    if (!appraisalId) return;
    uploadUnits(
      { appraisalId, file },
      {
        onSuccess: () => toast.success(t('toasts.units.importSuccess')),
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.units.uploadFailed'));
        },
      },
    );
  };

  /** The message for a file that must not go any further, or null. */
  const validateFile = (file: File, maxMb: number): string | null => {
    const problem = checkXlsx(file, maxMb);
    if (problem === 'invalidType') {
      return t('toasts.units.invalidFileType', { extensions: '.xlsx' });
    }
    return problem === 'tooLarge' ? t('toasts.units.fileTooLarge', { max: maxMb }) : null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (readOnly || !file || !appraisalId) return;

    // Clear the input so picking the same file again fires another change event. The UploadArea
    // this replaced reset the value on every click; without it, cancelling the replace-confirm
    // dialog (or hitting a validation toast) leaves the button looking dead for that same file.
    e.target.value = '';

    const validationError = validateFile(file, MAX_XLSX_UPLOAD_MB);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (units.length > 0) {
      setPendingFile(file);
    } else {
      doUpload(file);
    }
  };

  const handleConfirmReupload = () => {
    if (pendingFile) doUpload(pendingFile);
    setPendingFile(null);
  };

  const handleReappraisalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (readOnly || !file || !appraisalId) return;

    // Reset the input so re-selecting the same file re-triggers the change event
    e.target.value = '';

    const validationError = validateFile(file, MAX_REAPPRAISAL_XLSX_UPLOAD_MB);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    previewReappraisal(
      { appraisalId, file },
      {
        onSuccess: result => {
          setVerificationState({ file, result });
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.units.uploadFailed'));
        },
      },
    );
  };

  const handleVerificationApply = (confirmUpdates: boolean) => {
    if (!verificationState || !appraisalId) return;
    uploadReappraisalUnits(
      { appraisalId, file: verificationState.file, confirmUpdates },
      {
        onSuccess: () => {
          toast.success(t('unitVerification.applySuccess'));
          setVerificationState(null);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.units.uploadFailed'));
        },
      },
    );
  };

  const handleVerificationClose = () => {
    setVerificationState(null);
  };

  const latestUpload = uploads[0];
  const describeUpload = useUploadOutcome();

  const towerOptions = condo
    ? Array.from(new Set(units.map(u => u.towerName).filter((v): v is string => Boolean(v)))).sort()
    : [];

  const unitsInTower = towerFilter ? units.filter(u => u.towerName === towerFilter) : units;
  const modelOptions = towerFilter
    ? Array.from(
        new Set(unitsInTower.map(u => u.modelType).filter((v): v is string => Boolean(v))),
      ).sort()
    : (unitsData?.models ?? []);
  const floorOptions = condo
    ? Array.from(
        new Set(unitsInTower.map(u => u.floor).filter((v): v is number => v != null)),
      ).sort((a, b) => a - b)
    : [];

  // Trimmed before the emptiness test: a query of only spaces used to survive it, and matching on
  // '' then dropped every unit whose plot, house, room and tower are all null.
  const trimmedQuery = query.trim().toLowerCase();

  // Model, floor and search: the filters that scope both the group chips' counts and the table.
  // Land and Building counts its model chips within everything but the model, so `skipModel`.
  const inScope = (u: ProjectUnit, skipModel = false) => {
    if (!skipModel && modelFilter && u.modelType !== modelFilter) return false;
    if (floorFilter && String(u.floor) !== floorFilter) return false;
    if (!trimmedQuery) return true;
    const fields = condo
      ? [u.roomNumber, u.towerName, u.condoRegistrationNumber, u.modelType, u.floor?.toString()]
      : [u.plotNumber, u.houseNumber];
    return fields.some(v => v?.toLowerCase().includes(trimmedQuery));
  };
  const matchesSale = (u: ProjectUnit) =>
    saleFilter === 'all' || (saleFilter === 'sold') === u.isSold;

  // Everything except the sale filter. The status chips count within this so their numbers agree
  // with the table; the table then applies the sale filter on top.
  const narrowedUnits = units.filter(
    u => (!towerFilter || u.towerName === towerFilter) && inScope(u),
  );

  const visibleUnits = narrowedUnits.filter(matchesSale);

  // Client-side pagination over the filtered result — the table only ever renders this page's
  // slice, regardless of how many units the project has.
  const pagedUnits = visibleUnits.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize);
  const totalPages = Math.ceil(visibleUnits.length / pageSize);

  // Condo tower chips count within every other filter (not the tower one), like the status chips.
  const towers = towerOptions.map(name => ({
    name,
    count: units.filter(u => u.towerName === name && inScope(u) && matchesSale(u)).length,
  }));
  // Land and Building model chips, the same way.
  const models = village
    ? modelOptions.map(name => ({
        name,
        count: units.filter(u => u.modelType === name && inScope(u, true) && matchesSale(u)).length,
      }))
    : [];
  const saleCounts = {
    all: narrowedUnits.length,
    available: narrowedUnits.filter(u => !u.isSold).length,
    sold: narrowedUnits.filter(u => u.isSold).length,
  };

  // The Button is the one tab stop and keyboard target; it opens the hidden input, which stays out
  // of the tab order.
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadInput = (
    <input
      ref={uploadInputRef}
      type="file"
      accept=".xlsx"
      className="sr-only"
      aria-label={t(isReappraisal ? 'unitListing.reappraisal.action' : 'unitListing.importUnits')}
      tabIndex={-1}
      disabled={uploadBlocked}
      onChange={isReappraisal ? handleReappraisalFileChange : handleFileChange}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <CondoUnitImportRow
        readOnly={readOnly}
        isReappraisal={isReappraisal}
        uploadBlocked={uploadBlocked}
        isUploadBusy={isUploadBusy}
        uploadInput={uploadInput}
        onChooseFile={() => uploadInputRef.current?.click()}
        latest={
          latestUpload && {
            fileName: latestUpload.fileName,
            outcome: describeUpload(latestUpload),
            uploadedAt: latestUpload.uploadedAt,
          }
        }
        uploadCount={uploads.length}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen(v => !v)}
        history={<UploadHistoryList uploads={uploads} isLoading={uploadsLoading} />}
      />

      {/* The list-page table box (DESIGN.md section 8). */}
      <div className="flex min-h-[24rem] flex-1 flex-col overflow-hidden rounded-lg border border-(--palette-line) bg-(--palette-surface)">
        {units.length > 0 && (
          <CondoUnitFilters
            projectType={projectType}
            saleFilter={saleFilter}
            saleCounts={saleCounts}
            onSaleFilter={handleSaleFilterChange}
            towers={towers}
            towerFilter={towerFilter}
            towerAllCount={units.filter(u => inScope(u) && matchesSale(u)).length}
            onTowerFilter={handleTowerFilterChange}
            modelOptions={modelOptions}
            models={models}
            modelAllCount={units.filter(u => inScope(u, true) && matchesSale(u)).length}
            modelFilter={modelFilter}
            onModelFilter={handleModelFilterChange}
            floorOptions={floorOptions}
            floorFilter={floorFilter}
            onFloorFilter={handleFloorFilterChange}
            query={query}
            onQuery={handleQueryChange}
            shown={visibleUnits.length}
            total={units.length}
          />
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          {unitsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 animate-pulse rounded bg-(--palette-surface-3)" />
              ))}
            </div>
          ) : units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-(--palette-ink-2)">
              <Icon name="table-list" className="mb-2 text-3xl" />
              <p className="text-sm">{t('unitListing.noUnits')}</p>
            </div>
          ) : visibleUnits.length === 0 ? (
            <p className="py-10 text-center text-sm text-(--palette-gray-400)">
              {t('unitListing.noMatch')}
            </p>
          ) : (
            <CondoUnitTable
              projectType={projectType}
              units={pagedUnits}
              filteredCount={visibleUnits.length}
              totalLand={visibleUnits.reduce((sum, u) => sum + (u.landArea ?? 0), 0)}
              totalArea={visibleUnits.reduce((sum, u) => sum + (u.usableArea ?? 0), 0)}
              totalPrice={visibleUnits.reduce((sum, u) => sum + (u.sellingPrice ?? 0), 0)}
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingFile !== null}
        onClose={() => setPendingFile(null)}
        onConfirm={handleConfirmReupload}
        title={t('unitListing.confirmReplace.title')}
        message={t(
          mayHaveStoredPrices
            ? 'unitListing.confirmReplace.messageWithPrices'
            : 'unitListing.confirmReplace.message',
        )}
        confirmText={t('unitListing.confirmReplace.confirm')}
        variant="warning"
        isLoading={isUploading}
      />

      {verificationState && (
        <UnitVerificationDialog
          isOpen={true}
          onClose={handleVerificationClose}
          onApply={handleVerificationApply}
          result={verificationState.result}
          projectType={projectType}
          isApplying={isReappraisalUploading}
        />
      )}
    </div>
  );
}
