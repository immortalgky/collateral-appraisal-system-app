/**
 * Upload controls shared by both Hypothesis unit-details tabs (mock v94): "อัปโหลด Excel" and
 * "ประวัติไฟล์ · N" sit in the tab's toolbar instead of a drop zone and a full history table in
 * the page body, so the unit table gets the height. The buttons are portaled into MethodTabs'
 * toolbar slot (the same slot ScrollableTableContainer uses for its column nav); outside a
 * MethodTabs they render in place. Parse errors from a failed upload still show inline.
 */
import { useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon } from '@/shared/components';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useUploadHypothesisUnitDetails, useDeleteHypothesisUpload } from '../../../api';
import type { UploadHistoryDto } from '../../../types/hypothesis';
import { MethodTabsNavSlotCtx } from '../../../store/methodTabsNavSlotContext';

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
  const errors: ParseRowError[] = [];
  for (const line of message.split('\n').slice(1)) {
    const m = line.match(/Row (\d+), Field '([^']+)': value '([^']*)' is (.+)\./);
    if (m) errors.push({ row: parseInt(m[1], 10), field: m[2], value: m[3], reason: m[4] });
  }
  return errors.length > 0 ? errors : null;
}

const BTN =
  'h-[24px] px-[9px] text-[12px] rounded-[6px] border border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary inline-flex items-center gap-[5px] whitespace-nowrap disabled:opacity-50';

/**
 * Returns the toolbar controls + inline parse errors, and a `pickFile`/`dropFile` pair the
 * tab's empty state can use.
 */
export function useUnitUpload({
  pricingAnalysisId,
  methodId,
  uploads,
}: {
  pricingAnalysisId: string;
  methodId: string;
  uploads: UploadHistoryDto[];
}): { controls: ReactNode; pickFile: () => void; dropFile: (file: File) => void } {
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = usePageReadOnly();
  const navSlot = useContext(MethodTabsNavSlotCtx);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseErrors, setParseErrors] = useState<ParseRowError[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const uploadMutation = useUploadHypothesisUnitDetails();
  const deleteMutation = useDeleteHypothesisUpload();

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast.error(t('toasts.uploadXlsxOnly'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('toasts.uploadMaxSize'));
      return;
    }
    setParseErrors(null);
    uploadMutation.mutate(
      { pricingAnalysisId, methodId, file },
      {
        onSuccess: result => toast.success(t('toasts.uploadSuccess', { n: result.rowCount })),
        onError: error => {
          const errors = extractParseErrors(error);
          if (errors) setParseErrors(errors);
          else toast.error(t('toasts.uploadFailed'));
        },
      },
    );
  };

  const handleDeleteUpload = (uploadId: string) => {
    deleteMutation.mutate(
      { pricingAnalysisId, methodId, uploadId },
      {
        onSuccess: () => toast.success(t('toasts.uploadDeleted')),
        onError: () => toast.error(t('toasts.deleteFailed')),
      },
    );
  };

  const sorted = [...uploads].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
  const th = 'px-[8px] py-0 h-[26px] font-medium text-gray-500 border-b border-gray-200';
  const td = 'px-[8px] py-0 h-[26px] border-b border-gray-100';

  const toolbar = (
    <div className="relative flex items-center gap-[6px]">
      {!readOnly && (
        <button
          type="button"
          className={BTN}
          disabled={uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon
            name={uploadMutation.isPending ? 'spinner' : 'file-excel'}
            style="regular"
            className={`size-[12px] ${uploadMutation.isPending ? 'animate-spin' : ''}`}
          />
          {uploadMutation.isPending ? t('upload.uploading') : t('hypothesis.units.uploadExcel')}
        </button>
      )}
      <button
        type="button"
        className={BTN}
        aria-expanded={historyOpen}
        disabled={uploads.length === 0}
        onClick={() => setHistoryOpen(o => !o)}
      >
        {t('hypothesis.units.history', { n: uploads.length })}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      {historyOpen && uploads.length > 0 && (
        <div className="absolute right-0 top-[28px] z-[20] bg-white border border-gray-200 rounded-[8px] shadow-lg min-w-[520px]">
          <table className="w-full text-[12px] leading-[25px]">
            <thead className="bg-gray-50">
              <tr>
                <th className={`${th} text-center w-[36px]`}>{t('upload.noCol')}</th>
                <th className={`${th} text-left`}>{t('upload.fileCol')}</th>
                <th className={`${th} text-left`}>{t('upload.uploadedCol')}</th>
                <th className={`${th} text-right`}>{t('upload.rowsCol')}</th>
                <th className={`${th} text-center`}>{t('upload.statusCol')}</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((u, index) => (
                <tr key={u.id} className={u.isActive ? 'bg-green-50' : ''}>
                  <td className={`${td} text-center tabular-nums text-gray-500`}>{index + 1}</td>
                  <td className={`${td} font-medium text-gray-700`}>{u.fileName}</td>
                  <td className={`${td} text-gray-500 whitespace-nowrap`}>
                    {new Date(u.uploadedAt).toLocaleString(undefined, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{u.rowCount.toLocaleString()}</td>
                  <td className={`${td} text-center`}>
                    <span
                      className={`inline-flex px-[6px] rounded-full text-[10px] font-medium leading-[16px] ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.isActive ? t('upload.statusPresent') : t('upload.statusHistoric')}
                    </span>
                  </td>
                  <td className={`${td} text-right`}>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUpload(u.id)}
                        disabled={deleteMutation.isPending}
                        className="text-gray-400 hover:text-red-500"
                        aria-label={t('hypothesis.units.deleteUpload')}
                      >
                        <Icon name="trash" style="regular" className="size-[12px]" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const errors = parseErrors && parseErrors.length > 0 && (
    <div className="rounded-[8px] border border-red-200 overflow-hidden mb-[8px]">
      <div className="bg-red-50 px-[10px] h-[26px] border-b border-red-200 flex items-center gap-[6px]">
        <Icon name="triangle-exclamation" style="solid" className="size-[12px] text-red-600" />
        <span className="text-[12px] font-semibold text-red-700">{t('upload.parseErrors')}</span>
      </div>
      <table className="w-full text-[12px] leading-[25px]">
        <thead>
          <tr className="bg-red-50">
            <th className="text-left px-[8px] font-medium text-red-600">
              {t('upload.parseErrorRow')}
            </th>
            <th className="text-left px-[8px] font-medium text-red-600">
              {t('upload.parseErrorField')}
            </th>
            <th className="text-left px-[8px] font-medium text-red-600">
              {t('upload.parseErrorValue')}
            </th>
            <th className="text-left px-[8px] font-medium text-red-600">
              {t('upload.parseErrorReason')}
            </th>
          </tr>
        </thead>
        <tbody>
          {parseErrors.map((e, i) => (
            <tr key={i} className="border-t border-red-50">
              <td className="px-[8px] h-[26px] tabular-nums text-red-700 font-medium">{e.row}</td>
              <td className="px-[8px] h-[26px] text-red-700">{e.field}</td>
              <td className="px-[8px] h-[26px] text-red-500 font-mono">{e.value || '(empty)'}</td>
              <td className="px-[8px] h-[26px] text-red-600">{e.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return {
    controls: (
      <>
        {navSlot ? createPortal(toolbar, navSlot) : toolbar}
        {errors}
      </>
    ),
    pickFile: () => fileInputRef.current?.click(),
    dropFile: handleFile,
  };
}

/** Empty state before the first upload — a click target and a drop target. */
export function UnitUploadEmpty({
  onPick,
  onDrop,
}: {
  onPick: () => void;
  onDrop: (file: File) => void;
}) {
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = usePageReadOnly();
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={onPick}
      onDragOver={e => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onDrop(f);
      }}
      className={`w-full border-2 border-dashed rounded-[8px] py-[28px] flex flex-col items-center gap-[6px] ${
        over ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
      }`}
    >
      <Icon name="file-excel" style="regular" className="size-[22px] text-gray-400" />
      <span className="text-[12.5px] font-medium text-gray-700">{t('hypothesis.units.empty')}</span>
      <span className="text-[11px] text-gray-400">{t('hypothesis.units.emptyHint')}</span>
    </button>
  );
}
