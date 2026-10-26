import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import type { AppraisalSummaryDto } from '../schemas/quotation';
import { Link } from 'react-router-dom';

interface AppraisalReportListingTableProps {
  appraisals: AppraisalSummaryDto[];
  rmUserName?: string | null;
  rmUserFullName?: string | null;
}

interface AppraisalRowProps {
  ap: AppraisalSummaryDto;
  index: number;
  rmUserName?: string | null;
  rmUserFullName?: string | null;
}

const AppraisalRow = ({ ap, index, rmUserName, rmUserFullName }: AppraisalRowProps) => {
  const { t } = useTranslation('quotation');
  const propertyTypeDescription = useParameterDescription('PropertyType', ap.propertyType ?? '');

  return (
    <tr key={ap.appraisalId} className="hover:bg-(--palette-surface-2) transition-colors">
      <td className="px-4 py-2">
        <span className="text-sm text-(--palette-gray-400) tabular-nums">{index}</span>
      </td>
      <td className="px-4 py-2">
        {ap.appraisalNumber != null ? (
          <Link
            to={`/appraisals/${ap.appraisalId}/administration`}
            className="text-sm font-medium text-(--palette-ink) hover:text-blue-400"
            title={t('appraisalReport.viewAppraisalHint')}
          >
            {ap.appraisalNumber}
          </Link>
        ) : (
          <span className="text-sm font-medium text-(--palette-ink)">{'—'}</span>
        )}
      </td>
      <td className="px-4 py-2">
        <span className="text-sm text-(--palette-gray-600)">{ap.customerName ?? '—'}</span>
      </td>
      <td className="px-4 py-2">
        <span className="text-sm text-(--palette-gray-600)">
          {ap.propertyType ? propertyTypeDescription || ap.propertyType : '—'}
        </span>
      </td>
      <td className="px-4 py-2">
        {rmUserName ? (
          <div className="flex flex-col">
            <span className="text-sm text-(--palette-ink)">{rmUserName}</span>
            {rmUserFullName && rmUserFullName !== rmUserName && (
              <span className="text-xs text-(--palette-gray-500)">{rmUserFullName}</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-(--palette-gray-600)">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-center">
        <span className="text-sm text-(--palette-gray-600)">{ap.maxAppraisalDays ?? '—'}</span>
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
  const { t } = useTranslation('quotation');

  if (appraisals.length === 0) {
    return (
      <div className="rounded-xl border border-(--palette-line) overflow-hidden">
        <div className="px-4 py-2 bg-(--palette-surface-2) border-b border-(--palette-line) flex items-center gap-2">
          <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
            <Icon
              name="file-lines"
              style="solid"
              className="size-3.5 text-blue-600 dark:text-blue-400"
            />
          </div>
          <h2 className="text-base font-semibold text-(--palette-ink)">
            {t('appraisalReport.title')}
          </h2>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-(--palette-gray-500)">{t('appraisalReport.noAppraisals')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-(--palette-line) overflow-hidden">
      <div className="px-4 py-2 bg-(--palette-surface-2) border-b border-(--palette-line) flex items-center gap-2">
        <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
          <Icon
            name="file-lines"
            style="solid"
            className="size-3.5 text-blue-600 dark:text-blue-400"
          />
        </div>
        <h2 className="text-base font-semibold text-(--palette-ink)">
          {t('appraisalReport.title')} ({appraisals.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
              <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider w-10">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                {t('columns.appraisalNumber')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                {t('columns.customerName')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                {t('columns.propertyDetail')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                {t('columns.rm')}
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                {t('columns.maxAppraisalDuration')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--palette-line-soft)">
            {appraisals.map((ap, idx) => (
              <AppraisalRow
                key={ap.appraisalId}
                ap={ap}
                index={idx + 1}
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
