import { useState } from 'react';
import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useGetIncomeAnalysis } from '@features/pricingAnalysis/api';
import type { IncomeSectionDto, IncomeCategoryDto, IncomeAssumptionDto } from '@features/pricingAnalysis/types/income';

interface Props {
  pricingAnalysisId: string;
  methodId: string;
  isExpanded: boolean;
}

const IncomeBreakdown360 = ({ pricingAnalysisId, methodId, isExpanded }: Props) => {
  const { data, isLoading, isError } = useGetIncomeAnalysis(
    isExpanded ? pricingAnalysisId : undefined,
    isExpanded ? methodId : undefined,
  );

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Icon name="circle-exclamation" style="solid" className="w-4 h-4 text-red-400" />
        <p className="text-xs text-red-600">Failed to load income analysis details.</p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-xs text-gray-400 py-2">No income analysis available.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Assumption strip */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <AssumptionRow label="Template" value={data.templateName} isText />
        <AssumptionRow label="Capitalize Rate" value={data.capitalizeRate} pct />
        <AssumptionRow label="Discount Rate" value={data.discountedRate} pct />
        <AssumptionRow label="# Years" value={data.totalNumberOfYears} decimals={0} />
      </div>

      {/* HBU note */}
      {data.isHighestBestUsed && (
        <p className="text-xs text-teal-700 font-medium border-l-2 border-teal-400 pl-2">
          Highest and Best Use (HBU) applied
        </p>
      )}

      {/* Sections */}
      {data.sections.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Sections</p>
          {data.sections.map(section => (
            <SectionDisclosure key={section.id} section={section} />
          ))}
        </div>
      )}

      {/* Final summary */}
      <div className="space-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Summary</p>
        <SummaryRow label="Final Value" value={data.finalValue} />
        <SummaryRow label="Final Value Rounded" value={data.finalValueRounded} />
        {data.finalValueAdjust != null && (
          <SummaryRow label="Adjusted" value={data.finalValueAdjust} highlight />
        )}
        {data.appraisalPriceRounded != null && (
          <SummaryRow label="Appraisal Price Rounded" value={data.appraisalPriceRounded} />
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const AssumptionRow = ({
  label,
  value,
  pct,
  decimals = 2,
  isText = false,
}: {
  label: string;
  value: number | string | null | undefined;
  pct?: boolean;
  decimals?: number;
  isText?: boolean;
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-gray-500 shrink-0">{label}</span>
    <span className="text-xs font-medium text-gray-800 text-right">
      {isText
        ? (value ?? '-')
        : value != null
          ? `${formatNumber(value as number, decimals)}${pct ? '%' : ''}`
          : '-'}
    </span>
  </div>
);

const SummaryRow = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | null | undefined;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-500">{label}</span>
    <span className={highlight ? 'text-sm font-bold text-teal-700' : 'text-xs font-medium text-gray-800'}>
      {value != null ? formatNumber(value, 2) : '-'}
    </span>
  </div>
);

const SectionDisclosure = ({ section }: { section: IncomeSectionDto }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xs font-semibold text-gray-700">{section.sectionName}</span>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          style="solid"
          className="w-3 h-3 text-gray-400"
        />
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {section.categories.map(cat => (
            <CategoryBlock key={cat.id} category={cat} />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryBlock = ({ category }: { category: IncomeCategoryDto }) => (
  <div className="px-3 py-2 space-y-1.5">
    <p className="text-xs font-medium text-gray-600">{category.categoryName}</p>
    {category.assumptions.length > 0 && (
      <table className="w-full text-xs">
        <tbody className="divide-y divide-gray-50">
          {category.assumptions.map(a => (
            <AssumptionLine key={a.id} assumption={a} />
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const AssumptionLine = ({ assumption }: { assumption: IncomeAssumptionDto }) => {
  // Summary view shows year 1 only; multi-year templates display year 2..N elsewhere.
  const firstVal = assumption.totalAssumptionValues[0];
  return (
    <tr>
      <td className="py-0.5 text-gray-500">{assumption.assumptionName}</td>
      <td className="py-0.5 text-right font-medium text-gray-700">
        {firstVal != null ? formatNumber(firstVal, 2) : '-'}
      </td>
    </tr>
  );
};

export default IncomeBreakdown360;
