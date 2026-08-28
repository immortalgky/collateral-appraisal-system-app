import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Icon from '@/shared/components/Icon';
import { Dropdown } from '@/shared/components/inputs';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import {
  TITLE_IMPORT_SHEETS,
  useDownloadTitleImportTemplate,
  useTitleImportFilePreview,
  useTitleImportPastePreview,
  type TitleImportPreview,
  type TitleImportRow,
  type TitleImportRowError,
  type TitleImportSheet,
} from '../api/titleImport';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface TitleImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the rows the user accepted. They are appended to the form, not saved. */
  onConfirm: (rows: TitleImportRow[]) => void;
}

type Source = 'file' | 'paste';

/**
 * Bulk entry for the title list: upload a workbook or paste a range straight out of Excel, look at
 * what the server made of it, then confirm.
 *
 * Both sources hit the same validator, so the preview means the same thing either way. Nothing is
 * written here — confirming only fills the form, and the request is saved as usual afterwards.
 */
export function TitleImportDialog({ isOpen, onClose, onConfirm }: TitleImportDialogProps) {
  const { t } = useTranslation(['request', 'common']);

  const [source, setSource] = useState<Source>('file');
  const [preview, setPreview] = useState<TitleImportPreview | null>(null);
  const [previewTab, setPreviewTab] = useState<'ok' | 'errors'>('ok');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteSheet, setPasteSheet] = useState<TitleImportSheet>('Property');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bumped whenever the user starts something new or closes the dialog. A parse whose token no
  // longer matches is stale: the dialog stays mounted with the form, so without this a preview the
  // user walked away from lands anyway and is waiting, ready to import, the next time it opens.
  const requestToken = useRef(0);

  const { mutateAsync: downloadTemplate, isPending: isDownloading } =
    useDownloadTitleImportTemplate();
  const { mutateAsync: previewFile, isPending: isParsingFile } = useTitleImportFilePreview();
  const { mutateAsync: previewPaste, isPending: isParsingPaste } = useTitleImportPastePreview();

  const isBusy = isParsingFile || isParsingPaste;

  const collateralTypes = useParametersByGroup('CollateralType');

  // The screen whose whole job is "does this look right?" should not be the one place that shows a
  // bare "01" — the card list underneath already resolves the same code to its description.
  const labelForType = useCallback(
    (code: string | undefined) =>
      !code ? '—' : (collateralTypes.find(p => p.code === code)?.description ?? code),
    [collateralTypes],
  );

  const sheetOptions = useMemo(
    () =>
      TITLE_IMPORT_SHEETS.map(sheet => ({ value: sheet, label: t(`titleImport.sheets.${sheet}`) })),
    [t],
  );

  // Rough shape of what was pasted, shown live so the user notices a bad copy before submitting.
  const pasteShape = useMemo(() => {
    const lines = pasteText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return null;
    return { rows: Math.max(0, lines.length - 1), columns: lines[0].split('\t').length };
  }, [pasteText]);

  /** Back to the input step. Keeps what was pasted — the point of going back is usually to fix a
   *  couple of cells, and re-copying the whole range from Excel is the expensive part. */
  const backToInput = () => {
    requestToken.current += 1;
    setPreview(null);
    setPreviewTab('ok');
    setFileName(null);
    setIsDragging(false);
  };

  const reset = () => {
    // backToInput bumps the token, so anything still in flight is abandoned rather than landing in
    // a dialog the user has already left.
    backToInput();
    setPasteText('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const showFailure = (error: unknown) => {
    const failure = error as { code?: string; response?: { data?: { detail?: string } } };

    // A timeout never reached the parser, so "check the file" would be a lie — and the user would
    // retry the same file and fail the same way.
    if (failure?.code === 'ECONNABORTED') {
      toast.error(t('titleImport.timeout'));
      return;
    }

    toast.error(failure?.response?.data?.detail ?? t('titleImport.parseFailed'));
  };

  const handleFile = async (file: File) => {
    // Mirrors the server's own guards so an obvious mistake never costs a round trip.
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error(t('titleImport.fileTypeError'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t('titleImport.fileSizeError'));
      return;
    }

    const token = ++requestToken.current;

    try {
      const result = await previewFile(file);
      if (token !== requestToken.current) return;
      setFileName(file.name);
      setPreview(result);
      setPreviewTab(result.validRows > 0 ? 'ok' : 'errors');
    } catch (error) {
      if (token !== requestToken.current) return;
      showFailure(error);
    }
  };

  const handlePaste = async () => {
    const token = ++requestToken.current;

    try {
      const result = await previewPaste({ sheet: pasteSheet, tsv: pasteText });
      if (token !== requestToken.current) return;
      setFileName(null);
      setPreview(result);
      setPreviewTab(result.validRows > 0 ? 'ok' : 'errors');
    } catch (error) {
      if (token !== requestToken.current) return;
      showFailure(error);
    }
  };

  const handleConfirm = () => {
    if (!preview || preview.rows.length === 0) return;
    onConfirm(preview.rows);
    reset();
    onClose();
  };

  const copyErrorLog = async () => {
    if (!preview) return;
    const log = preview.errors
      .map(e => `${e.sheet}\t${e.rowNumber}\t${e.column ?? '-'}\t${e.message}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(log);
      toast.success(t('titleImport.logCopied'));
    } catch {
      toast.error(t('titleImport.logCopyFailed'));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('titleImport.title')} size="2xl">
      <div className="flex flex-col gap-4">
        {!preview ? (
          <>
            {/* Source picker */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
              {(['file', 'paste'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSource(option)}
                  className={clsx(
                    'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                    source === option
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {t(option === 'file' ? 'titleImport.sourceFile' : 'titleImport.sourcePaste')}
                </button>
              ))}
            </div>

            {source === 'file' ? (
              <>
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDragging(false);
                    // The Choose-file button is disabled while parsing; the drop zone has to honour
                    // the same guard, or two parses race and the slower one wins for both the
                    // preview and the file name shown above it.
                    if (isBusy) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleFile(file);
                  }}
                  className={clsx(
                    'flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-lg border-2 border-dashed transition-colors',
                    isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 bg-gray-50',
                  )}
                >
                  <Icon style="solid" name="file-excel" className="size-8 text-gray-400" />
                  <p className="text-sm text-gray-600">{t('titleImport.dropHint')}</p>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 disabled:opacity-50 transition-colors"
                  >
                    {isParsingFile ? t('titleImport.checking') : t('titleImport.chooseFile')}
                  </button>
                  <p className="text-xs text-gray-400">{t('titleImport.fileLimits')}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                      // Clear it so choosing the same file twice still fires onChange.
                      e.target.value = '';
                    }}
                  />
                </div>

                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => {
                    void downloadTemplate().catch(() =>
                      toast.error(t('titleImport.templateFailed')),
                    );
                  }}
                  className="inline-flex items-center gap-2 self-start text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  <Icon style="solid" name="download" className="size-4" />
                  {t('titleImport.downloadTemplate')}
                </button>
              </>
            ) : (
              <>
                <div className="max-w-sm">
                  <Dropdown
                    label={t('titleImport.pasteSheet')}
                    options={sheetOptions}
                    value={pasteSheet}
                    onChange={value => setPasteSheet((value as TitleImportSheet) ?? 'Property')}
                    // The value is a worksheet name, not a parameter code — "Property - Property…"
                    // would just repeat itself.
                    showValuePrefix={false}
                  />
                </div>

                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  rows={10}
                  placeholder={t('titleImport.pastePlaceholder')}
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
                />

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {pasteShape
                      ? t('titleImport.pasteShape', {
                          rows: pasteShape.rows,
                          columns: pasteShape.columns,
                        })
                      : t('titleImport.pasteHint')}
                  </p>
                  <button
                    type="button"
                    disabled={isBusy || pasteText.trim().length === 0}
                    onClick={() => void handlePaste()}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 disabled:opacity-50 transition-colors"
                  >
                    {isParsingPaste ? t('titleImport.checking') : t('titleImport.checkData')}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <PreviewStep
            labelForType={labelForType}
            preview={preview}
            fileName={fileName}
            activeTab={previewTab}
            onTabChange={setPreviewTab}
            onCopyLog={() => void copyErrorLog()}
            onBack={backToInput}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('common:actions.cancel')}
          </button>
          {preview && (
            <button
              type="button"
              disabled={preview.rows.length === 0}
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('titleImport.confirm', { count: preview.rows.length })}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface PreviewStepProps {
  preview: TitleImportPreview;
  labelForType: (code: string | undefined) => string;
  fileName: string | null;
  activeTab: 'ok' | 'errors';
  onTabChange: (tab: 'ok' | 'errors') => void;
  onCopyLog: () => void;
  onBack: () => void;
}

function PreviewStep({
  preview,
  labelForType,
  fileName,
  activeTab,
  onTabChange,
  onCopyLog,
  onBack,
}: PreviewStepProps) {
  const { t } = useTranslation(['request', 'common']);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <Icon style="solid" name="arrow-left" className="size-3.5" />
            {t('titleImport.chooseAnother')}
          </button>
          {fileName && <span className="text-sm text-gray-400 truncate">· {fileName}</span>}
        </div>
      </div>

      {/* Counts */}
      <div className="flex flex-wrap gap-2">
        <Chip label={t('titleImport.statTotal')} value={preview.totalRows} tone="neutral" />
        <Chip label={t('titleImport.statValid')} value={preview.validRows} tone="success" />
        <Chip label={t('titleImport.statInvalid')} value={preview.invalidRows} tone="danger" />
      </div>

      {/* Actionable, unlike the ignored-sheet note: the fix is one edit to the header row, and
          without it a 300-row file repeats the same complaint 300 times in the problems tab. */}
      {preview.missingColumns.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <Icon
            style="solid"
            name="triangle-exclamation"
            className="size-4 text-amber-500 mt-0.5 shrink-0"
          />
          <p className="text-xs text-amber-800">
            {t('titleImport.missingColumns', { columns: preview.missingColumns.join(', ') })}
          </p>
        </div>
      )}

      {preview.ignoredSheets.length > 0 && (
        <p className="text-xs text-gray-500">
          {t('titleImport.ignoredSheets', { sheets: preview.ignoredSheets.join(', ') })}
        </p>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-4">
          <TabButton
            active={activeTab === 'ok'}
            onClick={() => onTabChange('ok')}
            label={t('titleImport.tabValid', { count: preview.validRows })}
          />
          <TabButton
            active={activeTab === 'errors'}
            onClick={() => onTabChange('errors')}
            // Rows and problems are different numbers — one row can fail three checks — so the tab
            // is labelled "problems" rather than repeating the chip's row count with a bigger figure.
            label={t('titleImport.tabInvalid', { count: preview.errors.length })}
            danger
          />
        </div>
        {activeTab === 'errors' && preview.errors.length > 0 && (
          <button
            type="button"
            onClick={onCopyLog}
            className="inline-flex items-center gap-1.5 pb-2 text-xs font-medium text-primary hover:underline"
          >
            <Icon style="regular" name="copy" className="size-3.5" />
            {t('titleImport.copyLog')}
          </button>
        )}
      </div>

      <div className="overflow-auto max-h-[45vh] rounded-lg border border-gray-200">
        {activeTab === 'ok' ? (
          <ValidRowsTable rows={preview.rows} labelForType={labelForType} />
        ) : (
          <ErrorsTable errors={preview.errors} />
        )}
      </div>

      <p className="text-xs text-gray-500">{t('titleImport.notSavedYet')}</p>
    </div>
  );
}

function ValidRowsTable({
  rows,
  labelForType,
}: {
  rows: TitleImportRow[];
  labelForType: (code: string | undefined) => string;
}) {
  const { t } = useTranslation('request');

  if (rows.length === 0) {
    return <EmptyTable message={t('titleImport.noValidRows')} />;
  }

  return (
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          <Th>{t('titleImport.colSheet')}</Th>
          <Th>{t('titleImport.colRow')}</Th>
          <Th>{t('titleImport.colType')}</Th>
          <Th>{t('titleImport.colIdentity')}</Th>
          <Th>{t('titleImport.colOwner')}</Th>
          <Th>{t('titleImport.colLocation')}</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map(row => (
          <tr key={`${row.sheet}-${row.rowNumber}`} className="hover:bg-gray-50">
            <Td className="text-gray-600">{row.sheet}</Td>
            <Td className="font-mono text-gray-500">{row.rowNumber}</Td>
            <Td className="text-gray-700">{labelForType(row.title.collateralType)}</Td>
            <Td className="text-gray-900">{identityOf(row)}</Td>
            <Td className="text-gray-700">{row.title.ownerName || '—'}</Td>
            <Td className="text-gray-600">
              {[row.subDistrictName, row.districtName, row.provinceName]
                .filter(Boolean)
                .join(' / ') || '—'}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The one number that identifies this collateral, whichever kind it is. */
function identityOf(row: TitleImportRow): string {
  const title = row.title;
  return (
    title.titleNumber ||
    title.vin ||
    title.hin ||
    title.registrationNumber ||
    title.condoRegistrationNumber ||
    '—'
  );
}

function ErrorsTable({ errors: list }: { errors: TitleImportRowError[] }) {
  const { t } = useTranslation('request');

  if (list.length === 0) {
    return <EmptyTable message={t('titleImport.noErrors')} />;
  }

  return (
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          <Th>{t('titleImport.colSheet')}</Th>
          <Th>{t('titleImport.colRow')}</Th>
          <Th>{t('titleImport.colColumn')}</Th>
          <Th>{t('titleImport.colReason')}</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {list.map((error, index) => (
          <tr key={`${error.sheet}-${error.rowNumber}-${index}`} className="hover:bg-gray-50">
            <Td className="text-gray-600">{error.sheet}</Td>
            <Td className="font-mono text-gray-500">{error.rowNumber}</Td>
            <Td className="text-gray-600">{error.column ?? '—'}</Td>
            <Td className="text-red-700">{error.message}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
    {children}
  </th>
);

const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={clsx('px-4 py-2.5 text-xs align-top', className)}>{children}</td>
);

const EmptyTable = ({ message }: { message: string }) => (
  <div className="px-4 py-10 text-center text-sm text-gray-400">{message}</div>
);

const TabButton = ({
  active,
  onClick,
  label,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'pb-2 text-sm font-medium border-b-2 transition-colors',
      active
        ? danger
          ? 'border-danger text-danger'
          : 'border-primary text-primary'
        : 'border-transparent text-gray-500 hover:text-gray-700',
    )}
  >
    {label}
  </button>
);

const Chip = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'danger';
}) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ring-1',
      tone === 'success' && 'bg-success/10 text-success ring-success/20',
      tone === 'danger' && 'bg-red-50 text-red-600 ring-red-200',
      tone === 'neutral' && 'bg-gray-50 text-gray-600 ring-gray-200',
    )}
  >
    {label}
    <span className="font-semibold">{value}</span>
  </span>
);
