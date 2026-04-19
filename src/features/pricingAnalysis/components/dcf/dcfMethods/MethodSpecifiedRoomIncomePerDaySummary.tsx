import { useFormContext, useWatch } from 'react-hook-form';
import { roomTypeParameters } from '@/features/pricingAnalysis/data/dcfParameters';

interface RoomDetail {
  roomType?: string;
  roomTypeOther?: string;
  roomIncome?: number | string | null;
  saleableArea?: number | string | null;
  totalRoomIncome?: number | string | null;
}

interface MethodDetail {
  roomDetails?: RoomDetail[];
  avgRoomRate?: number | string | null;
  sumRoomIncome?: number | string | null;
  sumSaleableArea?: number | string | null;
  sumTotalRoomIncome?: number | string | null;
  increaseRatePct?: number | string | null;
  increaseRateYrs?: number | string | null;
  occupancyRateFirstYearPct?: number | string | null;
  occupancyRatePct?: number | string | null;
  occupancyRateYrs?: number | string | null;
}

export function MethodSpecifiedRoomIncomePerDaySummary({ name }: { name: string }) {
  const { control } = useFormContext();
  const detail = (useWatch({ control, name }) ?? {}) as MethodDetail;

  const rooms = detail.roomDetails ?? [];

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left font-medium px-3 py-2 border-b border-gray-200">Room Type</th>
              <th className="text-right font-medium px-3 py-2 border-b border-gray-200">Room Income</th>
              <th className="text-right font-medium px-3 py-2 border-b border-gray-200">Saleable Area</th>
              <th className="text-right font-medium px-3 py-2 border-b border-gray-200">Total Room Income</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-gray-400 border-b border-gray-100"
                >
                  No rooms configured
                </td>
              </tr>
            )}
            {rooms.map((room, idx) => {
              const typeLabel =
                roomTypeParameters.find(p => p.code === String(room.roomType))?.description ??
                room.roomType ??
                '—';
              const displayType =
                String(room.roomType) === '99' && room.roomTypeOther
                  ? `${typeLabel} — ${room.roomTypeOther}`
                  : typeLabel;
              return (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 border-b border-gray-100 text-gray-800">
                    {displayType}
                  </td>
                  <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-800 tabular-nums">
                    {formatNumber(room.roomIncome, 2)}
                  </td>
                  <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-800 tabular-nums">
                    {formatNumber(room.saleableArea, 0)}
                  </td>
                  <td className="px-3 py-2 border-b border-gray-100 text-right font-medium text-gray-900 tabular-nums">
                    {formatNumber(room.totalRoomIncome, 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rooms.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-gray-800">
                <td className="px-3 py-2 border-t border-gray-200">Total</td>
                <td className="px-3 py-2 border-t border-gray-200 text-right tabular-nums">
                  {formatNumber(detail.sumRoomIncome, 2)}
                </td>
                <td className="px-3 py-2 border-t border-gray-200 text-right tabular-nums">
                  {formatNumber(detail.sumSaleableArea, 0)}
                </td>
                <td className="px-3 py-2 border-t border-gray-200 text-right tabular-nums">
                  {formatNumber(detail.sumTotalRoomIncome, 2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        <Stat label="Average Room Rate" value={formatNumber(detail.avgRoomRate, 2)} />
        <Stat label="Total Saleable Area" value={formatNumber(detail.sumSaleableArea, 0)} />
        <Stat
          label="Increase Rate"
          value={`${formatNumber(detail.increaseRatePct, 0)}% every ${formatNumber(
            detail.increaseRateYrs,
            0,
          )} year(s)`}
        />
        <Stat
          label="Occupancy Rate"
          value={`First year ${formatNumber(
            detail.occupancyRateFirstYearPct,
            2,
          )}%, grows ${formatNumber(detail.occupancyRatePct, 2)}% every ${formatNumber(
            detail.occupancyRateYrs,
            0,
          )} year(s)`}
        />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row gap-2 items-baseline border-b border-gray-100 pb-1">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-800 font-medium text-right ml-auto tabular-nums">{value}</dd>
    </div>
  );
}

function formatNumber(v: unknown, decimals: number): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  if (!isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
