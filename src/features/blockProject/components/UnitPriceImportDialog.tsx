import { useState, type ChangeEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import { errorText, isAxiosError } from '@/shared/utils/errorUtils';

import { useImportUnitPrices, usePreviewUnitPriceImport } from '../api/projectUnitPrice';
import { checkXlsx, MAX_XLSX_UPLOAD_MB } from '../utils/xlsxUpload';
import type { UnitPriceImportErrorCode, UnitPriceImportPreview } from '../types';

/** Rows of "previous -> new" shown as a sanity check; the full list can be thousands of units. */
const SAMPLE_ROWS = 3;
/** The lists below can run to thousands; past this a "+N more" line stands in for the rest. */
const MAX_LISTED = 50;
/** Each total in the file's last row is compared with the import's own sum, within a baht. */
const SHEET_TOLERANCE = 1;
const SHEET_TOTALS = [
  ['appraisalValue', 'totalValue'],
  ['forceSellingPrice', 'totalForceSale'],
  ['coverageAmount', 'totalCoverage'],
] as const;

const KNOWN_ERROR_CODES: readonly UnitPriceImportErrorCode[] = [
  'MissingHeader',
  'UnitNotFound',
  'AmbiguousMatch',
  'DuplicateUnit',
  'InvalidNumber',
  'MissingAppraisalValue',
  'MissingPrice',
];

const fmt = (v: number | null | undefined) =>
  v == null
    ? '-'
    : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Pieces ────────────────────────────────────────────────────────────────────

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
    </div>
  );
}

const tileValue = 'text-base font-semibold text-gray-800 tabular-nums';

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'danger' | 'warning' | 'info';
  icon: string;
  children: ReactNode;
}) {
  const styles = {
    danger: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-gray-700',
    info: 'border-blue-200 bg-blue-50 text-gray-700',
  };
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${styles[tone]}`}
    >
      <Icon name={icon} style="solid" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function More({ total }: { total: number }) {
  const { t } = useTranslation('blockProject');
  if (total <= MAX_LISTED) return null;
  return (
    <span className="text-xs text-gray-500">
      {t('unitPrice.import.dialog.moreItems', { n: (total - MAX_LISTED).toLocaleString() })}
    </span>
  );
}

const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => (
  <th
    className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
  >
    {children}
  </th>
);

// ── Preview result ────────────────────────────────────────────────────────────

function PreviewResult({ preview }: { preview: UnitPriceImportPreview }) {
  const { t } = useTranslation('blockProject');
  const d = 'unitPrice.import.dialog';
  const condo = preview.projectType === 'Condo';
  const key1 = t(`${d}.keys.${condo ? 'condo1' : 'lb1'}`);
  const key2 = t(`${d}.keys.${condo ? 'condo2' : 'lb2'}`);

  // The translated label, then the server's own message, which names the missing column or the
  // bad value.
  const errorMessage = (code: string, serverMessage: string) => {
    if (!(KNOWN_ERROR_CODES as readonly string[]).includes(code)) return serverMessage;
    const label = t(`${d}.errorCodes.${code as UnitPriceImportErrorCode}`);
    return serverMessage && serverMessage !== label ? `${label} — ${serverMessage}` : label;
  };

  const sampleRows = preview.rows.slice(0, SAMPLE_ROWS);
  // No row errors, yet nothing can be imported: no priced row matched a unit of this project.
  const nothingToImport = preview.errors.length === 0 && !preview.canImport;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label={t(`${d}.matched`)}>
          <span className={tileValue}>
            {preview.matchedCount.toLocaleString()} / {preview.unitsInProject.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">
            {t(`${d}.matchedBy`, {
              key1,
              key2,
              n1: preview.matchedByPrimaryKey.toLocaleString(),
              n2: preview.matchedBySecondaryKey.toLocaleString(),
            })}
          </span>
        </Tile>
        <Tile label={t(`${d}.errorRows`)}>
          <span className={tileValue}>{preview.errors.length.toLocaleString()}</span>
          <Badge
            tone={preview.errors.length === 0 && !nothingToImport ? 'green' : 'red'}
            size="sm"
            dot={false}
          >
            {t(preview.errors.length === 0 && !nothingToImport ? `${d}.passed` : `${d}.blocking`)}
          </Badge>
        </Tile>
        <Tile label={t(`${d}.missingFromFile`)}>
          <span className={tileValue}>{preview.unitsMissingFromFile.length.toLocaleString()}</span>
          <Badge
            tone={preview.unitsMissingFromFile.length === 0 ? 'green' : 'yellow'}
            size="sm"
            dot={false}
          >
            {t(preview.unitsMissingFromFile.length === 0 ? `${d}.passed` : `${d}.willClear`)}
          </Badge>
        </Tile>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SHEET_TOTALS.map(([field, label]) => {
          const total = preview.totals[field];
          const sheetValue = preview.sheetTotals?.[field] ?? null;
          return (
            <Tile key={field} label={t(`${d}.${label}`)}>
              <span className={tileValue}>{fmt(total)}</span>
              {sheetValue == null ? (
                <span className="text-xs text-gray-500">{t(`${d}.noSheetTotals`)}</span>
              ) : Math.abs(sheetValue - total) <= SHEET_TOLERANCE ? (
                <Badge tone="green" size="sm" dot={false}>
                  {t(`${d}.sheetMatch`)}
                </Badge>
              ) : (
                <Badge tone="yellow" size="sm" dot={false}>
                  {t(`${d}.sheetMismatch`, { n: fmt(sheetValue) })}
                </Badge>
              )}
            </Tile>
          );
        })}
      </div>

      {nothingToImport && (
        <Banner tone="danger" icon="circle-xmark">
          {t(`${d}.noMatchBanner`)}
        </Banner>
      )}

      {preview.errors.length > 0 && (
        <section className="flex flex-col gap-2">
          <Banner tone="danger" icon="circle-xmark">
            {t(`${d}.errorsBanner`, {
              count: preview.errors.length,
              n: preview.errors.length.toLocaleString(),
            })}
          </Banner>
          <div className="max-h-48 overflow-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <Th right>{t(`${d}.cols.row`)}</Th>
                  <Th>{t(`${d}.cols.key`)}</Th>
                  <Th>{t(`${d}.cols.problem`)}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.errors.map((e, i) => (
                  <tr key={`${e.rowNumber}-${e.code}-${i}`}>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">
                      {e.rowNumber}
                    </td>
                    <td className="px-3 py-1.5 text-gray-800">{e.key ?? '-'}</td>
                    <td className="px-3 py-1.5 text-gray-700">{errorMessage(e.code, e.message)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {preview.unitsMissingFromFile.length > 0 && (
        <section className="flex flex-col gap-2">
          <Banner tone="warning" icon="triangle-exclamation">
            {t(`${d}.missingBanner`, {
              count: preview.unitsMissingFromFile.length,
              n: preview.unitsMissingFromFile.length.toLocaleString(),
            })}
          </Banner>
          <div className="flex max-h-24 flex-wrap items-center gap-1.5 overflow-auto">
            {preview.unitsMissingFromFile.slice(0, MAX_LISTED).map(u => (
              <span
                key={u.projectUnitId}
                className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700"
              >
                {u.key ?? '-'}
              </span>
            ))}
            <More total={preview.unitsMissingFromFile.length} />
          </div>
        </section>
      )}

      {preview.attributeDiffs.length > 0 && (
        <section className="flex flex-col gap-2">
          <Banner tone="info" icon="circle-info">
            {t(`${d}.diffsBanner`, {
              count: preview.attributeDiffs.length,
              n: preview.attributeDiffs.length.toLocaleString(),
            })}
          </Banner>
          <div className="max-h-40 overflow-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <Th>{t(`${d}.cols.key`)}</Th>
                  <Th>{t(`${d}.cols.column`)}</Th>
                  <Th>{t(`${d}.cols.system`)}</Th>
                  <Th>{t(`${d}.cols.file`)}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.attributeDiffs.slice(0, MAX_LISTED).map((x, i) => (
                  <tr key={`${x.rowNumber}-${x.column}-${i}`}>
                    <td className="px-3 py-1.5 text-gray-800">{x.key}</td>
                    <td className="px-3 py-1.5 text-gray-700">{x.column}</td>
                    <td className="px-3 py-1.5 tabular-nums text-gray-700">
                      {x.systemValue ?? '-'}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-gray-700">{x.fileValue ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <More total={preview.attributeDiffs.length} />
        </section>
      )}

      {sampleRows.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-gray-800">
            {t(`${d}.sampleTitle`, { count: sampleRows.length, n: sampleRows.length })}
          </h3>
          <div className="overflow-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th>{t(`${d}.cols.key`)}</Th>
                  <Th right>{t(`${d}.cols.previous`)}</Th>
                  <Th right>{t(`${d}.cols.new`)}</Th>
                  <Th right>{t(`${d}.cols.diff`)}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sampleRows.map(r => (
                  <tr key={r.rowNumber}>
                    <td className="px-3 py-1.5 text-gray-800">{r.key}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      {fmt(r.previousAppraisalValue)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-800">
                      {fmt(r.newAppraisalValue)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      {r.previousAppraisalValue != null && r.newAppraisalValue != null
                        ? fmt(r.newAppraisalValue - r.previousAppraisalValue)
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {preview.canImport && (
        <Banner tone="warning" icon="triangle-exclamation">
          {t(`${d}.writeWarning`)}
        </Banner>
      )}
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

interface UnitPriceImportDialogProps {
  appraisalId: string;
  onClose: () => void;
  /** Called once the import has been written, before the dialog closes. */
  onImported?: (result: UnitPriceImportPreview, startedAt: number) => void;
}

/**
 * Pick .xlsx -> preview (writes nothing) -> confirm. Mount it only while open: closing unmounts it,
 * which drops the chosen file and the preview. Choosing another file restarts the preview.
 */
export default function UnitPriceImportDialog({
  appraisalId,
  onClose,
  onImported,
}: UnitPriceImportDialogProps) {
  const { t } = useTranslation('blockProject');
  const d = 'unitPrice.import.dialog';
  const [file, setFile] = useState<File | null>(null);
  const previewMutation = usePreviewUnitPriceImport();
  const importMutation = useImportUnitPrices();
  // Held here rather than read from the mutation: a new request clears the mutation's data, and a
  // failed re-check must leave the last result on screen.
  const [preview, setPreview] = useState<UnitPriceImportPreview | null>(null);
  const isImporting = importMutation.isPending;

  const runPreview = (picked: File) => {
    setFile(picked);
    setPreview(null);
    previewMutation.mutate(
      { appraisalId, file: picked },
      {
        onSuccess: setPreview,
        onError: (err: unknown) => {
          setFile(null);
          toast.error(errorText(err, t(`${d}.previewFailed`)));
        },
      },
    );
  };

  // After the server refused a file the preview had passed. Quiet on failure: the import's own
  // error is already on screen as a toast, the chosen file and the last result stay, and the
  // dialog is not reset.
  const rePreview = (current: File) =>
    previewMutation.mutate({ appraisalId, file: current }, { onSuccess: setPreview });

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    // Clear so picking the same file again (after fixing it in Excel) fires another change event.
    e.target.value = '';
    if (!picked) return;

    const problem = checkXlsx(picked, MAX_XLSX_UPLOAD_MB);
    if (problem) {
      toast.error(t(`${d}.${problem}`, { max: MAX_XLSX_UPLOAD_MB }));
      return;
    }

    runPreview(picked);
  };

  const handleImport = () => {
    if (!file || !preview) return;
    // Before the request: any source read that completes after this can reflect the import.
    const startedAt = Date.now();
    importMutation.mutate(
      { appraisalId, file },
      {
        onSuccess: result => {
          // The count the server actually wrote, not the one the preview promised.
          toast.success(
            t(`${d}.success`, {
              count: result.matchedCount,
              n: result.matchedCount.toLocaleString(),
            }),
          );
          onImported?.(result, startedAt);
          onClose();
        },
        onError: (err: unknown) => {
          toast.error(errorText(err, t(`${d}.importFailed`)));
          // The server refused a file the preview had passed (the data moved in between): look
          // again so the dialog shows what is wrong now instead of a stale green light.
          if (isAxiosError(err) && err.response?.status === 400) rePreview(file);
        },
      },
    );
  };

  const handleClose = () => {
    if (!isImporting) onClose();
  };

  const picker = (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
      <Icon name="file-arrow-up" style="regular" />
      {t(preview || previewMutation.isPending ? `${d}.chooseAnother` : `${d}.choose`)}
      <input
        type="file"
        accept=".xlsx"
        className="sr-only"
        onChange={handleFile}
        disabled={previewMutation.isPending || isImporting}
      />
    </label>
  );

  return (
    <Modal isOpen onClose={handleClose} title={t(`${d}.title`)} size="xl" compact>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {picker}
          {file && (
            <span className="min-w-0 truncate text-xs text-gray-700" title={file.name}>
              {file.name}
            </span>
          )}
        </div>

        {!file && <p className="text-xs text-gray-500">{t(`${d}.hint`)}</p>}

        {previewMutation.isPending && !preview && (
          <div className="space-y-2" role="status" aria-label={t(`${d}.checking`)}>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        )}

        {preview && <PreviewResult preview={preview} />}

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
          <Button variant="ghost" onClick={handleClose} disabled={isImporting}>
            {t(`${d}.cancel`)}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!preview?.canImport || previewMutation.isPending}
            isLoading={isImporting}
          >
            {t(`${d}.confirm`, {
              count: preview?.matchedCount ?? 0,
              n: (preview?.matchedCount ?? 0).toLocaleString(),
            })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
