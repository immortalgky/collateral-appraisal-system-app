import toast from 'react-hot-toast';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import UploadArea from '@/shared/components/inputs/UploadArea';

import { useGetProjectUnits, useGetProjectUnitUploads, useUploadProjectUnits } from '../../api/projectUnit';
import type { ProjectType, ProjectUnit, ProjectUnitUpload } from '../../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} are supported.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) return 'File size exceeds 10 MB limit.';
  return null;
}

// ── Upload History Table ──────────────────────────────────────────────────────

function UploadHistoryTable({ uploads, isLoading }: { uploads: ProjectUnitUpload[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
      </div>
    );
  }
  if (uploads.length === 0) return <p className="text-xs text-gray-400 text-center py-6">No upload history</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-500 font-medium">No</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">File Name</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Date / Time</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {uploads.map((upload, index) => (
            <tr key={upload.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-600">{index + 1}</td>
              <td className="py-2 px-3 text-gray-800 max-w-[180px] truncate" title={upload.fileName}>{upload.fileName}</td>
              <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{new Date(upload.uploadedAt).toLocaleString()}</td>
              <td className="py-2 px-3">
                {upload.isUsed && (
                  <Badge type="status" value="completed">Used</Badge>
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

function UnitResultTable({ units, isLoading, projectType }: { units: ProjectUnit[]; isLoading: boolean; projectType: ProjectType }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
      </div>
    );
  }
  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <Icon name="table-list" className="text-3xl mb-2" />
        <p className="text-sm">No unit data — upload a spreadsheet to import units</p>
      </div>
    );
  }

  if (projectType === 'Condo') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Sq No</th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Floor</th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Tower Name</th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Reg. Number</th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Room No</th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Model Type</th>
              <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Usable Area (sq.m.)</th>
              <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Selling Price (Baht)</th>
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
                <td className="py-2 px-3 text-gray-800 text-right">{unit.usableArea?.toLocaleString() ?? '-'}</td>
                <td className="py-2 px-3 text-gray-800 text-right">{unit.sellingPrice?.toLocaleString() ?? '-'}</td>
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
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Sq No</th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Plot No</th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">House No</th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Model Name</th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">No. of Floors</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Land Area (sq.wa)</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Usable Area (sq.m.)</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Selling Price (Baht)</th>
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
              <td className="py-2 px-3 text-gray-800 text-right">{unit.landArea?.toLocaleString() ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800 text-right">{unit.usableArea?.toLocaleString() ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800 text-right">{unit.sellingPrice?.toLocaleString() ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Summary Footer ────────────────────────────────────────────────────────────

function SummaryFooter({ units, totalCount, projectType }: { units: ProjectUnit[]; totalCount: number; projectType: ProjectType }) {
  const towers = new Set(units.map(u => u.towerName).filter(Boolean)).size;
  const models = new Set(units.map(u => u.modelType).filter(Boolean)).size;

  return (
    <div className="flex items-center gap-6 py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
      {projectType === 'Condo' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Towers:</span>
            <span className="font-semibold text-gray-800">{towers}</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
        </>
      )}
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Models:</span>
        <span className="font-semibold text-gray-800">{models}</span>
      </div>
      <div className="h-4 w-px bg-gray-300" />
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Total Units:</span>
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
  const appraisalId = useAppraisalId();

  const { data: unitsData, isLoading: unitsLoading } = useGetProjectUnits(appraisalId ?? '');
  const { data: uploadsData, isLoading: uploadsLoading } = useGetProjectUnitUploads(appraisalId ?? '');
  const { mutate: uploadUnits, isPending: isUploading } = useUploadProjectUnits();

  const units = unitsData?.units ?? [];
  const uploads = uploadsData ?? [];
  const totalCount = unitsData?.totalCount ?? units.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appraisalId) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    uploadUnits(
      { appraisalId, file },
      {
        onSuccess: () => toast.success('Units imported successfully'),
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? 'Upload failed. Please check the file format.');
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Import Units</h3>
          <UploadArea
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            isLoading={isUploading}
            supportedText=".xlsx, .xls, .csv (max 10MB)"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Upload History</h3>
          <UploadHistoryTable uploads={uploads} isLoading={uploadsLoading} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Unit Listing</h3>
          {units.length > 0 && <span className="text-xs text-gray-500">{totalCount.toLocaleString()} units</span>}
        </div>
        <UnitResultTable units={units} isLoading={unitsLoading} projectType={projectType} />
        {units.length > 0 && (
          <div className="mt-4">
            <SummaryFooter units={units} totalCount={totalCount} projectType={projectType} />
          </div>
        )}
      </div>
    </div>
  );
}
