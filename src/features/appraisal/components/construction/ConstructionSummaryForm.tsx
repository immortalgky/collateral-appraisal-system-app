import { useRef, useState } from 'react';
import NumberInput from '@shared/components/inputs/NumberInput';
import Icon from '@shared/components/Icon';
import { formatNumber } from '@shared/utils/formatUtils';
import { createUploadSession, useUploadDocument, useDownloadDocument } from '@features/request/api/documents';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

interface ConstructionSummaryFormProps {
  totalValue: number;
  summary: {
    summaryDetail?: string | null;
    summaryPreviousProgressPct?: number | null;
    summaryPreviousValue?: number | null;
    summaryCurrentProgressPct?: number | null;
    summaryCurrentValue?: number | null;
    documentId?: string | null;
    fileName?: string | null;
    filePath?: string | null;
    fileExtension?: string | null;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  } | null;
  summaryCurrentValue: number;
  remark: string;
  onUpdateSummary: (field: string, value: string | number | null) => void;
  onSetRemark: (value: string) => void;
  readOnly?: boolean;
}

export function ConstructionSummaryForm({
  summary,
  summaryCurrentValue,
  remark,
  onUpdateSummary,
  onSetRemark,
  readOnly,
}: ConstructionSummaryFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadDocument = useUploadDocument();
  const downloadDocument = useDownloadDocument();

  const hasDocument = !!summary?.documentId;

  const handleViewDocument = () => {
    if (!summary?.documentId) return;
    downloadDocument.mutate(summary.documentId, {
      onSuccess: ({ blob }) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
    });
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const { sessionId } = await createUploadSession();
      const result = await uploadDocument.mutateAsync({
        uploadSessionId: sessionId,
        file,
        documentType: 'CONSTRUCT',
        documentCategory: 'support',
      });
      onUpdateSummary('documentId', result.documentId);
      onUpdateSummary('fileName', result.fileName);
      onUpdateSummary('filePath', result.storageUrl);
      onUpdateSummary('fileSizeBytes', result.fileSize);
      const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? null : null;
      onUpdateSummary('fileExtension', ext);
      onUpdateSummary('mimeType', file.type || null);
    } catch {
      // Upload failed — user can retry
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemoveDocument = () => {
    onUpdateSummary('documentId', null);
    onUpdateSummary('fileName', null);
    onUpdateSummary('filePath', null);
    onUpdateSummary('fileExtension', null);
    onUpdateSummary('mimeType', null);
    onUpdateSummary('fileSizeBytes', null);
  };

  return (
    <div className="space-y-5">
      {/* Summary Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-primary text-white">
              <th className="text-left px-4 py-2.5 font-semibold min-w-[220px]" rowSpan={2}>
                Detail
              </th>
              <th className="text-center px-3 py-1.5 font-semibold border-l border-white/20" colSpan={2}>
                Previous Progress
              </th>
              <th className="text-center px-3 py-1.5 font-semibold border-l border-white/20" colSpan={2}>
                Current Progress
              </th>
            </tr>
            <tr className="bg-primary text-white/90">
              <th className="text-center px-3 py-1.5 text-[10px] font-medium min-w-[100px] border-l border-white/10">(%)</th>
              <th className="text-center px-3 py-1.5 text-[10px] font-medium min-w-[130px]">Value (Baht)</th>
              <th className="text-center px-3 py-1.5 text-[10px] font-medium min-w-[100px] border-l border-white/10">(%)</th>
              <th className="text-center px-3 py-1.5 text-[10px] font-medium min-w-[130px]">Value (Baht)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white hover:bg-gray-50/50 transition-colors">
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={summary?.summaryDetail ?? ''}
                  placeholder="Enter detail..."
                  onChange={e => onUpdateSummary('summaryDetail', e.target.value)}
                  disabled={readOnly}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                />
              </td>
              <td className="text-center px-3 py-2 text-gray-400 tabular-nums bg-gray-50/50">
                {formatNumber(summary?.summaryPreviousProgressPct ?? 0, 2)} %
              </td>
              <td className="text-right px-3 py-2 text-gray-400 tabular-nums bg-gray-50/50">
                {formatNumber(summary?.summaryPreviousValue ?? 0, 2)}
              </td>
              <td className="px-1.5 py-1">
                <NumberInput
                  value={summary?.summaryCurrentProgressPct ?? 0}
                  onChange={e => onUpdateSummary('summaryCurrentProgressPct', e.target.value ?? 0)}
                  decimalPlaces={2}
                  max={100}
                  disabled={readOnly}
                  className="!py-1 !text-xs !rounded-md"
                />
              </td>
              <td className="text-right px-3 py-2 font-bold text-gray-900 tabular-nums">
                {formatNumber(summaryCurrentValue, 2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Upload Construction Detail */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="paperclip" style="solid" className="size-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-700">Upload Construction Detail</span>
        </div>

        {/* Upload area — show when no document attached and not read-only */}
        {!hasDocument && !readOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
            />
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`flex flex-col items-center gap-2 py-5 border-2 border-dashed rounded-xl transition-all ${
                isUploading
                  ? 'border-primary/30 bg-primary/5 cursor-wait'
                  : isDragOver
                    ? 'border-primary bg-primary/5 cursor-pointer'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 cursor-pointer'
              }`}
            >
              <div className={`size-9 rounded-full flex items-center justify-center transition-colors ${
                isDragOver || isUploading ? 'bg-primary/10' : 'bg-primary-50'
              }`}>
                {isUploading ? (
                  <Icon name="spinner" style="solid" className="size-4 text-primary animate-spin" />
                ) : (
                  <Icon name="cloud-arrow-up" style="solid" className={`size-4 ${isDragOver ? 'text-primary' : 'text-gray-400'}`} />
                )}
              </div>
              <div className="text-center">
                {isUploading ? (
                  <p className="text-xs font-medium text-primary">Uploading...</p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-gray-600">
                      <span className="text-primary">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">PDF, DOC, XLS, JPG, PNG</p>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Uploaded document */}
        {hasDocument && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 group hover:border-gray-200 transition-colors">
            <button
              type="button"
              onClick={handleViewDocument}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon name="file-lines" style="regular" className="size-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate hover:text-primary transition-colors">
                  {summary?.fileName ?? 'Document'}
                </p>
                <p className="text-[10px] text-gray-400">
                  {[
                    summary?.fileExtension?.toUpperCase(),
                    summary?.fileSizeBytes != null ? formatFileSize(summary.fileSizeBytes) : null,
                  ].filter(Boolean).join(' · ') || null}
                </p>
              </div>
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleRemoveDocument}
                className="p-1.5 rounded-md text-gray-400 hover:text-danger hover:bg-danger/5 transition-all opacity-0 group-hover:opacity-100"
              >
                <Icon name="trash-can" style="regular" className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Remark */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
          <Icon name="message" style="regular" className="size-3.5 text-gray-400" />
          Remark
        </label>
        <textarea
          value={remark}
          onChange={e => onSetRemark(e.target.value)}
          disabled={readOnly}
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-500 resize-none transition-colors"
          placeholder="Enter remark or additional notes..."
        />
      </div>
    </div>
  );
}
