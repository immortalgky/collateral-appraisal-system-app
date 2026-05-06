import Icon from '@/shared/components/Icon';
import QuotationStatusBadge from './QuotationStatusBadge';
import type { CompanyQuotationDto, InvitedCompanyDto } from '../schemas/quotation';

interface InvitedCompaniesTableProps {
  companies: InvitedCompanyDto[];
  companyQuotations: CompanyQuotationDto[];
}

const InvitedCompaniesTable = ({ companies, companyQuotations }: InvitedCompaniesTableProps) => {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <div className="size-7 rounded-lg bg-teal-100 flex items-center justify-center">
          <Icon name="building" style="solid" className="size-3.5 text-teal-600" />
        </div>
        <h2 className="text-sm font-semibold text-gray-700">
          Invited Companies ({companies.length})
        </h2>
      </div>

      {companies.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No companies invited yet.</p>
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
                  Company Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((inv, idx) => {
                const cq = companyQuotations.find(q => q.companyId === inv.companyId);
                return (
                  <tr key={inv.companyId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2">
                      <span className="text-sm text-gray-400 tabular-nums">{idx + 1}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-sm font-medium text-gray-900">{inv.companyName}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-sm text-gray-500">{inv.email ?? '—'}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {cq ? (
                        <QuotationStatusBadge status={cq.status} />
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InvitedCompaniesTable;
