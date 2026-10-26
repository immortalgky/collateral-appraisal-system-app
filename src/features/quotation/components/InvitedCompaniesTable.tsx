import { useTranslation } from 'react-i18next';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import Icon from '@/shared/components/Icon';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import type { InvitedCompanyDto } from '../schemas/quotation';

interface InvitedCompaniesTableProps {
  companies: InvitedCompanyDto[];
}

const InvitedCompaniesTable = ({ companies }: InvitedCompaniesTableProps) => {
  const { t } = useTranslation('quotation');
  const localizeCompanyName = useLocalizedCompanyName();

  return (
    <div className="rounded-xl border border-(--palette-line) overflow-hidden">
      <Disclosure defaultOpen>
        {({ open }) => (
          <>
            <div className="px-4 py-2 bg-(--palette-surface-2) border-b border-(--palette-line) flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <div className="size-7 rounded-lg bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center">
                  <Icon
                    name="building"
                    style="solid"
                    className="size-3.5 text-(--palette-accent-ink)"
                  />
                </div>
                <h2 className="text-base font-semibold text-(--palette-ink)">
                  {t('invitedCompanies.title')} ({companies.length})
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

            <DisclosurePanel>
              {companies.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-(--palette-gray-500)">
                    {t('empty.noCompaniesInvited')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
                        <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider w-10">
                          #
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                          {t('columns.companyName')}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                          {t('columns.email')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--palette-line-soft)">
                      {companies.map((inv, idx) => (
                        <tr
                          key={inv.companyId}
                          className="hover:bg-(--palette-surface-2) transition-colors"
                        >
                          <td className="px-4 py-2">
                            <span className="text-sm text-(--palette-gray-400) tabular-nums">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-sm font-medium text-(--palette-ink)">
                              {localizeCompanyName(inv.companyName, inv.companyNameLocal)}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-sm text-(--palette-gray-500)">
                              {inv.email ?? '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </div>
  );
};

export default InvitedCompaniesTable;
