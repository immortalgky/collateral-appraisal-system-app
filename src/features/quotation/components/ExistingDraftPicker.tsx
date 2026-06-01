import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import type { QuotationDraftSummaryDto } from '../schemas/quotation';

interface ExistingDraftPickerProps {
  drafts: QuotationDraftSummaryDto[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (draft: QuotationDraftSummaryDto) => void;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

/**
 * Rich table for picking an existing Draft quotation request.
 * Shows draft number, created-on, appraisal count + preview, invited-company count, due date.
 */
const ExistingDraftPicker = ({
  drafts,
  isLoading,
  selectedId,
  onSelect,
}: ExistingDraftPickerProps) => {
  const { t } = useTranslation('quotation');

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <tbody>
            <TableRowSkeleton
              columns={[
                { width: 'w-32' },
                { width: 'w-24' },
                { width: 'w-40' },
                { width: 'w-16' },
                { width: 'w-24' },
              ]}
              rows={3}
            />
          </tbody>
        </table>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-dashed border-gray-200">
        <Icon name="inbox" style="regular" className="size-8 text-gray-300" />
        <p className="text-sm text-gray-500">{t('empty.noDraftQuotations')}</p>
        <p className="text-xs text-gray-400">{t('empty.noDraftHint')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.draftNo')}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.created')}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.appraisals')}
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.companies')}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.cutOffTime')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drafts.map(draft => {
              const isSelected = selectedId === draft.id;
              return (
                <tr
                  key={draft.id}
                  onClick={() => onSelect(draft)}
                  className={clsx(
                    'cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-purple-50 ring-inset ring-2 ring-purple-500'
                      : 'hover:bg-gray-50',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <Icon
                          name="circle-check"
                          style="solid"
                          className="size-4 text-purple-500 shrink-0"
                        />
                      )}
                      <span
                        className={clsx(
                          'text-sm font-medium',
                          isSelected ? 'text-purple-700' : 'text-purple-600',
                        )}
                      >
                        {draft.quotationNumber}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{formatDate(draft.requestDate)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {draft.totalAppraisals}
                      </span>
                      {draft.appraisalNumberPreview.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {draft.appraisalNumberPreview.slice(0, 5).map(no => (
                            <span
                              key={no}
                              className="inline-flex items-center px-1.5 py-0.5 bg-primary/5 rounded text-[10px] font-medium text-primary"
                            >
                              {no}
                            </span>
                          ))}
                          {draft.totalAppraisals > 5 && (
                            <span className="text-[10px] text-gray-400">
                              +{draft.totalAppraisals - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-600">{draft.totalCompaniesInvited}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {draft.cutOffTime ? formatDate(draft.cutOffTime) : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExistingDraftPicker;
