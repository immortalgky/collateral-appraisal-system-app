import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { AppraisalSummaryDto, SharedDocumentEntryDto } from '../schemas/quotation';
import { useRemoveAppraisalFromDraft } from '../api/quotation';
import SharedDocumentViewer from './SharedDocumentViewer';

interface AppraisalContextPanelProps {
  quotationId: string;
  appraisals: AppraisalSummaryDto[];
  viewerRole: 'Admin' | 'RM' | 'ExtCompany';
  /** When true, show remove button per row (only meaningful for Admin + Draft status). */
  allowRemove?: boolean;
  /**
   * v4: Shared documents from quotationDetail.sharedDocuments.
   * When viewerRole='ExtCompany', only these documents are shown in the doc checklist.
   * Admin/RM views are unaffected.
   */
  sharedDocuments?: SharedDocumentEntryDto[];
}

/**
 * Displays the list of appraisals bundled in a quotation request.
 * Rows are expandable to show property details.
 * Admin can remove appraisals from a Draft quotation via the remove button.
 */
const AppraisalContextPanel = ({
  quotationId,
  appraisals,
  viewerRole,
  allowRemove = false,
  sharedDocuments = [],
}: AppraisalContextPanelProps) => {
  const { t } = useTranslation('quotation');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewerDoc, setViewerDoc] = useState<SharedDocumentEntryDto | null>(null);
  const { mutate: removeAppraisal, isPending: isRemoving } =
    useRemoveAppraisalFromDraft(quotationId);

  const handleRemove = (id: string, appraisalNumber: string | null | undefined) => {
    removeAppraisal(id, {
      onSuccess: () => {
        toast.success(t('toasts.appraisalRemoved', { number: appraisalNumber ?? id }));
      },
      onError: (err: unknown) => {
        const apiErr = err as { apiError?: { detail?: string } };
        toast.error(apiErr?.apiError?.detail ?? t('toasts.appraisalRemoveFailed'));
      },
    });
  };

  if (appraisals.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        {t('empty.noAppraisals')}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-blue-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
          <div className="size-7 rounded-lg bg-blue-200 flex items-center justify-center">
            <Icon name="file-certificate" style="solid" className="size-3.5 text-blue-700" />
          </div>
          <span className="text-sm font-semibold text-gray-800">{t('appraisalPanel.title')}</span>
          <span className="ml-auto text-xs text-blue-600 font-medium">
            {t('appraisalPanel.appraisalCount_other', { count: appraisals.length })}
          </span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {appraisals.map(ap => {
            const isExpanded = expandedId === ap.appraisalId;
            return (
              <div key={ap.appraisalId} className="bg-white">
                {/* Summary row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : ap.appraisalId)}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <Icon
                    name={isExpanded ? 'chevron-down' : 'chevron-right'}
                    style="solid"
                    className="size-3 text-gray-400 shrink-0"
                  />

                  {/* Appraisal badge */}
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/5 rounded-md text-xs font-medium text-primary">
                    <Icon name="file-certificate" style="solid" className="size-3" />
                    {ap.appraisalNumber ?? ap.appraisalId.slice(0, 8)}
                  </span>

                  {/* Property type */}
                  {ap.propertyType && (
                    <span className="text-xs text-gray-600">{ap.propertyType}</span>
                  )}

                  {/* Address preview */}
                  {ap.address && (
                    <span className="text-xs text-gray-400 truncate flex-1 min-w-0">
                      {ap.address}
                    </span>
                  )}

                  {/* Remove button — Admin only + allowRemove */}
                  {allowRemove && viewerRole === 'Admin' && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemove(ap.appraisalId, ap.appraisalNumber);
                      }}
                      disabled={isRemoving}
                      className={clsx(
                        'ml-auto shrink-0 flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                        isRemoving
                          ? 'opacity-50 cursor-not-allowed text-gray-400'
                          : 'text-red-500 hover:bg-red-50 hover:text-red-600',
                      )}
                      aria-label={t('aria.removeAppraisal', {
                        number: ap.appraisalNumber ?? ap.appraisalId,
                      })}
                    >
                      <Icon name="trash" style="solid" className="size-3" />
                      {t('appraisalPanel.remove')}
                    </button>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-10 pb-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div>
                        <span className="text-gray-400">{t('appraisalPanel.appraisalNo')}</span>
                        <p className="font-medium text-gray-800">{ap.appraisalNumber ?? '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">{t('appraisalPanel.propertyType')}</span>
                        <p className="font-medium text-gray-800">{ap.propertyType ?? '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">{t('appraisalPanel.address')}</span>
                        <p className="font-medium text-gray-800">{ap.address ?? '—'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">{t('appraisalPanel.loanType')}</span>
                        <p className="font-medium text-gray-800">{ap.loanType ?? '—'}</p>
                      </div>
                    </div>

                    {/* Document checklist — ExtCompany sees only shared docs (v7) */}
                    {viewerRole === 'ExtCompany' &&
                      (() => {
                        const apShared = sharedDocuments.filter(
                          d => d.appraisalId === ap.appraisalId,
                        );
                        if (apShared.length === 0) {
                          return (
                            <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center gap-1.5">
                              <Icon
                                name="circle-info"
                                style="solid"
                                className="size-3.5 text-gray-400 shrink-0"
                              />
                              <p className="text-xs text-gray-500">
                                {t('empty.noDocumentsShared')}
                              </p>
                            </div>
                          );
                        }
                        const requestLevelDocs = apShared.filter(d => d.level === 'RequestLevel');
                        const titleLevelDocs = apShared.filter(d => d.level === 'TitleLevel');

                        const renderDocRow = (d: SharedDocumentEntryDto, iconColor: string) => (
                          <button
                            key={d.documentId}
                            type="button"
                            onClick={() => setViewerDoc(d)}
                            className="flex items-center gap-1.5 py-0.5 w-full text-left hover:bg-blue-50 rounded px-1 -ml-1 transition-colors group"
                          >
                            <Icon
                              name="file"
                              style="solid"
                              className={clsx('size-3 shrink-0', iconColor)}
                            />
                            <span className="text-xs text-gray-700 group-hover:text-primary truncate">
                              {d.fileName ?? d.documentId.slice(0, 8)}
                              {d.documentTypeName && (
                                <span className="text-gray-400"> ({d.documentTypeName})</span>
                              )}
                            </span>
                            <Icon
                              name="eye"
                              style="solid"
                              className="size-2.5 text-gray-300 group-hover:text-primary ml-auto shrink-0"
                            />
                          </button>
                        );

                        return (
                          <div className="mt-2 flex flex-col gap-1.5">
                            {requestLevelDocs.length > 0 && (
                              <div>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                                  {t('appraisalPanel.requestDocuments')}
                                </p>
                                {requestLevelDocs.map(d => renderDocRow(d, 'text-blue-400'))}
                              </div>
                            )}
                            {requestLevelDocs.length === 0 && titleLevelDocs.length === 0 && (
                              <p className="text-xs text-gray-400">
                                {t('empty.noDocumentsShared')}
                              </p>
                            )}
                            {titleLevelDocs.length > 0 && (
                              <div>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                                  {t('appraisalPanel.titleDocuments')}
                                </p>
                                {titleLevelDocs.map(d => renderDocRow(d, 'text-indigo-400'))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline doc viewer — ExtCompany only */}
      {viewerDoc && (
        <SharedDocumentViewer
          quotationRequestId={quotationId}
          documentId={viewerDoc.documentId}
          fileName={viewerDoc.fileName ?? viewerDoc.documentId}
          fileType={viewerDoc.fileType}
          isOpen={true}
          onClose={() => setViewerDoc(null)}
        />
      )}
    </>
  );
};

export default AppraisalContextPanel;
