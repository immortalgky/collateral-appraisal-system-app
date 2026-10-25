import { useTranslation } from 'react-i18next';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import Icon from '@/shared/components/Icon';
import { useGetQuotationActivityLog } from '../api/quotation';

interface QuotationTrackingLogProps {
  quotationId: string;
}

/** Format an ISO datetime string as DD/MM/YYYY HH:mm */
const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Full-width tracking log panel.
 * Fetches via useGetQuotationActivityLog (Phase 2a hook).
 * Rows are displayed chronologically (backend sorts ASC).
 */
const QuotationTrackingLog = ({ quotationId }: QuotationTrackingLogProps) => {
  const { t } = useTranslation('quotation');
  const { data: rows, isLoading, isError } = useGetQuotationActivityLog(quotationId);

  return (
    <div className="rounded-xl border border-(--palette-line) overflow-hidden">
      <Disclosure defaultOpen>
        {({ open }) => (
          <>
            <div className="px-4 py-2 bg-(--palette-surface-2) border-b border-(--palette-line) flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <div className="size-7 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <Icon
                    name="clock-rotate-left"
                    style="solid"
                    className="size-3.5 text-violet-600 dark:text-violet-400"
                  />
                </div>
                <h2 className="text-base font-semibold text-(--palette-ink)">
                  {t('trackingLog.title')}
                </h2>
              </div>
              <DisclosureButton className="p-1.5 text-(--palette-gray-400) hover:text-(--palette-gray-600) hover:bg-(--palette-surface-3) rounded-md transition-colors cursor-pointer">
                <Icon
                  name={open ? 'chevron-up' : 'chevron-down'}
                  style="solid"
                  className="w-3 h-3"
                />
              </DisclosureButton>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <Icon
                  name="spinner"
                  style="solid"
                  className="size-5 animate-spin text-(--palette-primary-text)"
                />
              </div>
            )}

            {isError && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-(--palette-gray-500)">{t('trackingLog.unableToLoad')}</p>
              </div>
            )}

            {!isLoading && !isError && (
              <DisclosurePanel>
                {(rows ?? []).length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-(--palette-gray-500)">{t('empty.noActivity')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
                          <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                            {t('columns.activityName')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                            {t('columns.actionDateTime')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                            {t('columns.actionBy')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-(--palette-line-soft)">
                        {(rows ?? []).map(row => (
                          <tr
                            key={row.id}
                            className="hover:bg-(--palette-surface-2) transition-colors"
                          >
                            <td className="px-4 py-2">
                              <span className="text-sm font-medium text-(--palette-ink)">
                                {row.activityName}
                              </span>
                              {row.remark && (
                                <p className="text-xs text-(--palette-gray-400) mt-0.5">
                                  <span className="font-medium text-(--palette-gray-500)">
                                    {t('fields.reason')}:
                                  </span>{' '}
                                  {row.remark}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-sm text-(--palette-gray-600)">
                                {formatDateTime(row.actionAt)}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-sm text-(--palette-gray-600)">
                                {row.actionBy}
                              </span>
                              {row.actionByRole && (
                                <p className="text-xs text-(--palette-gray-400)">
                                  {row.actionByRole}
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DisclosurePanel>
            )}
          </>
        )}
      </Disclosure>
    </div>
  );
};

export default QuotationTrackingLog;
