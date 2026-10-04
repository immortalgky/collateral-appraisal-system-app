import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import DataErrorState from '@/shared/components/DataErrorState';
import { useGetAppraisalDocuments } from '@/features/appraisal/api/appraisalDocuments';
import { formatUploadDateTime, getFileMeta } from '@/features/appraisal/components/documentShared';
import { useViewDocument } from '@/features/request/api/documents';
import type { AppraisalDocumentFile } from '@/features/appraisal/types/appraisalDocuments';
import { useGetCorrectionContext } from '../api/appraisalDataCorrection';
import {
  hasNewSummaryFile,
  latestSummaryFile,
  type Regeneration,
  SUMMARY_TYPE_CODES,
  summaryFileIds,
} from '../utils/documentCorrection';
import { documentTypeName } from '@/features/appraisal/utils/valuationDocuments';
import DocumentActionDialog, { type DocumentDialogState } from './DocumentActionDialog';

// The pricing tables' cells: 26px heads on #f8fafa, 31px rows, hairline rules, group rows on #edf1f1.
const TH =
  'border-b border-r border-b-[color:var(--dc-line)] border-r-[color:var(--dc-line-soft)] bg-[color:var(--dc-surface-2)] px-[0.6154rem] text-[0.9231rem] font-medium leading-[2rem] text-[color:var(--dc-ink-2)] whitespace-nowrap';
const TD =
  'h-[2.3846rem] border-b border-[color:var(--dc-line-soft)] border-r-[color:var(--dc-line-soft)] bg-[color:var(--dc-surface)] px-[0.6154rem] leading-[2.3077rem]';
const GROUP = '!bg-[color:var(--dc-surface-3)] font-semibold text-[color:var(--dc-ink)]';
const ROW_BTN =
  'grid size-[1.6923rem] place-items-center rounded text-[color:var(--dc-ink-3)] hover:bg-[color:var(--dc-surface-3)] hover:text-[color:var(--dc-ink)] disabled:pointer-events-none disabled:opacity-50';

interface DocumentCorrectionPaneProps {
  appraisalId: string;
  /** Owned by the page so it survives switching rail entries while a job runs. */
  regeneration: Regeneration | null;
  onRegenerationChange: (next: Regeneration | null) => void;
}

const DocumentCorrectionPane = ({
  appraisalId,
  regeneration: regen,
  onRegenerationChange: setRegen,
}: DocumentCorrectionPaneProps) => {
  const { t, i18n } = useTranslation('appraisalDataCorrection');
  // The shared file-row wording (untitled file, no document types) lives in the appraisal namespace.
  const { t: tAppraisal } = useTranslation('appraisal');
  const { data, isLoading, isError, error, refetch } = useGetAppraisalDocuments(appraisalId);
  const viewDocument = useViewDocument();
  const {
    data: source,
    isLoading: sourceLoading,
    isError: sourceError,
  } = useGetCorrectionContext(appraisalId);
  const externalSystem = source?.externalSystem ?? null;

  const [dialog, setDialog] = useState<DocumentDialogState | null>(null);

  const types = data?.types ?? [];
  const fileTotal = types.reduce((sum, ty) => sum + ty.totalFiles, 0);
  const polling = regen?.status === 'polling';

  const handleView = (file: AppraisalDocumentFile) => {
    if (!file.documentId) return;
    // The size decides whether this opens inline or downloads — see MAX_INLINE_VIEW_BYTES.
    viewDocument(file.documentId, file.fileSizeBytes, file.fileName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only when there is nothing to show: a failed background/poll refetch keeps the cached list
  // (and any open dialog) on screen instead of swapping the whole pane for an error.
  if (isError && !data) {
    return (
      <DataErrorState
        variant="inline"
        title={t('documents.loadFailed')}
        message={(error as Error)?.message}
        onRetry={() => refetch()}
      />
    );
  }

  const latest = latestSummaryFile(types);
  const latestBy = latest && getFileMeta(latest, '').uploadedBy;
  const stripText = polling
    ? t('documents.strip.busy')
    : latest
      ? [t('documents.strip.latest', { at: formatUploadDateTime(latest.uploadedAt) }), latestBy]
          .filter(Boolean)
          .join(' · ')
      : t('documents.strip.none');
  // Self-clearing: once the file does turn up (say after a manual refresh) the warning goes away.
  const showTimeout = regen?.status === 'timeout' && !hasNewSummaryFile(regen.baselineIds, types);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex min-h-[3.2308rem] flex-wrap items-center gap-x-[0.6154rem] gap-y-[0.4615rem] border-b border-[color:var(--dc-line)] px-[0.7692rem] py-[0.4615rem]">
        <h2 className="min-w-0 truncate text-[1.0769rem] font-semibold text-[color:var(--dc-ink)]">
          {t('documents.title')}
        </h2>
        <span className="text-[0.9231rem] tabular-nums text-[color:var(--dc-ink-3)]">
          · {t('documents.fileCount', { count: fileTotal })}
        </span>
        <span className="flex-1" />
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          // Not while a summary is being regenerated: the dialog can pick a summary type, and a file
          // attached there is outside the poll's baseline (see `isGenerating` below).
          disabled={types.length === 0 || polling}
          onClick={() => setDialog({ kind: 'attach', typeCode: types[0]?.code ?? '' })}
        >
          <Icon style="solid" name="plus" className="mr-1.5 size-3" />
          {t('documents.attach')}
        </Button>
      </div>

      {/* Regenerate / notify strip — the way to have the source system collect again. */}
      <div className="flex flex-wrap items-center gap-x-[0.7692rem] gap-y-[0.4615rem] border-b border-[color:var(--dc-line)] bg-[color:var(--dc-surface-2)] px-[0.7692rem] py-[0.6154rem] text-[0.9231rem]">
        <b className="font-semibold text-[color:var(--dc-ink)]">{t('documents.strip.title')}</b>
        <span className="tabular-nums text-[color:var(--dc-ink-3)]">{stripText}</span>
        <span className="flex-1" />
        <Button
          type="button"
          variant="outline"
          className="dark:text-[color:var(--dc-ink)]"
          size="sm"
          isLoading={polling}
          // The dialog words itself by whether a source system exists; wait until that is known. A failed
          // lookup is not "no source": regenerating then would silently skip notifying it.
          disabled={sourceLoading || sourceError}
          onClick={() => {
            // The poll's baseline is this list's summary files; refresh it first so a file that
            // arrived since the last fetch (e.g. after a timeout) is not mistaken for the new one.
            void refetch();
            setDialog({ kind: 'regenerate' });
          }}
        >
          {polling ? t('documents.strip.regenerating') : t('documents.strip.regenerate')}
        </Button>
        {externalSystem && (
          // Not while a job runs: it would tell the source system to collect before the new
          // summary is attached, and the job may notify again when it finishes.
          <Button
            type="button"
            variant="outline"
            className="dark:text-[color:var(--dc-ink)]"
            size="sm"
            disabled={polling}
            onClick={() => setDialog({ kind: 'notify' })}
          >
            <Icon style="solid" name="paper-plane" className="mr-1.5 size-3" />
            {t('documents.strip.notify', { system: externalSystem })}
          </Button>
        )}
      </div>
      {showTimeout && (
        <div
          role="status"
          className="border-b border-[color:var(--dc-line)] bg-[color:var(--dc-warn-wash)] px-[0.7692rem] py-[0.6154rem] text-[0.9231rem] text-[color:var(--dc-warn)]"
        >
          {regen.notifyExternal
            ? t('documents.strip.timeoutNotified')
            : t('documents.strip.timeout')}
        </div>
      )}

      {/* One table, the pricing tables' language: document types are group rows with their own
          attach link, files sit under them. Nothing collapses. */}
      <div className="overflow-x-auto border-b border-[color:var(--dc-line-soft)]">
        <table className="w-full min-w-[49.2308rem] border-separate border-spacing-0 text-[0.9231rem] tabular-nums">
          <thead>
            <tr>
              <th className={clsx(TH, 'text-left')}>{t('documents.table.file')}</th>
              <th className={clsx(TH, 'text-left')}>{t('documents.table.uploadedAt')}</th>
              <th className={clsx(TH, 'text-left')}>{t('documents.table.uploadedBy')}</th>
              <th className={clsx(TH, 'w-[11.5385rem] !border-r-0')}>
                <span className="sr-only">{tAppraisal('properties.table.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 && (
              <tr>
                <td colSpan={4} className={clsx(TD, 'text-center text-[color:var(--dc-ink-3)]')}>
                  {tAppraisal('valuationDocuments.noTypes')}
                </td>
              </tr>
            )}
            {types.map(type => {
              // A summary type is being regenerated. Attaching or replacing a file on it now would add a
              // file id outside `regen.baselineIds`, which the poll reads as the new summary and stops
              // on the wrong file; deleting would race the job that writes it. So all three wait.
              // (origin/main left them enabled; only the notify button was disabled while polling.)
              const isGenerating = polling && SUMMARY_TYPE_CODES.includes(type.code);
              return (
                <Fragment key={type.code}>
                  <tr>
                    <td colSpan={3} className={clsx(TD, GROUP, 'border-r')}>
                      {documentTypeName(type, i18n.language)}{' '}
                      {isGenerating ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[color:var(--dc-warn-wash)] px-[0.6154rem] py-[0.0769rem] text-[0.8462rem] font-medium text-[color:var(--dc-warn)]">
                          <Icon name="spinner" style="solid" className="size-3 animate-spin" />
                          {t('documents.generating')}
                        </span>
                      ) : type.totalFiles > 0 ? (
                        <span className="font-normal text-[color:var(--dc-ink-3)]">
                          · {t('documents.fileCount', { count: type.totalFiles })}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap rounded-full bg-[color:var(--dc-warn-wash)] px-[0.6154rem] py-[0.0769rem] text-[0.8462rem] font-medium text-[color:var(--dc-warn)]">
                          {t('documents.noFile')}
                        </span>
                      )}
                    </td>
                    <td className={clsx(TD, GROUP, 'text-right')}>
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setDialog({ kind: 'attach', typeCode: type.code })}
                        className="whitespace-nowrap px-[0.3077rem] text-[0.9231rem] font-medium text-[color:var(--dc-accent-ink)] hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-50"
                      >
                        + {t('documents.attachFile')}
                      </button>
                    </td>
                  </tr>
                  {type.files.map(file => {
                    const meta = getFileMeta(file, tAppraisal('valuationDocuments.untitledFile'));
                    return (
                      <tr key={file.id}>
                        <td className={clsx(TD, 'border-r')}>
                          {meta.typeLabel && (
                            <span className="mr-1 inline-block rounded bg-[color:var(--dc-surface-3)] px-[0.3846rem] align-[1px] text-[0.7692rem] font-semibold leading-[1.2308rem] text-[color:var(--dc-ink-2)]">
                              {meta.typeLabel}
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={!file.documentId}
                            onClick={() => handleView(file)}
                            title={meta.name}
                            className="text-left hover:text-[color:var(--dc-accent-ink)] hover:underline disabled:cursor-default disabled:no-underline"
                          >
                            {meta.name}
                          </button>
                          {meta.size && (
                            <span className="ml-1.5 text-[color:var(--dc-ink-3)]">{meta.size}</span>
                          )}
                        </td>
                        <td className={clsx(TD, 'border-r')}>{meta.uploadedAt}</td>
                        <td className={clsx(TD, 'border-r')}>{meta.uploadedBy || '—'}</td>
                        <td className={clsx(TD, 'text-right')}>
                          <span className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={!file.documentId}
                              onClick={() => handleView(file)}
                              aria-label={t('documents.menu.viewFile', { name: meta.name })}
                              className="mr-0.5 h-[1.8462rem] rounded-[0.5385rem] border border-[color:var(--dc-accent-line)] bg-[color:var(--dc-surface)] px-[0.6923rem] text-[0.8846rem] leading-none text-[color:var(--dc-accent-ink)] hover:bg-[color:var(--dc-surface-2)] disabled:opacity-55"
                            >
                              {t('documents.menu.view')}
                            </button>
                            <button
                              type="button"
                              aria-label={t('documents.menu.replaceFile', { name: meta.name })}
                              title={t('documents.menu.replace')}
                              disabled={isGenerating}
                              onClick={() =>
                                setDialog({ kind: 'replace', typeCode: type.code, file })
                              }
                              className={ROW_BTN}
                            >
                              <Icon style="solid" name="pen" className="size-3" />
                            </button>
                            <button
                              type="button"
                              aria-label={t('documents.menu.deleteFile', { name: meta.name })}
                              title={t('documents.menu.delete')}
                              disabled={isGenerating}
                              onClick={() =>
                                setDialog({ kind: 'delete', typeCode: type.code, file })
                              }
                              className={clsx(
                                ROW_BTN,
                                'text-[1.2308rem] leading-none hover:!text-[color:var(--dc-danger)]',
                              )}
                            >
                              ×
                            </button>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialog && (
        <DocumentActionDialog
          appraisalId={appraisalId}
          state={dialog}
          types={types}
          externalSystem={externalSystem}
          onClose={() => setDialog(null)}
          onRegenerated={notifyExternal =>
            setRegen({
              baselineIds: summaryFileIds(types),
              startedAt: Date.now(),
              notifyExternal,
              status: 'polling',
            })
          }
        />
      )}
    </div>
  );
};

export default DocumentCorrectionPane;
