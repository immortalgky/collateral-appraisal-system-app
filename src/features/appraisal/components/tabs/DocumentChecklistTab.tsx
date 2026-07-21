import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
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
import RequestDocumentsSection from '../RequestDocumentsSection';
import CollapsibleSection from '../CollapsibleSection';
import ValuationDocumentChecklist from './ValuationDocumentChecklist';
import AppendixTab from './AppendixTab';
import ReportPreviewTab from './ReportPreviewTab';
import MachineryBookSection1Tab from './MachineryBookSection1Tab';

export const DocumentChecklistTab = () => {
  const { t } = useTranslation('appraisal');
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;

  // "Request Additional Documents" (document followup) — moved here from the Summary & Decision
  // tab. It only works on the task route, where the workflow instance + pending task are in
  // context; on the appraisal-search route those are absent so the button stays hidden.
  const workflowInstanceId = useWorkflowInstanceId();
  const activityId = useActivityId();
  const isTaskOwner = useIsTaskOwner();
  const isPageReadOnly = usePageReadOnly();
  const { taskId } = useParams<{ taskId: string }>();
  const [raiseFollowupOpen, setRaiseFollowupOpen] = useState(false);
  const { data: actionsData } = useGetActivityActions(workflowInstanceId, activityId);
  const isReadOnly = isPageReadOnly || !isTaskOwner;
  const canRaiseFollowup = !isReadOnly && (actionsData?.canRaiseFollowup ?? false);

  // Gate the Machinery Book Section 1 form on machinery presence — same signal
  // PropertyInformationPage uses to gate its Machinery Summary tab.
  const { groups } = useEnrichedPropertyGroups(appraisalId);
  const hasMachinery = groups.some(g => g.items.some(i => (i.type as string) === 'MAC'));

  return (
    <>
      <div className="flex flex-col gap-8 pb-8">
        {/* Request Additional Documents — only when the workflow opts in (task route). */}
        {canRaiseFollowup && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRaiseFollowupOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              <Icon name="file-circle-plus" style="solid" className="size-4" />
              {t('decision.requestDocuments')}
            </button>
          </div>
        )}

        {/* Open followup banner — full interactive view (table + cancel controls). */}
        {taskId && <OpenFollowupBanner raisingTaskId={taskId} />}

        {/* Request Documents (read-only) */}
        <RequestDocumentsSection />

        {/* Valuation Documents checklist */}
        <ValuationDocumentChecklist />

        {/* Appraisal Book Builder section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('valuationDocuments.sections.appraisalBookBuilder')}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: editor — collapsible Machinery Book Section 1 + Appendix (Appendix last) */}
            <div className="flex flex-col gap-6 min-w-0">
              {hasMachinery && (
                <CollapsibleSection
                  title={t('valuationDocuments.sections.machineryBookSection1')}
                  defaultOpen
                >
                  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <MachineryBookSection1Tab />
                  </section>
                </CollapsibleSection>
              )}

              <CollapsibleSection title={t('valuationDocuments.sections.appendix')} defaultOpen>
                <AppendixTab />
              </CollapsibleSection>
            </div>

            {/* Right: sticky report preview */}
            <div className="lg:sticky lg:top-4 self-start min-w-0">
              <ReportPreviewTab />
            </div>
          </div>
        </section>
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
    </>
  );
};

export default DocumentChecklistTab;
