import { useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import NumberInput from '@shared/components/inputs/NumberInput';
import TextInput from '@shared/components/inputs/TextInput';
import { formatFileSize } from '@shared/utils/formatUtils';
import Icon from '@shared/components/Icon';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { FormTable, type FormTableColumn } from '@/shared/components/form';
import { Change, HeadLabel } from './constructionGridCells';
import { useConstructionScope } from './constructionScope';
import { baht, isPendingProgress, isRegressedProgress, pct, RO } from './constructionGrid';
import {
  createUploadSession,
  useUploadDocument,
  useViewDocument,
} from '@features/request/api/documents';

/** ConstructionInspection.SummaryDetailMaxLength on the server; longer fails the whole save. */
const SUMMARY_DETAIL_MAX = 1000;

/** Width of a figure column. */
const FIGURE_W = '7.1429rem';

interface ConstructionSummaryFormProps {
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
  /** Derived from the entered percentage — the persisted column holds 0. */
  summaryPreviousValue: number;
  onUpdateSummary: (field: string, value: string | number | null) => void;
  /** Progressive round: the previous-round columns carry real history and are shown. */
  showPrevious: boolean;
  /** False without a value base of its own (a condo, or a house without its building cost). */
  showMoney: boolean;
  readOnly?: boolean;
}

type SummaryRow = NonNullable<ConstructionSummaryFormProps['summary']>;

export function ConstructionSummaryForm({
  summary,
  summaryCurrentValue,
  summaryPreviousValue,
  onUpdateSummary,
  showPrevious,
  showMoney,
  readOnly,
}: ConstructionSummaryFormProps) {
  const { t } = useTranslation('appraisal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // In the property's scope, not here: switching method unmounts this form mid-upload, and a fresh
  // one must still refuse a second upload.
  const { isActive, uploading: isUploading, setUploading: setIsUploading } = useConstructionScope();
  const uploadDocument = useUploadDocument();
  const viewDocument = useViewDocument();

  const hasDocument = !!summary?.documentId;

  const handleViewDocument = () => {
    if (!summary?.documentId) return;
    // Through the shared viewer, like every other "view" in the app: it opens the tab inside this
    // click so Safari allows it, shows progress, can be cancelled, and hands anything past
    // MAX_INLINE_VIEW_BYTES to the browser to download instead. This used to fetch the blob here
    // and window.open an object URL — no progress, no cancel, and no ceiling.
    viewDocument(summary.documentId, summary.fileSizeBytes, summary.fileName);
  };

  const handleUpload = async (file: File) => {
    // Attach only if this property is still on screen (see constructionScope); a method switch
    // mid-upload stays in scope, so it still attaches.
    setIsUploading(true);
    try {
      const { sessionId } = await createUploadSession();
      const result = await uploadDocument.mutateAsync({
        uploadSessionId: sessionId,
        file,
        documentType: 'CONSTRUCT',
        documentCategory: 'support',
      });
      if (!isActive()) {
        toast(t('constructionInspection.finishedAfterLeaving'));
        return;
      }
      onUpdateSummary('documentId', result.documentId);
      onUpdateSummary('fileName', result.fileName);
      onUpdateSummary('filePath', result.storageUrl);
      onUpdateSummary('fileSizeBytes', result.fileSize);
      const ext = file.name.includes('.')
        ? (file.name.split('.').pop()?.toLowerCase() ?? null)
        : null;
      onUpdateSummary('fileExtension', ext);
      onUpdateSummary('mimeType', file.type || null);
    } catch {
      if (isActive()) toast.error(t('constructionInspection.summaryForm.uploadFailed'));
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
    // One upload at a time: a second would race the first for the attachment.
    if (isUploading) return;
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

  const previousPct = summary?.summaryPreviousProgressPct ?? 0;
  const currentPct = summary?.summaryCurrentProgressPct ?? 0;
  // Read-only: no "not entered yet" prompt, the change printed as it stands (see constructionGrid).
  const final = !!readOnly;
  const isRegressed = isRegressedProgress(previousPct, currentPct, showPrevious);
  const isPending = isPendingProgress(previousPct, currentPct, showPrevious, final);
  // Enter in a field would submit the whole property form.
  const blockEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  };
  const figure = (
    key: string,
    kind: 'input' | 'derived',
    label: string,
    unit: string,
    cell: () => ReactNode,
    className?: string,
  ): FormTableColumn<SummaryRow> => ({
    key,
    kind,
    align: 'end',
    width: FIGURE_W,
    header: <HeadLabel label={label} unit={unit} />,
    className,
    cell,
  });
  const columns = [
    {
      key: 'description',
      kind: 'input' as const,
      header: t('constructionInspection.columns.description'),
      cell: () =>
        readOnly ? (
          // Wraps: a long detail would otherwise stretch the table and push the figures off-screen.
          <span className="block max-w-[32.5rem] whitespace-normal break-words">
            {summary?.summaryDetail}
          </span>
        ) : (
          <TextInput
            cell
            maxLength={SUMMARY_DETAIL_MAX}
            value={summary?.summaryDetail ?? ''}
            placeholder={t('constructionInspection.summaryForm.detailPlaceholder')}
            onChange={e => onUpdateSummary('summaryDetail', e.target.value)}
            onKeyDown={blockEnter}
            aria-label={t('constructionInspection.columns.description')}
          />
        ),
    },
    showPrevious &&
      figure(
        'previousProgress',
        'derived',
        t('constructionInspection.grid.previousProgress'),
        '(%)',
        () => pct(previousPct),
        RO,
      ),
    figure(
      'currentProgress',
      'input',
      t('constructionInspection.grid.currentProgress'),
      '(%)',
      () =>
        readOnly ? (
          <span className={clsx(isRegressed && 'text-(--palette-danger)')}>{pct(currentPct)}</span>
        ) : (
          <NumberInput
            cell
            value={currentPct}
            onChange={e => onUpdateSummary('summaryCurrentProgressPct', e.target.value ?? 0)}
            decimalPlaces={2}
            max={100}
            onKeyDown={blockEnter}
            aria-label={t('constructionInspection.grid.currentProgress')}
            invalid={isRegressed}
          />
        ),
    ),
    showPrevious &&
      figure('change', 'derived', t('constructionInspection.grid.change'), '(%)', () => (
        <Change from={previousPct} to={currentPct} final={final} />
      )),
    showPrevious &&
      showMoney &&
      figure(
        'previousValue',
        'derived',
        t('constructionInspection.grid.previousValue'),
        t('constructionInspection.grid.baht'),
        () => baht(summaryPreviousValue),
        RO,
      ),
    showMoney &&
      figure(
        'currentValue',
        'derived',
        t('constructionInspection.grid.currentValue'),
        t('constructionInspection.grid.baht'),
        () => baht(summaryCurrentValue),
        'font-semibold',
      ),
  ].filter((c): c is FormTableColumn<SummaryRow> => !!c);

  return (
    <div>
      <FormTable
        columns={columns}
        rows={[summary ?? {}]}
        rowKey={() => 'summary'}
        readOnly={readOnly}
        bleed
      />
      {isPending && (
        <div className="px-[12px] pt-[6px] text-[0.8571rem] text-[color:var(--palette-warn)]">
          {t('constructionInspection.status.summaryPending')}
        </div>
      )}
      {isRegressed && (
        <div className="px-[12px] pt-[6px] text-[0.8571rem] text-(--palette-danger)">
          ⚠ {t('constructionInspection.status.summaryRegressed')}
        </div>
      )}

      {/* Upload Construction Detail */}
      <div className="space-y-3 p-[12px]">
        <div className="flex items-center gap-2">
          <Icon name="paperclip" style="solid" className="size-3.5 text-(--palette-gray-400)" />
          <span className="text-xs font-semibold text-gray-700 dark:text-[color:var(--palette-ink)]">
            {t('constructionInspection.summaryForm.uploadTitle')}
          </span>
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
              onDragOver={e => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`flex flex-col items-center gap-2 py-5 border-2 border-dashed rounded-xl transition-all ${
                isUploading
                  ? 'border-primary/30 bg-primary/5 cursor-wait'
                  : isDragOver
                    ? 'border-primary bg-primary/5 cursor-pointer'
                    : 'border-gray-200 dark:border-[color:var(--palette-line)] hover:border-(--palette-line-strong) hover:bg-(--palette-surface-2)/50 cursor-pointer'
              }`}
            >
              <div
                className={`size-9 rounded-full flex items-center justify-center transition-colors ${
                  isDragOver || isUploading ? 'bg-primary/10' : 'bg-(--palette-accent-wash)'
                }`}
              >
                {isUploading ? (
                  <Icon
                    name="spinner"
                    style="solid"
                    className="size-4 text-(--palette-primary-text) animate-spin"
                  />
                ) : (
                  <Icon
                    name="cloud-arrow-up"
                    style="solid"
                    className={`size-4 ${isDragOver ? 'text-(--palette-primary-text)' : 'text-(--palette-gray-400)'}`}
                  />
                )}
              </div>
              <div className="text-center">
                {isUploading ? (
                  <p className="text-xs font-medium text-(--palette-primary-text)">
                    {t('constructionInspection.summaryForm.uploading')}
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-gray-600 dark:text-[color:var(--palette-ink-2)]">
                      <span className="text-(--palette-primary-text)">
                        {t('constructionInspection.summaryForm.clickToUpload')}
                      </span>{' '}
                      {t('constructionInspection.summaryForm.orDragDrop')}
                    </p>
                    <p className="text-[0.8571rem] text-gray-400 dark:text-[color:var(--palette-ink-3)] mt-0.5">
                      PDF, DOC, XLS, JPG, PNG
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Uploaded document */}
        {hasDocument && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-[color:var(--palette-surface-2)] rounded-lg border border-gray-100 dark:border-[color:var(--palette-line)] group hover:border-(--palette-line) transition-colors">
            <button
              type="button"
              onClick={handleViewDocument}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon
                  name="file-lines"
                  style="regular"
                  className="size-3.5 text-(--palette-primary-text)"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-[color:var(--palette-ink)] truncate hover:text-(--palette-primary-text) transition-colors">
                  {summary?.fileName ?? t('constructionInspection.summaryForm.document')}
                </p>
                <p className="text-[0.8571rem] text-gray-400 dark:text-[color:var(--palette-ink-3)]">
                  {[
                    summary?.fileExtension?.toUpperCase(),
                    summary?.fileSizeBytes != null ? formatFileSize(summary.fileSizeBytes) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || null}
                </p>
              </div>
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleRemoveDocument}
                aria-label={t('constructionInspection.summaryForm.removeDocument')}
                className="p-1.5 rounded-md text-(--palette-gray-400) hover:text-danger hover:bg-danger/5 transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Icon name="trash-can" style="regular" className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
