import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { MachinerySummaryTab } from '../components/tabs/MachinerySummaryTab';
import { MachinerySummaryStatusPill } from '../components/MachinerySummaryStatusPill';
import { useMachinerySummaryStatus } from '../hooks/useMachinerySummaryStatus';

/**
 * The machinery summary as a page under the Properties area (`property/machinery-summary`).
 *
 * It used to be a tab of its own; now it opens from the strip on the Properties tab, the same way
 * a property's editor does — in the split view's right-hand panel, otherwise over the whole page.
 * The form itself is unchanged; this only adds the heading the tab label used to provide, with the
 * same status the strip shows. Saving refreshes the summary query, so the status follows.
 */
export default function MachinerySummaryPage() {
  const { t } = useTranslation('appraisal');
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const { status } = useMachinerySummaryStatus(appraisalId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 pb-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-700/10 text-amber-700">
          <Icon name="gears" style="solid" className="text-sm" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              {t('propertyInfo.machinerySummary.title')}
            </h2>
            {status && <MachinerySummaryStatusPill status={status} />}
          </div>
          <p className="truncate text-xs text-gray-500">
            {t('propertyInfo.machinerySummary.subtitle')}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MachinerySummaryTab cancelPath={`${basePath}/property?tab=properties`} />
      </div>
    </div>
  );
}
