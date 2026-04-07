import { useRef } from 'react';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import {
  useUploadVillageUnits,
  useGetVillageUnits,
  useGetVillageUnitUploads,
} from '../../api/villageUnit';
import type { VillageUnit, VillageUnitUpload } from '../../types';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import Badge from '@shared/components/Badge';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };

const ALLOWED_EXTENSIONS = ['.xlsx'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} are supported.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File size exceeds 10 MB limit.';
  }
  return null;
}

// ==================== Upload History Table ====================

interface UploadHistoryProps {
  uploads: VillageUnitUpload[];
  isLoading: boolean;
}

function UploadHistoryTable({ uploads, isLoading }: UploadHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (uploads.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-6">No upload history</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-500 font-medium">No</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">File Name</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Date / Time</th>
            <th className="text-right py-2 px-3 text-gray-500 font-medium">Units</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {uploads.map((upload, index) => (
            <tr key={upload.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-600">{index + 1}</td>
              <td className="py-2 px-3 text-gray-800 max-w-[180px] truncate" title={upload.fileName ?? ''}>
                {upload.fileName ?? '-'}
              </td>
              <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                {new Date(upload.uploadedAt).toLocaleString()}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">{upload.unitCount}</td>
              <td className="py-2 px-3">
                <Badge type="status" value={upload.isActive ? 'completed' : 'pending'}>
                  {upload.isActive ? 'Active' : 'Replaced'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== Unit Result Table ====================

interface UnitResultTableProps {
  units: VillageUnit[];
  isLoading: boolean;
}

function UnitResultTable({ units, isLoading }: UnitResultTableProps) {
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
        <p className="text-sm">No unit data — upload a spreadsheet to import units</p>
      </div>
    );
  }

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
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Land Area (sq.wa)
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Usable Area (sq.m.)
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Selling Price (Baht)
            </th>
          </tr>
        </thead>
        <tbody>
          {units.map(unit => (
            <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-600">{unit.sequenceNumber}</td>
              <td className="py-2 px-3 text-gray-800">{unit.plotNumber ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800">{unit.houseNumber ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800">{unit.modelName ?? '-'}</td>
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

// ==================== Summary Footer ====================

interface SummaryFooterProps {
  units: VillageUnit[];
  totalCount: number;
}

function SummaryFooter({ units, totalCount }: SummaryFooterProps) {
  const models = new Set(units.map(u => u.modelName).filter(Boolean)).size;

  return (
    <div className="flex items-center gap-6 py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
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

// ==================== Main Component ====================

export default function UnitListingTab() {
  const appraisalId = useAppraisalId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: unitsData, isLoading: unitsLoading } = useGetVillageUnits(appraisalId ?? '');
  const { data: uploadsData, isLoading: uploadsLoading } = useGetVillageUnitUploads(appraisalId ?? '');
  const { mutate: uploadUnits, isPending: isUploading } = useUploadVillageUnits();

  const units = Array.isArray(unitsData?.units) ? unitsData.units : [];
  const uploads = Array.isArray(uploadsData?.uploads) ? uploadsData.uploads : Array.isArray(uploadsData) ? uploadsData : [];
  const totalCount = unitsData?.totalCount ?? units.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appraisalId) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    uploadUnits(
      { appraisalId, file },
      {
        onSuccess: () => {
          toast.success('Units imported successfully');
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? 'Upload failed. Please check the file format.');
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      },
    );
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 overflow-y-auto">
      {/* Upload Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upload Area */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Import Units</h3>
          <p className="text-xs text-gray-500 mb-4">
            Excel columns: PlotNumber, HouseNumber, ModelName, NumberOfFloors, LandArea (sq.wa), UsableArea (sq.m.), SellingPrice
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={handleDropZoneClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onKeyDown={e => e.key === 'Enter' && handleDropZoneClick()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Icon name="spinner" style="solid" className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-gray-500">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon name="cloud-arrow-up" style="solid" className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Drag and drop your file here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-gray-400">Supports .xlsx (max 10,000 units)</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={handleDropZoneClick}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <Icon name="upload" style="solid" className="size-4" />
              Browse File
            </Button>
          </div>
        </div>

        {/* Upload History */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Upload History</h3>
          <UploadHistoryTable uploads={uploads} isLoading={uploadsLoading} />
        </div>
      </div>

      {/* Unit Result Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Unit Listing</h3>
          {units.length > 0 && (
            <span className="text-xs text-gray-500">{totalCount.toLocaleString()} units</span>
          )}
        </div>
        <UnitResultTable units={units} isLoading={unitsLoading} />

        {units.length > 0 && (
          <div className="mt-4">
            <SummaryFooter units={units} totalCount={totalCount} />
          </div>
        )}
      </div>
    </div>
  );
}
