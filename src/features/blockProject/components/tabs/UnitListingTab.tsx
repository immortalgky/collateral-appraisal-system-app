import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { useAppraisalId, useAppraisalContext } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import Dropdown from '@/shared/components/inputs/Dropdown';
import TextInput from '@/shared/components/inputs/TextInput';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

import {
  useGetProjectUnits,
  useGetProjectUnitUploads,
  useUploadProjectUnits,
  useUploadReappraisalUnits,
  useReappraisalPreview,
} from '../../api/projectUnit';
import type { ReappraisalPreviewResult } from '../../api/projectUnit';
import UnitVerificationDialog from '../UnitVerificationDialog';
import { isCondo } from '../../types';
import type { ProjectType, ProjectUnit, ProjectUnitUpload } from '../../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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
  const { t } = useTranslation('blockProject');
  const describe = useUploadOutcome();

  if (isLoading) {
    return (
      <div className="space-y-2 px-4 py-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }
  if (uploads.length === 0)
    return (
      <p className="text-xs text-gray-400 text-center py-6">{t('unitListing.noUploadHistory')}</p>
    );

  return (
    <ul className="divide-y divide-gray-100">
      {uploads.map(upload => (
        <li
          key={upload.id}
          className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-1 items-center px-4 py-2.5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={clsx(
                'truncate text-xs',
                upload.isSystemGenerated ? 'text-gray-500 italic' : 'text-gray-800',
              )}
              title={upload.fileName}
            >
              {upload.fileName}
            </span>
            {upload.isSystemGenerated && (
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {t('unitListing.systemBatch')}
              </span>
            )}
            {upload.isUsed && (
              <Badge type="status" value="completed">
                {t('unitListing.cols.used')}
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">{describe(upload)}</span>
          <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums">
            {new Date(upload.uploadedAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Unit Result Table ─────────────────────────────────────────────────────────
// Column definitions differ by projectType:
// Condo: Floor / Tower Name / Reg. Number / Room No. / Model Type
// LB: Plot No. / House No. / No. of Floors / Land Area / Model Name

function UnitResultTable({
  units,
  isLoading,
  projectType,
}: {
  units: ProjectUnit[];
  isLoading: boolean;
  projectType: ProjectType;
}) {
  const { t } = useTranslation('blockProject');
  // Resolved once for the table rather than once per row — the listing now renders every unit of
  // the project and re-renders on each keystroke in the search box.
  const soldLabel = t('unitListing.saleStatus.sold');
  const availableLabel = t('unitListing.saleStatus.available');

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }
  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <Icon name="table-list" className="text-3xl mb-2" />
        <p className="text-sm">{t('unitListing.noUnits')}</p>
      </div>
    );
  }

  if (isCondo(projectType)) {
    return (
      <div className="overflow-x-auto max-h-full">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitListing.cols.sqNo')}
              </th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                {t('unitListing.cols.floor')}
              </th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitListing.cols.towerName')}
              </th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitListing.cols.regNumber')}
              </th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitListing.cols.roomNo')}
              </th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitListing.cols.saleStatus')}
              </th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitListing.cols.modelType')}
              </th>
              <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitListing.cols.usableAreaSqm')}
              </th>
              <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitListing.cols.sellingPriceBaht')}
              </th>
            </tr>
          </thead>
          <tbody>
            {units.map(unit => (
              <tr
                key={unit.id}
                className={clsx(
                  'border-b border-gray-100 hover:bg-gray-50',
                  unit.isSold && 'text-gray-400 [&>td]:text-gray-400',
                )}
              >
                <td className="py-2 px-3 text-gray-600">{unit.sequenceNumber}</td>
                <td className="py-2 px-3 text-gray-800">{unit.floor ?? '-'}</td>
                <td className="py-2 px-3 text-gray-800">{unit.towerName ?? '-'}</td>
                <td className="py-2 px-3 text-gray-600">{unit.condoRegistrationNumber ?? '-'}</td>
                <td className="py-2 px-3 text-gray-800">{unit.roomNumber ?? '-'}</td>
                <td className="py-2 px-3">
                  <SaleStatusBadge
                    isSold={unit.isSold}
                    label={unit.isSold ? soldLabel : availableLabel}
                  />
                </td>
                <td className="py-2 px-3 text-gray-800">{unit.modelType ?? '-'}</td>
                <td className="py-2 px-3 text-gray-800 text-right">
                  {unit.usableArea?.toLocaleString() ?? '-'}
                </td>
                <td className="py-2 px-3 text-gray-800 text-right">
                  {unit.sellingPrice?.toLocaleString() ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // LandAndBuilding columns
  return (
    <div className="overflow-x-auto max-h-full">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitListing.cols.sqNo')}
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitListing.cols.plotNo')}
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitListing.cols.houseNo')}
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitListing.cols.saleStatus')}
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitListing.cols.modelName')}
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitListing.cols.numFloors')}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitListing.cols.landAreaSqWa')}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitListing.cols.usableAreaSqm')}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitListing.cols.sellingPriceBaht')}
            </th>
          </tr>
        </thead>
        <tbody>
          {units.map(unit => (
            <tr
              key={unit.id}
              className={clsx(
                'border-b border-gray-100 hover:bg-gray-50',
                unit.isSold && 'text-gray-400 [&>td]:text-gray-400',
              )}
            >
              <td className="py-2 px-3 text-gray-600">{unit.sequenceNumber}</td>
              <td className="py-2 px-3 text-gray-800">{unit.plotNumber ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800">{unit.houseNumber ?? '-'}</td>
              <td className="py-2 px-3">
                <SaleStatusBadge
                  isSold={unit.isSold}
                  label={unit.isSold ? soldLabel : availableLabel}
                />
              </td>
              <td className="py-2 px-3 text-gray-800">{unit.modelType ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800">{unit.numberOfFloors ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800 text-right">
                {unit.landArea?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-gray-800 text-right">
                {unit.usableArea?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-gray-800 text-right">
                {unit.sellingPrice?.toLocaleString() ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sale status ───────────────────────────────────────────────────────────────

/**
 * The listing shows every unit of the project, so each row has to say which side of the line it
 * is on. Without it a re-match upload looks like rows vanishing rather than rows being marked.
 */
function SaleStatusBadge({ isSold, label }: { isSold: boolean; label: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
        isSold ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700',
      )}
    >
      <span
        className={clsx('size-1.5 rounded-full shrink-0', isSold ? 'bg-blue-500' : 'bg-amber-500')}
      />
      {label}
    </span>
  );
}

// ── Stat strip ────────────────────────────────────────────────────────────────

function Stat({ label, value, dotColor }: { label: string; value: string; dotColor?: string }) {
  return (
    <div className="flex-1 min-w-[7rem] bg-white px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 flex items-center gap-1.5 whitespace-nowrap">
        {dotColor && <span className={clsx('size-2 rounded-full shrink-0', dotColor)} />}
        {label}
      </span>
      <span className="text-xl font-bold text-gray-900 tabular-nums tracking-tight">{value}</span>
    </div>
  );
}

/**
 * The counts used to sit under the table, so the shape of the project was only knowable after
 * scrolling past every row of it. They lead the screen now, and "total" is stated once — the
 * card header used to repeat it.
 */
function StatStrip({
  units,
  totalCount,
  remainingCount,
  projectType,
}: {
  units: ProjectUnit[];
  totalCount: number;
  remainingCount: number;
  projectType: ProjectType;
}) {
  const { t } = useTranslation('blockProject');
  const towers = new Set(units.map(u => u.towerName).filter(Boolean)).size;
  const models = new Set(units.map(u => u.modelType).filter(Boolean)).size;

  return (
    <div className="flex flex-wrap gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
      <Stat label={t('unitListing.summary.totalUnits')} value={totalCount.toLocaleString()} />
      <Stat
        label={t('unitListing.summary.remainingUnits')}
        value={remainingCount.toLocaleString()}
        dotColor="bg-amber-500"
      />
      <Stat
        label={t('unitListing.summary.soldUnits')}
        value={(totalCount - remainingCount).toLocaleString()}
        dotColor="bg-blue-500"
      />
      {isCondo(projectType) && (
        <Stat label={t('unitListing.summary.towers')} value={towers.toLocaleString()} />
      )}
      <Stat label={t('unitListing.summary.models')} value={models.toLocaleString()} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface UnitListingTabProps {
  projectType: ProjectType;
}

/**
 * Merged UnitListing tab for Condo and LandAndBuilding.
 * Column definitions branch on projectType; upload & history are identical.
 *
 * Divergences from originals:
 * - Accepts .xlsx, .xls, .csv (Condo convention) — Village only accepted .xlsx.
 */
export default function UnitListingTab({ projectType }: UnitListingTabProps) {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId();
  const readOnly = usePageReadOnly();
  const { appraisal } = useAppraisalContext();
  const isReappraisal = appraisal?.appraisalType === 'ReAppraisal';

  const { data: unitsData, isLoading: unitsLoading } = useGetProjectUnits(appraisalId ?? '');
  const { data: uploadsData, isLoading: uploadsLoading } = useGetProjectUnitUploads(
    appraisalId ?? '',
  );
  const { mutate: uploadUnits, isPending: isUploading } = useUploadProjectUnits();
  const { mutate: uploadReappraisalUnits, isPending: isReappraisalUploading } =
    useUploadReappraisalUnits();
  const { mutate: previewReappraisal, isPending: isPreviewing } = useReappraisalPreview();
  const isUploadBusy = isUploading || isPreviewing || isReappraisalUploading;

  const units = unitsData?.units ?? [];
  const uploads = uploadsData ?? [];
  const totalCount = unitsData?.totalCount ?? units.length;
  const remainingCount = unitsData?.remainingCount ?? units.filter(u => !u.isSold).length;

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saleFilter, setSaleFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [towerFilter, setTowerFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [query, setQuery] = useState('');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (readOnly || !file || !appraisalId) return;

    // Clear the input so picking the same file again fires another change event. The UploadArea
    // this replaced reset the value on every click; without it, cancelling the replace-confirm
    // dialog (or hitting a validation toast) leaves the button looking dead for that same file.
    e.target.value = '';

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    let validationError: string | null = null;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      validationError = t('toasts.units.invalidFileType', {
        extensions: ALLOWED_EXTENSIONS.join(', '),
      });
    } else if (file.size > MAX_FILE_SIZE_BYTES) {
      validationError = t('toasts.units.fileTooLarge');
    }
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

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    let validationError: string | null = null;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      validationError = t('toasts.units.invalidFileType', {
        extensions: ALLOWED_EXTENSIONS.join(', '),
      });
    } else if (file.size > MAX_FILE_SIZE_BYTES) {
      validationError = t('toasts.units.fileTooLarge');
    }
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

  const towerOptions = isCondo(projectType)
    ? Array.from(new Set(units.map(u => u.towerName).filter((v): v is string => Boolean(v)))).sort()
    : [];

  const modelOptions = towerFilter
    ? Array.from(
        new Set(
          units
            .filter(u => u.towerName === towerFilter)
            .map(u => u.modelType)
            .filter((v): v is string => Boolean(v)),
        ),
      ).sort()
    : (unitsData?.models ?? []);

  // Trimmed before the emptiness test: a query of only spaces used to survive it, and matching on
  // '' then dropped every unit whose plot, house, room and tower are all null.
  const trimmedQuery = query.trim().toLowerCase();

  // Everything except the sale filter. The status chips count within this so their numbers agree
  // with the table; the table then applies the sale filter on top.
  const narrowedUnits = units.filter(u => {
    if (towerFilter && u.towerName !== towerFilter) return false;
    if (modelFilter && u.modelType !== modelFilter) return false;
    if (!trimmedQuery) return true;
    return [u.plotNumber, u.houseNumber, u.roomNumber, u.towerName].some(v =>
      v?.toLowerCase().includes(trimmedQuery),
    );
  });

  const visibleUnits = narrowedUnits.filter(
    u => saleFilter === 'all' || (saleFilter === 'sold') === u.isSold,
  );
  const isFiltered = visibleUnits.length !== units.length;

  const uploadInput = (
    <input
      type="file"
      accept=".xlsx,.xls,.csv"
      className="sr-only"
      disabled={readOnly || isUploadBusy}
      onChange={isReappraisal ? handleReappraisalFileChange : handleFileChange}
    />
  );

  return (
    <div className="flex flex-col gap-5 h-full min-h-0 overflow-y-auto">
      <StatStrip
        units={units}
        totalCount={totalCount}
        remainingCount={remainingCount}
        projectType={projectType}
      />

      {/* Action bar. The drop zone used to stand ~300px tall for a job done a handful of times per
          project, pushing the table people actually come here for below the fold. */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <label
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              readOnly || isUploadBusy
                ? 'bg-primary/40 text-white cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90 cursor-pointer',
            )}
          >
            <Icon style="regular" name="file-arrow-up" className="size-4" />
            {isUploadBusy
              ? t('unitListing.uploading')
              : t(isReappraisal ? 'unitListing.reappraisal.action' : 'unitListing.importUnits')}
            {uploadInput}
          </label>

          {latestUpload ? (
            <p className="text-xs text-gray-500 flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0">
              <span>{t('unitListing.lastUpload')}</span>
              <span className="text-gray-700 font-medium truncate max-w-[16rem]">
                {latestUpload.fileName}
              </span>
              <span>· {describeUpload(latestUpload)}</span>
              <span className="text-gray-400">
                · {new Date(latestUpload.uploadedAt).toLocaleString()}
              </span>
            </p>
          ) : (
            <p className="text-xs text-gray-400">{t('unitListing.noUploadHistory')}</p>
          )}

          <div className="flex-1" />

          {uploads.length > 0 && (
            <button
              type="button"
              onClick={() => setHistoryOpen(v => !v)}
              aria-expanded={historyOpen}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              {historyOpen
                ? t('unitListing.hideHistory')
                : t('unitListing.showHistory', { count: uploads.length })}
            </button>
          )}
        </div>

        <p className="px-4 pb-3 text-xs text-gray-500">
          {isReappraisal ? t('unitListing.reappraisal.hint') : t('unitListing.importHint')}
        </p>

        {historyOpen && (
          <div className="border-t border-gray-100">
            <UploadHistoryList uploads={uploads} isLoading={uploadsLoading} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {units.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
            <div className="inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(['all', 'available', 'sold'] as const).map(key => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={saleFilter === key}
                  onClick={() => setSaleFilter(key)}
                  className={clsx(
                    'text-xs px-3 py-1.5 rounded-md transition-colors',
                    saleFilter === key
                      ? 'bg-white text-gray-900 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  {t(`unitListing.filter.${key}`)}
                  <span className="ms-1.5 tabular-nums opacity-60">
                    {key === 'all'
                      ? narrowedUnits.length
                      : key === 'sold'
                        ? narrowedUnits.filter(u => u.isSold).length
                        : narrowedUnits.filter(u => !u.isSold).length}
                  </span>
                </button>
              ))}
            </div>

            {towerOptions.length > 1 && (
              <div className="w-44">
                <Dropdown
                  options={towerOptions.map(tower => ({ value: tower, label: tower }))}
                  value={towerFilter}
                  onChange={v => {
                    setTowerFilter(v ?? '');
                    // Model options are about to be re-scoped to the new tower — a model chosen
                    // under the old tower (or "all towers") may no longer be valid.
                    setModelFilter('');
                  }}
                  placeholder={t('unitListing.filter.allTowers')}
                  showValuePrefix={false}
                />
              </div>
            )}

            {modelOptions.length > 1 && (
              <div className="w-44">
                <Dropdown
                  options={modelOptions.map(m => ({ value: m, label: m }))}
                  value={modelFilter}
                  onChange={v => setModelFilter(v ?? '')}
                  placeholder={t('unitListing.filter.allModels')}
                  // The model name IS the value — "Monaco - Monaco" would be noise
                  showValuePrefix={false}
                />
              </div>
            )}

            <div className="flex-1 min-w-[12rem] max-w-xs">
              <TextInput
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('unitListing.searchPlaceholder')}
                leftIcon={<Icon style="regular" name="magnifying-glass" className="size-3.5" />}
              />
            </div>

            {isFiltered && (
              <span className="text-xs text-gray-400 tabular-nums">
                {t('unitListing.shownOf', { shown: visibleUnits.length, total: units.length })}
              </span>
            )}
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          {units.length > 0 && visibleUnits.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">{t('unitListing.noMatch')}</p>
          ) : (
            <UnitResultTable
              units={visibleUnits}
              isLoading={unitsLoading}
              projectType={projectType}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingFile !== null}
        onClose={() => setPendingFile(null)}
        onConfirm={handleConfirmReupload}
        title={t('unitListing.confirmReplace.title')}
        message={t('unitListing.confirmReplace.message')}
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
