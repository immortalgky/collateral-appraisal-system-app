import { useTranslation } from 'react-i18next';
import { useAppraisalContext } from '../../context/AppraisalContext';
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

  // Gate the Machinery Book Section 1 form on machinery presence — same signal
  // PropertyInformationPage uses to gate its Machinery Summary tab.
  const { groups } = useEnrichedPropertyGroups(appraisalId);
  const hasMachinery = groups.some(g => g.items.some(i => (i.type as string) === 'MAC'));

  return (
    <div className="flex flex-col gap-8 pb-8">
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
  );
};

export default DocumentChecklistTab;
