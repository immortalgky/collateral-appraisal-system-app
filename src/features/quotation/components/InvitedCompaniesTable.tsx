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
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <Disclosure defaultOpen>
        {({ open }) => (
          <>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <div className="size-7 rounded-lg bg-teal-100 flex items-center justify-center">
                  <Icon name="building" style="solid" className="size-3.5 text-teal-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">
                  {t('invitedCompanies.title')} ({companies.length})
                </h2>
              </div>
              <DisclosureButton className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer">
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
                  <p className="text-sm text-gray-500">{t('empty.noCompaniesInvited')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                          #
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('columns.companyName')}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('columns.email')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {companies.map((inv, idx) => {
                        return (
                          <tr key={inv.companyId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2">
                              <span className="text-sm text-gray-400 tabular-nums">{idx + 1}</span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-sm font-medium text-gray-900">
                                {localizeCompanyName(inv.companyName, inv.companyNameLocal)}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-sm text-gray-500">{inv.email ?? '—'}</span>
                            </td>
                          </tr>
                        );
                      })}
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
