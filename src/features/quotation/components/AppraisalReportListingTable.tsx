import { useParameterDescription } from '@/shared/utils/parameterUtils';
import type { AppraisalSummaryDto } from '../schemas/quotation';

interface AppraisalReportListingTableProps {
  appraisals: AppraisalSummaryDto[];
  rmUserName?: string | null;
  rmUserFullName?: string | null;
}

interface AppraisalRowProps {
  ap: AppraisalSummaryDto;
  rmUserName?: string | null;
  rmUserFullName?: string | null;
}

const AppraisalRow = ({ ap, rmUserName, rmUserFullName }: AppraisalRowProps) => {
  const propertyTypeDescription = useParameterDescription('PropertyType', ap.propertyType ?? '');

  return (
    <tr key={ap.appraisalId} className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-gray-900">{ap.appraisalNumber ?? '—'}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">{ap.customerName ?? '—'}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">
          {ap.propertyType ? propertyTypeDescription || ap.propertyType : '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        {rmUserName ? (
          <div className="flex flex-col">
            <span className="text-sm text-gray-900">{rmUserName}</span>
            {rmUserFullName && rmUserFullName !== rmUserName && (
              <span className="text-xs text-gray-500">{rmUserFullName}</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm text-gray-600">{ap.maxAppraisalDays ?? '—'}</span>
      </td>
    </tr>
  );
};

/**
 * Presentational table listing appraisals bundled in an RFQ.
 * Shown at the top of the admin QuotationSelectionPage.
 * Fields not present on AppraisalSummaryDto render as "—".
 */
const AppraisalReportListingTable = ({
  appraisals,
  rmUserName,
  rmUserFullName,
}: AppraisalReportListingTableProps) => {
  if (appraisals.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Appraisal Report Listing</h2>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No appraisals linked to this RFQ.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">
          Appraisal Report Listing ({appraisals.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Appraisal Report No.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Collateral Detail
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                AO
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max Appraisal Duration (day)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appraisals.map(ap => (
              <AppraisalRow
                key={ap.appraisalId}
                ap={ap}
                rmUserName={rmUserName}
                rmUserFullName={rmUserFullName}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AppraisalReportListingTable;
