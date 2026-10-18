import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { PageReadOnlyContext, usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { RaiseFollowupDialog } from '@/features/document-followup/components/RaiseFollowupDialog';
import { OpenFollowupBanner } from '@/features/document-followup/components/OpenFollowupBanner';
import {
  useAppraisalContext,
  useActivityId,
  useIsTaskOwner,
  useWorkflowInstanceId,
} from '../../context/AppraisalContext';
import { useGetActivityActions } from '../../api/workflow';
import { useEnrichedPropertyGroups } from '../../hooks/useEnrichedPropertyGroups';
import { useGetAppendices, useGetAppraisalDocuments, useGetRequestDocuments } from '../../api';
import {
  appendixFileCount,
  missingRequiredTypes,
  requestSections,
} from '../../utils/checklistDocuments';
import RequestDocumentsSection from '../RequestDocumentsSection';
import CollapsibleSection from '../CollapsibleSection';
import ValuationDocumentChecklist from './ValuationDocumentChecklist';
import AppendixTab from './AppendixTab';
import ReportPreviewTab from './ReportPreviewTab';
import MachineryBookSection1Tab from './MachineryBookSection1Tab';

type ChecklistTab = 'request' | 'valuation' | 'appendix';
/** The valuation documents are the main tab: first, and what opens by default. */
const TABS: ChecklistTab[] = ['valuation', 'request', 'appendix'];
const DEFAULT_TAB: ChecklistTab = 'valuation';
const TAB_STORAGE_KEY = 'appraisal.documentChecklist.tab';

const isTab = (value: string | null | undefined): value is ChecklistTab =>
  TABS.includes(value as ChecklistTab);

const storedTab = (): ChecklistTab | null => {
  try {
    const value = localStorage.getItem(TAB_STORAGE_KEY);
    return isTab(value) ? value : null;
  } catch {
    return null;
  }
};

/**
 * The selected tab. On the page itself it is kept in the URL (`?tab=`, which wins) and in this
 * browser, so a reload or a shared link lands on the same tab. Embedded in another page it is plain
 * state: it must not write to that page's URL or to the page's own remembered tab.
 */
const useChecklistTab = (embedded: boolean) => {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<ChecklistTab>(() => {
    if (embedded) return DEFAULT_TAB;
    const fromUrl = params.get('tab');
    return isTab(fromUrl) ? fromUrl : (storedTab() ?? DEFAULT_TAB);
  });
  const select = (next: ChecklistTab) => {
    setTab(next);
    if (embedded) return;
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      // storage can be blocked; the choice then lasts for this visit only
    }
    setParams(
      prev => {
        const copy = new URLSearchParams(prev);
        copy.set('tab', next);
        return copy;
      },
      { replace: true },
    );
  };
  return [tab, select] as const;
};

/**
 * The Document Checklist: request documents (read-only), valuation documents, and the appendix with
 * the book preview, as three tabs. `embedded` is for a page that shows it as a reference (the
 * provide-documents page): everything is read-only there and "request more documents" is hidden.
 */
export const DocumentChecklistTab = ({ embedded = false }: { embedded?: boolean }) => {
  const { t } = useTranslation('appraisal');
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;

  // "Request Additional Documents" (document followup) — moved here from the Summary & Decision
  // tab. It only works on the task route, where the workflow instance + pending task are in
  // context; on the appraisal-search route those are absent so the button stays hidden.
  const workflowInstanceId = useWorkflowInstanceId();
  const activityId = useActivityId();
  const isTaskOwner = useIsTaskOwner();
  const pageReadOnly = usePageReadOnly();
  const { taskId } = useParams<{ taskId: string }>();
  const [raiseFollowupOpen, setRaiseFollowupOpen] = useState(false);
  const { data: actionsData } = useGetActivityActions(workflowInstanceId, activityId);
  const contentReadOnly = pageReadOnly || embedded;
  const isReadOnly = contentReadOnly || !isTaskOwner;
  const canRaiseFollowup = !isReadOnly && (actionsData?.canRaiseFollowup ?? false);
  const [tab, selectTab] = useChecklistTab(embedded);

  // Gate the Machinery Book Section 1 form on machinery presence — same signal
  // PropertyInformationPage uses to gate its Machinery Summary tab.
  const { groups } = useEnrichedPropertyGroups(appraisalId);
  const hasMachinery = groups.some(g => g.items.some(i => (i.type as string) === 'MAC'));

  // The tabs' counts. The same queries the tabs use, so nothing is fetched twice.
  const { data: requestDocs } = useGetRequestDocuments(appraisal?.requestId);
  const { data: valuationDocs } = useGetAppraisalDocuments(appraisalId);
  const { data: appendices } = useGetAppendices(appraisalId);
  const missing = useMemo(
    () => missingRequiredTypes(requestSections(requestDocs, '')),
    [requestDocs],
  );
  // A tab has no badge until its data is in: neither "complete" nor a count is known before that
  const counts: Record<ChecklistTab, { text: string; warn?: boolean } | null> = {
    request: !requestDocs
      ? null
      : missing > 0
        ? {
            text: t('valuationDocuments.checklist.tabCounts.missing', { count: missing }),
            warn: true,
          }
        : { text: t('valuationDocuments.checklist.tabCounts.complete') },
    valuation: valuationDocs
      ? { text: `${valuationDocs.typesWithFiles}/${valuationDocs.totalTypes}` }
      : null,
    appendix: appendices
      ? {
          text: t('valuationDocuments.checklist.tabCounts.files', {
            count: appendixFileCount(appendices),
          }),
        }
      : null,
  };
  const labels: Record<ChecklistTab, string> = {
    request: t('valuationDocuments.checklist.tabs.request'),
    valuation: t('valuationDocuments.checklist.tabs.valuation'),
    appendix: t('valuationDocuments.checklist.tabs.appendix'),
  };

  const onTabKeyDown = (event: React.KeyboardEvent, current: ChecklistTab) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = TABS[(TABS.indexOf(current) + step + TABS.length) % TABS.length];
    selectTab(next);
    document.getElementById(`checklist-tab-${next}`)?.focus();
  };

  return (
    <PageReadOnlyContext.Provider value={contentReadOnly}>
      <div className="flex flex-col gap-4 pb-8">
        {/* Open followup banner — full interactive view (table + cancel controls). */}
        {taskId && <OpenFollowupBanner raisingTaskId={taskId} />}

        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-gray-200">
          <div
            role="tablist"
            aria-label={t('valuationDocuments.checklist.tablistLabel')}
            className="flex flex-wrap gap-0.5"
          >
            {TABS.map(key => (
              <button
                key={key}
                id={`checklist-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={tab === key}
                aria-controls={`checklist-panel-${key}`}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => selectTab(key)}
                onKeyDown={event => onTabKeyDown(event, key)}
                className={clsx(
                  '-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium',
                  tab === key
                    ? 'border-primary font-semibold text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900',
                )}
              >
                {labels[key]}
                {counts[key] && (
                  <span
                    className={clsx(
                      'rounded-full px-2 py-px text-xs font-semibold',
                      counts[key].warn ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {counts[key].text}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Request Additional Documents — only when the workflow opts in (task route). */}
          {canRaiseFollowup && (
            <button
              type="button"
              onClick={() => setRaiseFollowupOpen(true)}
              className="mb-1.5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              {t('decision.requestDocuments')}
            </button>
          )}
        </div>

        <div role="tabpanel" id={`checklist-panel-${tab}`} aria-labelledby={`checklist-tab-${tab}`}>
          {tab === 'request' && <RequestDocumentsSection />}
          {tab === 'valuation' && <ValuationDocumentChecklist allowGenerate={!embedded} />}
          {tab === 'appendix' && (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
              {/* Left: editor — collapsible Machinery Book Section 1 + Appendix (Appendix last) */}
              <div className="flex min-w-0 flex-col gap-6">
                {hasMachinery && (
                  <CollapsibleSection
                    title={t('valuationDocuments.sections.machineryBookSection1')}
                    defaultOpen
                  >
                    <section className="rounded-t-2xl rounded-b-none border border-gray-100 bg-white p-6 shadow-sm">
                      <MachineryBookSection1Tab />
                    </section>
                  </CollapsibleSection>
                )}

                <CollapsibleSection title={t('valuationDocuments.sections.appendix')} defaultOpen>
                  <AppendixTab />
                </CollapsibleSection>
              </div>

              {/* Right: sticky report preview */}
              <div className="min-w-0 self-start lg:sticky lg:top-4">
                <ReportPreviewTab allowGenerate={!embedded} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raise followup dialog */}
      {canRaiseFollowup && workflowInstanceId && taskId && (
        <RaiseFollowupDialog
          isOpen={raiseFollowupOpen}
          onClose={() => setRaiseFollowupOpen(false)}
          workflowInstanceId={workflowInstanceId}
          taskId={taskId}
        />
      )}
    </PageReadOnlyContext.Provider>
  );
};

export default DocumentChecklistTab;
