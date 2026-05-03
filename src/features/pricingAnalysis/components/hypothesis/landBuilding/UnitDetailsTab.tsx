/**
 * Unit Details tab for L&B hypothesis analysis.
 * Shows: drag-drop xlsx upload, upload history with status, parsed unit listing,
 * and per-model aggregates from preview.
 */
import React, { useRef, useState } from 'react';
import { Icon } from '@/shared/components';
import { fmt } from '../../../domain/formatters';
import {
  useUploadHypothesisUnitDetails,
  useDeleteHypothesisUpload,
} from '../../../api';
import type {
  UploadHistoryDto,
  LandBuildingUnitRowDto,
  LandBuildingModelAggregate,
} from '../../../types/hypothesis';
import toast from 'react-hot-toast';

/** Row-level parse error returned by the BE as part of a 400 response message. */
interface ParseRowError {
  row: number;
  field: string;
  value: string;
  reason: string;
}

/** Extract structured row errors from axios error response. */
function extractParseErrors(error: unknown): ParseRowError[] | null {
  if (!error || typeof error !== 'object') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const axiosErr = error as any;
  const message: string = axiosErr?.response?.data?.message ?? axiosErr?.response?.data ?? '';
  if (typeof message !== 'string' || !message.includes('Excel parse errors')) return null;

  // BE format: "Excel parse errors:\nRow 7, Field 'SellingPrice': value 'abc' is not a number."
  const lines = message.split('\n').slice(1);
  const errors: ParseRowError[] = [];
  for (const line of lines) {
    const m = line.match(/Row (\d+), Field '([^']+)': value '([^']*)' is (.+)\./);
    if (m) {
      errors.push({ row: parseInt(m[1], 10), field: m[2], value: m[3], reason: m[4] });
    }
  }
  return errors.length > 0 ? errors : null;
}

interface UnitDetailsTabProps {
  pricingAnalysisId: string;
  methodId: string;
  uploads: UploadHistoryDto[];
  rows: LandBuildingUnitRowDto[];
  models: Record<string, LandBuildingModelAggregate> | null;
  /** System-derived land area summed from property titles (Sq.Wa). */
  totalLandAreaFromTitles?: number | null;
}

export function UnitDetailsTab({
  pricingAnalysisId,
  methodId,
  uploads,
  rows,
  models,
  totalLandAreaFromTitles,
}: UnitDetailsTabProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [parseErrors, setParseErrors] = useState<ParseRowError[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadHypothesisUnitDetails();
  const deleteMutation = useDeleteHypothesisUpload();

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast.error('Only .xlsx files are accepted');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be ≤ 5 MB');
      return;
    }
    setParseErrors(null);
    uploadMutation.mutate(
      { pricingAnalysisId, methodId, file },
      {
        onSuccess: (result) => {
          toast.success(`Uploaded ${result.rowCount} rows`);
        },
        onError: (error) => {
          const errors = extractParseErrors(error);
          if (errors) {
            setParseErrors(errors);
          } else {
            toast.error('Upload failed');
          }
        },
      },
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDeleteUpload = (uploadId: string) => {
    deleteMutation.mutate(
      { pricingAnalysisId, methodId, uploadId },
      {
        onSuccess: () => toast.success('Upload deleted'),
        onError: () => toast.error('Delete failed'),
      },
    );
  };

  const activeUpload = uploads.find(u => u.isActive);

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Icon name="spinner" className="size-8 text-primary animate-spin" />
            <p className="text-sm text-gray-500">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Icon name="file-excel" style="regular" className="size-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              Drop an Excel file here or <span className="text-primary underline">browse</span>
            </p>
            <p className="text-xs text-gray-400">
              .xlsx only · max 5 MB · Columns: Plan No, House No, Model Name, Location, Floor No,
              Land Area Sq.Wa, Usable Area Sq.M, Selling Price, Remark 1, Remark 2
            </p>
          </div>
        )}
      </div>

      {/* Parse error table */}
      {parseErrors && parseErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center gap-2">
            <Icon name="triangle-exclamation" style="solid" className="size-3.5 text-red-600 shrink-0" />
            <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              Excel Parse Errors — fix these rows and re-upload
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr className="bg-red-50 border-b border-red-100">
                  <th className="text-left px-4 py-2 font-medium text-red-600">Row</th>
                  <th className="text-left px-4 py-2 font-medium text-red-600">Field</th>
                  <th className="text-left px-4 py-2 font-medium text-red-600">Value</th>
                  <th className="text-left px-4 py-2 font-medium text-red-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {parseErrors.map((e, i) => (
                  <tr key={i} className="hover:bg-red-50/50">
                    <td className="px-4 py-1.5 tabular-nums text-red-700 font-medium">{e.row}</td>
                    <td className="px-4 py-1.5 text-red-700">{e.field}</td>
                    <td className="px-4 py-1.5 text-red-500 font-mono">{e.value || '(empty)'}</td>
                    <td className="px-4 py-1.5 text-red-600">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload history */}
      {uploads.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Upload History
            </h4>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 font-medium text-gray-500">File</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Uploaded</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Rows</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {uploads.map(u => (
                <tr key={u.id} className={u.isActive ? 'bg-green-50' : ''}>
                  <td className="px-4 py-2 font-medium text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Icon name="file-excel" style="regular" className="size-3.5 text-green-600 shrink-0" />
                      {u.fileName}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(u.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                    {u.rowCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        u.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.isActive ? 'Present' : 'Historic'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteUpload(u.id)}
                      disabled={deleteMutation.isPending}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Delete upload"
                    >
                      <Icon name="trash" style="regular" className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unit listing from active upload */}
      {activeUpload && rows.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Unit Listing ({rows.length} units)
            </h4>
          </div>
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-xs min-w-[1000px]">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-medium text-gray-500">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Plan No</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">House No</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Model Name</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Location</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Floor No</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Land Area (Sq.Wa)</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Usable Area (Sq.M)</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Selling Price (Baht)</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Remark 1</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Remark 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => (
                  <tr key={row.sequenceNumber} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-400">{row.sequenceNumber}</td>
                    <td className="px-3 py-1.5 text-gray-700">{row.planNo ?? '-'}</td>
                    <td className="px-3 py-1.5 text-gray-700">{row.houseNo ?? '-'}</td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                        {row.modelName ?? '-'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-700">{row.location ?? '-'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      {row.floorNo ?? '-'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      {fmt(row.landAreaSqWa)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      {fmt(row.usableAreaSqM)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      {fmt(row.sellingPrice)}
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">{row.remark1 ?? ''}</td>
                    <td className="px-3 py-1.5 text-gray-500">{row.remark2 ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-model analysis result */}
      {models && Object.keys(models).length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Model Analysis
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Model</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Units</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Avg Area (Sq.Wa)</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Total Area (Sq.Wa)</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Total Revenue (Baht)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.values(models).map(m => (
                  <tr key={m.modelName} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                        {m.modelName}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {m.unitCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {fmt(m.avgLandAreaSqWa)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {fmt(m.totalLandAreaSqWa)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">
                      {fmt(m.totalSellingPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aggregate tiles — sourced from property titles + per-model rollups. */}
      {models && Object.keys(models).length > 0 && (() => {
        const modelList = Object.values(models);
        const totalSellingArea = modelList.reduce((sum, m) => sum + (m.totalLandAreaSqWa ?? 0), 0);
        const totalUnits = modelList.reduce((sum, m) => sum + (m.unitCount ?? 0), 0);
        const totalRevenue = modelList.reduce((sum, m) => sum + (m.totalSellingPrice ?? 0), 0);
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AggCard
              label="Total Land Area from Title"
              value={fmt(totalLandAreaFromTitles)}
              unit="Sq.Wa"
            />
            <AggCard label="Total Selling Area" value={fmt(totalSellingArea)} unit="Sq.Wa" />
            <AggCard label="Total Units" value={totalUnits.toLocaleString()} />
            <AggCard label="Total Revenue" value={fmt(totalRevenue)} unit="Baht" highlight />
          </div>
        );
      })()}
    </div>
  );
}

function AggCard({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-primary' : 'text-gray-900'}`}>
        {value}
        {unit && <span className="text-[10px] text-gray-400 font-normal ml-1">{unit}</span>}
      </p>
    </div>
  );
}
