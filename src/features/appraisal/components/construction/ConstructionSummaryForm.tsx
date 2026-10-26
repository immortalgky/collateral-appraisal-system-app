import { useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import NumberInput from '@shared/components/inputs/NumberInput';
import TextInput from '@shared/components/inputs/TextInput';
import { controlGeometry } from '@shared/components/inputs/controlStyles';
import { formatFileSize } from '@shared/utils/formatUtils';
import Icon from '@shared/components/Icon';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useFormLayout } from '@/shared/components/form';
import {
  Change,
  CurrentValueCell,
  EditedDot,
  type CurrentValueOverride,
} from './constructionGridCells';
import { useConstructionScope } from './constructionScope';
import { baht, isPendingProgress, isRegressedProgress, pct } from './constructionGrid';
import {
  createUploadSession,
  useUploadDocument,
  useViewDocument,
} from '@features/request/api/documents';

/** ConstructionInspection.SummaryDetailMaxLength on the server; longer fails the whole save. */
const SUMMARY_DETAIL_MAX = 1000;

/** A caption above a field, as the form kit draws it. */
const CAPTION = 'mb-1 block text-xs font-medium text-(--palette-ink)';

/** A figure that is shown, not typed: the control's box, tinted. */
function ReadBox({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const layout = useFormLayout();
  return (
    <div>
      <span className={CAPTION}>{label}</span>
      <div
        className={clsx(
          controlGeometry(layout),
          'flex items-center justify-end bg-(--palette-surface-2) text-sm tabular-nums text-(--palette-ink-2)',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

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
  /** The value at 100%: what the percentages are taken of. */
  totalValue: number;
  /** Calculated from the entered percentage; `override` replaces it when the appraiser typed one. */
  summaryCurrentValue: number;
  override?: CurrentValueOverride;
  /** Derived from the entered percentage — the persisted column holds 0. */
  summaryPreviousValue: number;
  onUpdateSummary: (field: string, value: string | number | null) => void;
  /** Progressive round: the previous-round columns carry real history and are shown. */
  showPrevious: boolean;
  /** False without a value base of its own (a condo, or a house without its building cost). */
  showMoney: boolean;
  readOnly?: boolean;
}

export function ConstructionSummaryForm({
  summary,
  totalValue,
  summaryCurrentValue,
  override,
  summaryPreviousValue,
  onUpdateSummary,
  showPrevious,
  showMoney,
  readOnly,
}: ConstructionSummaryFormProps) {
  const { t } = useTranslation('appraisal');
  const standard = useFormLayout() === 'standard';
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
  const overridden = override?.value != null;
  const dropzone = clsx(
    'flex flex-1 items-center gap-2.5 rounded-lg border border-dashed px-3 text-xs transition-colors',
    standard ? 'min-h-[2.8571rem]' : 'min-h-[2.4286rem]',
  );

  return (
    <div>
      <div
        className={clsx(
          'grid border-b border-(--palette-line)',
          showMoney && 'grid-cols-[minmax(0,1fr)_21.4286rem]',
        )}
      >
        <div
          className={clsx(
            'grid content-start',
            standard ? 'gap-[1rem] p-[1rem]' : 'gap-[0.7143rem] p-[0.8571rem]',
            showMoney && 'border-r border-(--palette-line)',
          )}
        >
          <div>
            <span className={CAPTION}>{t('constructionInspection.columns.description')}</span>
            {readOnly ? (
              // Wraps: a long detail would otherwise stretch the table and push the figures off-screen.
              <span className="block max-w-[32.5rem] whitespace-normal break-words text-sm">
                {summary?.summaryDetail}
              </span>
            ) : (
              <TextInput
                maxLength={SUMMARY_DETAIL_MAX}
                value={summary?.summaryDetail ?? ''}
                placeholder={t('constructionInspection.summaryForm.detailPlaceholder')}
                onChange={e => onUpdateSummary('summaryDetail', e.target.value)}
                onKeyDown={blockEnter}
                aria-label={t('constructionInspection.columns.description')}
              />
            )}
          </div>

          <div
            className={clsx(
              'grid',
              standard ? 'gap-x-[0.8571rem]' : 'gap-x-[0.7143rem]',
              showPrevious ? 'grid-cols-3' : 'grid-cols-[minmax(0,10rem)]',
            )}
          >
            {showPrevious && (
              <ReadBox label={t('constructionInspection.grid.previousProgress')}>
                {pct(previousPct)} %
              </ReadBox>
            )}
            {readOnly ? (
              <ReadBox
                label={t('constructionInspection.grid.currentProgress')}
                className={clsx(isRegressed && 'text-(--palette-danger)')}
              >
                {pct(currentPct)} %
              </ReadBox>
            ) : (
              <NumberInput
                label={t('constructionInspection.grid.currentProgress')}
                value={currentPct}
                onChange={e => onUpdateSummary('summaryCurrentProgressPct', e.target.value ?? 0)}
                decimalPlaces={2}
                max={100}
                suffix="%"
                onKeyDown={blockEnter}
                invalid={isRegressed}
                className="font-semibold"
              />
            )}
            {showPrevious && (
              <ReadBox label={t('constructionInspection.grid.change')}>
                <Change from={previousPct} to={currentPct} final={final} />
                <span className="ml-1">%</span>
              </ReadBox>
            )}
          </div>
          {(isPending || isRegressed) && (
            <div className="-mt-1 text-[0.8571rem]">
              {isPending && (
                <p className="text-[color:var(--palette-warn)]">
                  {t('constructionInspection.status.summaryPending')}
                </p>
              )}
              {isRegressed && (
                <p className="text-(--palette-danger)">
                  ⚠ {t('constructionInspection.status.summaryRegressed')}
                </p>
              )}
            </div>
          )}
        </div>

        {showMoney && (
          <div
            className={clsx(
              'grid content-start bg-(--palette-surface-2) tabular-nums',
              standard ? 'gap-3 p-4' : 'gap-[0.7143rem] p-[0.8571rem]',
            )}
          >
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-(--palette-ink-2)">
                {t('constructionInspection.kpi.value100')}
              </span>
              <b className="font-semibold">{baht(totalValue)}</b>
            </div>
            {showPrevious && (
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-(--palette-ink-2)">
                  {t('constructionInspection.grid.previousValue')}
                </span>
                <b className="font-semibold">{baht(summaryPreviousValue)}</b>
              </div>
            )}
            <div>
              <span className={CAPTION}>
                {t('constructionInspection.grid.currentValue')}{' '}
                {t('constructionInspection.grid.baht')}
              </span>
              <CurrentValueCell
                panel
                calculated={summaryCurrentValue}
                override={override}
                readOnly={readOnly}
                ariaLabel={t('constructionInspection.grid.currentValue')}
                onKeyDown={blockEnter}
              />
              {/* A line is always reserved, so the panel does not jump when the hint appears. */}
              <div className="mt-1.5 min-h-[1.2857rem] text-xs text-(--palette-ink-2)">
                {overridden && (
                  <>
                    <b className="relative ml-[10px] font-semibold text-(--palette-warn)">
                      <EditedDot />
                      {t('constructionInspection.override.badge')}
                    </b>{' '}
                    ·{' '}
                    {t('constructionInspection.override.hint', {
                      pct: pct(currentPct),
                      value: baht(summaryCurrentValue),
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Construction Detail: one row — the label, then the drop zone or the attached file. */}
      <div
        className={clsx(
          'flex items-center gap-3 border-b border-(--palette-line)',
          standard ? 'px-4 py-2.5' : 'px-3 py-2',
        )}
      >
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium">
          <Icon name="paperclip" style="solid" className="text-(--palette-gray-400)" />
          {t('constructionInspection.summaryForm.uploadTitle')}
        </span>

        {!hasDocument && !readOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
            />
            <button
              type="button"
              onDragOver={e => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={clsx(
                dropzone,
                'text-(--palette-ink-2)',
                isUploading
                  ? 'cursor-wait border-primary/30 bg-primary/5'
                  : isDragOver
                    ? 'cursor-pointer border-primary bg-primary/5'
                    : 'cursor-pointer border-(--palette-line-strong) bg-(--palette-surface) hover:border-(--palette-accent-ink) hover:bg-(--palette-accent-wash)',
              )}
            >
              <Icon
                name={isUploading ? 'spinner' : 'cloud-arrow-up'}
                style="solid"
                className={clsx(isUploading && 'animate-spin', 'text-(--palette-primary-text)')}
              />
              {isUploading ? (
                <span>{t('constructionInspection.summaryForm.uploading')}</span>
              ) : (
                <span>
                  <b className="font-semibold text-(--palette-accent-ink)">
                    {t('constructionInspection.summaryForm.clickToUpload')}
                  </b>{' '}
                  {t('constructionInspection.summaryForm.orDragDrop')}
                </span>
              )}
              <span className="flex-1" />
              <span>PDF, DOC, XLS, JPG, PNG</span>
            </button>
          </>
        )}

        {hasDocument && (
          <div className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-(--palette-line) bg-(--palette-surface-2) px-3 py-1.5 transition-colors hover:border-(--palette-line-strong)">
            <button
              type="button"
              onClick={handleViewDocument}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              <Icon
                name="file-lines"
                style="regular"
                className="shrink-0 text-(--palette-primary-text)"
              />
              <span className="truncate text-xs font-medium hover:text-(--palette-primary-text)">
                {summary?.fileName ?? t('constructionInspection.summaryForm.document')}
              </span>
              <span className="whitespace-nowrap text-[0.8571rem] text-(--palette-ink-3)">
                {[
                  summary?.fileExtension?.toUpperCase(),
                  summary?.fileSizeBytes != null ? formatFileSize(summary.fileSizeBytes) : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || null}
              </span>
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleRemoveDocument}
                aria-label={t('constructionInspection.summaryForm.removeDocument')}
                className="rounded-md p-1.5 text-(--palette-gray-400) transition-all hover:bg-danger/5 hover:text-danger"
              >
                <Icon name="trash-can" style="regular" className="text-xs" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
