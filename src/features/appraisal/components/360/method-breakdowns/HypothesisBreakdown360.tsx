import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useGetHypothesisAnalysis } from '@features/pricingAnalysis/api';
import type {
  LandBuildingUnitRowDto,
  CondominiumUnitRowDto,
  CostItemDto,
  LandBuildingSummaryDto,
  CondominiumSummaryDto,
} from '@features/pricingAnalysis/types/hypothesis';

interface Props {
  pricingAnalysisId: string;
  methodId: string;
  isExpanded: boolean;
}

const HypothesisBreakdown360 = ({ pricingAnalysisId, methodId, isExpanded }: Props) => {
  const { data, isLoading, isError } = useGetHypothesisAnalysis(
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
        <p className="text-xs text-red-600">Failed to load hypothesis analysis details.</p>
      </div>
    );
  }

  if (!data || !data.hypothesisAnalysisId || !data.variant) {
    return <p className="text-xs text-gray-400 py-2">No hypothesis analysis generated yet.</p>;
  }

  if (data.variant === 'LandBuilding') {
    return (
      <LandBuildingView
        rows={data.landBuildingRows}
        costItems={data.costItems}
        summary={data.landBuildingSummary ?? null}
        remark={data.remark ?? null}
      />
    );
  }

  if (data.variant === 'Condominium') {
    return (
      <CondominiumView
        rows={data.condominiumRows}
        costItems={data.costItems}
        summary={data.condominiumSummary ?? null}
        remark={data.remark ?? null}
      />
    );
  }

  return <p className="text-xs text-gray-400 py-2">Unknown hypothesis variant.</p>;
};

// ─── Land & Building view ─────────────────────────────────────────────────────

const LandBuildingView = ({
  rows,
  costItems,
  summary,
  remark,
}: {
  rows: LandBuildingUnitRowDto[];
  costItems: CostItemDto[];
  summary: LandBuildingSummaryDto | null;
  remark: string | null;
}) => (
  <div className="space-y-4">
    {/* Unit details table */}
    {rows.length > 0 && (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Unit Details</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">#</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Plan No</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">House No</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Model</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Location</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">Floor</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">Land (Sq.Wa)</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">Usable (Sq.M)</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.sequenceNumber}>
                  <td className="px-2 py-1 text-right text-gray-600">{r.sequenceNumber}</td>
                  <td className="px-2 py-1 text-gray-600">{r.planNo ?? '-'}</td>
                  <td className="px-2 py-1 text-gray-600">{r.houseNo ?? '-'}</td>
                  <td className="px-2 py-1 text-gray-600">{r.modelName ?? '-'}</td>
                  <td className="px-2 py-1 text-gray-600">{r.location ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-gray-600">{r.floorNo ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-gray-600">
                    {r.landAreaSqWa != null ? formatNumber(r.landAreaSqWa, 2) : '-'}
                  </td>
                  <td className="px-2 py-1 text-right text-gray-600">
                    {r.usableAreaSqM != null ? formatNumber(r.usableAreaSqM, 2) : '-'}
                  </td>
                  <td className="px-2 py-1 text-right font-medium text-gray-800">
                    {r.sellingPrice != null ? formatNumber(r.sellingPrice, 2) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    <CostItemsTable items={costItems} />

    {summary && (
      <LandBuildingSummaryBlock summary={summary} />
    )}

    {remark && (
      <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">{remark}</p>
    )}
  </div>
);

// ─── Condominium view ─────────────────────────────────────────────────────────

const CondominiumView = ({
  rows,
  costItems,
  summary,
  remark,
}: {
  rows: CondominiumUnitRowDto[];
  costItems: CostItemDto[];
  summary: CondominiumSummaryDto | null;
  remark: string | null;
}) => (
  <div className="space-y-4">
    {/* Unit details table */}
    {rows.length > 0 && (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Unit Details</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">#</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">Floor</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Building</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Apt No</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Apartment</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Model Type</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">Usable (Sq.M)</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.sequenceNumber}>
                  <td className="px-2 py-1 text-right text-gray-600">{r.sequenceNumber}</td>
                  <td className="px-2 py-1 text-right text-gray-600">{r.floorNo ?? '-'}</td>
                  <td className="px-2 py-1 text-gray-600">{r.building ?? '-'}</td>
                  <td className="px-2 py-1 text-gray-600">{r.aptNo ?? '-'}</td>
                  <td className="px-2 py-1 text-gray-600">{r.apartment ?? '-'}</td>
                  <td className="px-2 py-1 text-gray-600">{r.modelType ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-gray-600">
                    {r.usableAreaSqM != null ? formatNumber(r.usableAreaSqM, 2) : '-'}
                  </td>
                  <td className="px-2 py-1 text-right font-medium text-gray-800">
                    {r.sellingPrice != null ? formatNumber(r.sellingPrice, 2) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    <CostItemsTable items={costItems} />

    {summary && (
      <CondominiumSummaryBlock summary={summary} />
    )}

    {remark && (
      <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">{remark}</p>
    )}
  </div>
);

// ─── Shared Cost Items table ──────────────────────────────────────────────────

const CostItemsTable = ({ items }: { items: CostItemDto[] }) => {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cost Items</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Category</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Description</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Area (Sq.M)</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Price/Sq.M</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Annual Depr %</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Total Depr %</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Value After Depr</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item.id}>
                <td className="px-2 py-1 text-gray-600">{item.category}</td>
                <td className="px-2 py-1 text-gray-600">{item.description}</td>
                <td className="px-2 py-1 text-right text-gray-600">
                  {item.area != null ? formatNumber(item.area, 2) : '-'}
                </td>
                <td className="px-2 py-1 text-right text-gray-600">
                  {item.pricePerSqM != null ? formatNumber(item.pricePerSqM, 2) : '-'}
                </td>
                <td className="px-2 py-1 text-right text-gray-600">
                  {item.annualDepreciationPercent != null
                    ? `${formatNumber(item.annualDepreciationPercent, 2)}%`
                    : '-'}
                </td>
                <td className="px-2 py-1 text-right text-gray-600">
                  {item.totalDepreciationPercent != null
                    ? `${formatNumber(item.totalDepreciationPercent, 2)}%`
                    : '-'}
                </td>
                <td className="px-2 py-1 text-right font-medium text-gray-800">
                  {item.valueAfterDepreciation != null
                    ? formatNumber(item.valueAfterDepreciation, 2)
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Summary blocks ───────────────────────────────────────────────────────────

const LandBuildingSummaryBlock = ({ summary }: { summary: LandBuildingSummaryDto }) => (
  <div className="space-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Summary</p>
    <DlRow label="Total Units" value={summary.totalUnits} decimals={0} />
    <DlRow label="Total Land Area (Sq.Wa)" value={summary.totalArea} />
    <DlRow label="Total Selling Price" value={summary.totalRevenue} />
    <DlRow label="Total Dev. Project Cost" value={summary.totalProjectDevCost} />
    <DlRow label="Total Project Cost" value={summary.totalProjectCost} />
    <DlRow label="Total Govt. Tax" value={summary.totalGovTax} />
    <DlRow label="Total Dev Costs & Expenses" value={summary.totalDevCostsAndExpenses} />
    <DlRow label="Current Property Value" value={summary.currentPropertyValue} />
    <DlRow label="Final Property Value" value={summary.finalPropertyValue} />
    <DlRow label="Total Asset Value Rounded" value={summary.totalAssetValueRounded} highlight />
  </div>
);

const CondominiumSummaryBlock = ({ summary }: { summary: CondominiumSummaryDto }) => (
  <div className="space-y-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Summary</p>
    <DlRow label="Total Building Area (Sq.M)" value={summary.totalBuildingArea} />
    <DlRow label="Total Project Selling Price" value={summary.totalProjectSellingPrice} />
    <DlRow label="Total Hard Cost" value={summary.totalHardCost} />
    <DlRow label="Total Soft Cost" value={summary.totalSoftCost} />
    <DlRow label="Total Govt. Tax" value={summary.totalGovTax} />
    <DlRow label="Total Dev Costs" value={summary.totalDevCosts} />
    <DlRow label="Remaining Value" value={summary.totalRemainingValue} />
    <DlRow label="Final Remaining Value" value={summary.finalRemainingValue} />
    <DlRow label="Total Asset Value Rounded" value={summary.totalAssetValueRounded} highlight />
  </div>
);

// ─── DlRow helper ─────────────────────────────────────────────────────────────

const DlRow = ({
  label,
  value,
  decimals = 2,
  highlight,
}: {
  label: string;
  value: number | null | undefined;
  decimals?: number;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-gray-500">{label}</span>
    <span
      className={
        highlight
          ? 'text-sm font-bold text-teal-700'
          : 'text-xs font-medium text-gray-800 text-right'
      }
    >
      {value != null ? formatNumber(value, decimals) : '-'}
    </span>
  </div>
);

export default HypothesisBreakdown360;
