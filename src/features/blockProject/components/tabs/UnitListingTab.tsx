import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { useAppraisalId, useAppraisalContext } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import UploadArea from '@/shared/components/inputs/UploadArea';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

import {
  useGetProjectUnits,
  useGetProjectUnitUploads,
  useUploadProjectUnits,
  useUploadReappraisalUnits,
  useDeleteProjectUnitUpload,
} from '../../api/projectUnit';
import { isCondo } from '../../types';
import type { ProjectType, ProjectUnit, ProjectUnitUpload } from '../../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ── Upload History Table ──────────────────────────────────────────────────────

function UploadHistoryTable({
  uploads,
  isLoading,
  readOnly,
  onDelete,
  deletingId,
}: {
  uploads: ProjectUnitUpload[];
  isLoading: boolean;
  readOnly: boolean;
  onDelete: (upload: ProjectUnitUpload) => void;
  deletingId: string | null;
}) {
  const { t } = useTranslation('blockProject');
  if (isLoading) {
    return (
      <div className="space-y-2">
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
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-500 font-medium">
              {t('unitListing.cols.no')}
            </th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">
              {t('unitListing.cols.fileName')}
            </th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">
              {t('unitListing.cols.dateTime')}
            </th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">
              {t('unitListing.cols.status')}
            </th>
            <th className="py-2 px-3" />
          </tr>
        </thead>
        <tbody>
          {uploads.map((upload, index) => (
            <tr key={upload.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-600">{index + 1}</td>
              <td
                className="py-2 px-3 text-gray-800 max-w-[180px] truncate"
                title={upload.fileName}
              >
                {upload.fileName}
              </td>
              <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                {new Date(upload.uploadedAt).toLocaleString()}
              </td>
              <td className="py-2 px-3">
                {upload.isUsed && (
                  <Badge type="status" value="completed">
                    {t('unitListing.cols.used')}
                  </Badge>
                )}
              </td>
              <td className="py-2 px-3 text-right">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onDelete(upload)}
                    disabled={deletingId === upload.id}
                    className="text-gray-400 hover:text-danger transition-colors disabled:opacity-50"
                    title={t('unitListing.aria.deleteUpload')}
                  >
                    <Icon style="regular" name="trash" className="size-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
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
              <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-600">{unit.sequenceNumber}</td>
                <td className="py-2 px-3 text-gray-800">{unit.floor ?? '-'}</td>
                <td className="py-2 px-3 text-gray-800">{unit.towerName ?? '-'}</td>
                <td className="py-2 px-3 text-gray-600">{unit.condoRegistrationNumber ?? '-'}</td>
                <td className="py-2 px-3 text-gray-800">{unit.roomNumber ?? '-'}</td>
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
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
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
            <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-600">{unit.sequenceNumber}</td>
              <td className="py-2 px-3 text-gray-800">{unit.plotNumber ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800">{unit.houseNumber ?? '-'}</td>
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

// ── Summary Footer ────────────────────────────────────────────────────────────

function SummaryFooter({
  units,
  totalCount,
  projectType,
}: {
  units: ProjectUnit[];
  totalCount: number;
  projectType: ProjectType;
}) {
  const { t } = useTranslation('blockProject');
  const towers = new Set(units.map(u => u.towerName).filter(Boolean)).size;
  const models = new Set(units.map(u => u.modelType).filter(Boolean)).size;

  return (
    <div className="flex items-center gap-6 py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
      {isCondo(projectType) && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{t('unitListing.summary.towers')}</span>
            <span className="font-semibold text-gray-800">{towers}</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
        </>
      )}
      <div className="flex items-center gap-2">
        <span className="text-gray-500">{t('unitListing.summary.models')}</span>
        <span className="font-semibold text-gray-800">{models}</span>
      </div>
      <div className="h-4 w-px bg-gray-300" />
      <div className="flex items-center gap-2">
        <span className="text-gray-500">{t('unitListing.summary.totalUnits')}</span>
        <span className="font-semibold text-gray-800">{totalCount.toLocaleString()}</span>
      </div>
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
 * - Uses UploadArea (Condo convention) rather than the custom drop-zone (Village convention).
 * - Accepts both .xlsx, .xls, .csv (Condo convention) — Village only accepted .xlsx.
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
  const { mutate: deleteUpload, isPending: isDeleting } = useDeleteProjectUnitUpload();

  const units = unitsData?.units ?? [];
  const uploads = uploadsData ?? [];
  const totalCount = unitsData?.totalCount ?? units.length;

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDeleteUpload, setPendingDeleteUpload] = useState<ProjectUnitUpload | null>(null);

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

    uploadReappraisalUnits(
      { appraisalId, file },
      {
        onSuccess: data => {
          toast.success(
            t('unitListing.reappraisal.resultToast', {
              matched: data.matchedUnsold,
              autoSold: data.autoSold,
              added: data.added,
            }),
          );
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.units.uploadFailed'));
        },
      },
    );
  };

  const handleConfirmDelete = () => {
    if (readOnly || !pendingDeleteUpload || !appraisalId) return;
    deleteUpload(
      { appraisalId, uploadId: pendingDeleteUpload.id },
      {
        onSuccess: () => toast.success(t('toasts.units.deleteSuccess')),
        onError: () => toast.error(t('toasts.units.deleteFailed')),
        onSettled: () => setPendingDeleteUpload(null),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('unitListing.importUnits')}
          </h3>
          {isReappraisal && (
            <p className="text-xs text-gray-500 mb-3">{t('unitListing.reappraisal.normalUploadNote')}</p>
          )}
          <UploadArea
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            isLoading={isUploading}
            disabled={readOnly}
            supportedText=".xlsx, .xls, .csv (max 10MB)"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('unitListing.uploadHistory')}
          </h3>
          <UploadHistoryTable
            uploads={uploads}
            isLoading={uploadsLoading}
            readOnly={readOnly}
            onDelete={setPendingDeleteUpload}
            deletingId={isDeleting ? (pendingDeleteUpload?.id ?? null) : null}
          />
        </div>
      </div>

      {isReappraisal && !readOnly && (
        <div className="bg-white rounded-xl border border-amber-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {t('unitListing.reappraisal.title')}
          </h3>
          <p className="text-xs text-gray-500 mb-4">{t('unitListing.reappraisal.hint')}</p>
          <UploadArea
            onChange={handleReappraisalFileChange}
            accept=".xlsx,.xls,.csv"
            isLoading={isReappraisalUploading}
            disabled={readOnly}
            supportedText=".xlsx, .xls, .csv (max 10MB)"
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{t('unitListing.unitListing')}</h3>
          {units.length > 0 && (
            <span className="text-xs text-gray-500">
              {t('unitListing.unitsCount', { count: totalCount.toLocaleString() })}
            </span>
          )}
        </div>
        <UnitResultTable units={units} isLoading={unitsLoading} projectType={projectType} />
        {units.length > 0 && (
          <div className="mt-4">
            <SummaryFooter units={units} totalCount={totalCount} projectType={projectType} />
          </div>
        )}
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

      <ConfirmDialog
        isOpen={pendingDeleteUpload !== null}
        onClose={() => setPendingDeleteUpload(null)}
        onConfirm={handleConfirmDelete}
        title={t('unitListing.confirmDelete.title')}
        message={`This will permanently remove "${pendingDeleteUpload?.fileName}" and all its unit rows.`}
        confirmText={t('unitListing.confirmDelete.confirm')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
