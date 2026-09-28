/**
 * Unit Details tab for Condominium hypothesis analysis (mock v94): the unit table at full height
 * with a total row. Upload / file history live in the tab toolbar (see UnitUploadControls); the
 * KPI figures live there too (CondominiumTabs).
 *
 * Upload columns: Floor No, Building, Apt No, Apartment, Apartment Type,
 * Condo Area Sq.M, Selling Price, Remark 1, Remark 2
 */
import { useTranslation } from 'react-i18next';
import { fmt } from '../../../domain/formatters';
import type { UploadHistoryDto, CondominiumUnitRowDto } from '../../../types/hypothesis';
import { useUnitUpload, UnitUploadEmpty } from '../_shared/UnitUploadControls';
import { UT_TABLE, UT_TH, UT_TD, UT_FIN, ModelPill, pillIndexer } from '../_shared/unitTable';

interface CondoUnitDetailsTabProps {
  pricingAnalysisId: string;
  methodId: string;
  uploads: UploadHistoryDto[];
  rows: CondominiumUnitRowDto[];
}

export function CondoUnitDetailsTab({
  pricingAnalysisId,
  methodId,
  uploads,
  rows,
}: CondoUnitDetailsTabProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { controls, pickFile, dropFile } = useUnitUpload({ pricingAnalysisId, methodId, uploads });
  const activeUpload = uploads.find(u => u.isActive);
  const pillOf = pillIndexer(rows.map(r => r.modelType));
  // Group by room type in first-appearance order (same order the pills are coloured in).
  const types = [
    ...rows
      .reduce((acc, r) => {
        const key = (r.modelType ?? '').trim();
        const g = acc.get(key.toLowerCase()) ?? { name: key, count: 0, area: 0, price: 0 };
        g.count += 1;
        g.area += r.usableAreaSqM ?? 0;
        g.price += r.sellingPrice ?? 0;
        return acc.set(key.toLowerCase(), g);
      }, new Map<string, { name: string; count: number; area: number; price: number }>())
      .values(),
  ];
  const sum = (f: (r: CondominiumUnitRowDto) => number | null | undefined) =>
    rows.reduce((acc, r) => acc + (f(r) ?? 0), 0);

  return (
    <div className="flex flex-col gap-[10px]">
      {controls}
      {!(activeUpload && rows.length > 0) && (
        <UnitUploadEmpty onPick={pickFile} onDrop={dropFile} />
      )}

      {/* Unit listing */}
      {activeUpload && rows.length > 0 && (
        <table className={UT_TABLE}>
          <thead>
            <tr>
              <th className={`${UT_TH} text-left left-0 z-[3] w-[48px]`}>#</th>
              <th className={`${UT_TH} text-right`}>{t('hypothesis.units.cols.floorNo')}</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.building')}</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.aptNo')}</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.apartment')}</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.aptType')}</th>
              <th className={`${UT_TH} text-right`}>{t('hypothesis.units.cols.condoArea')}</th>
              <th className={`${UT_TH} text-right`}>{t('hypothesis.units.cols.sellingPrice')}</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.remark1')}</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.remark2')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.sequenceNumber}>
                <td className={`${UT_TD} text-[#8a96a0] sticky left-0 z-[1]`}>
                  {row.sequenceNumber}
                </td>
                <td className={`${UT_TD} text-right`}>{row.floorNo ?? '—'}</td>
                <td className={UT_TD}>{row.building ?? '—'}</td>
                <td className={UT_TD}>{row.aptNo ?? '—'}</td>
                <td className={UT_TD}>{row.apartment ?? '—'}</td>
                <td className={UT_TD}>
                  <ModelPill index={pillOf(row.modelType)}>{row.modelType ?? '—'}</ModelPill>
                </td>
                <td className={`${UT_TD} text-right`}>{fmt(row.usableAreaSqM)}</td>
                <td className={`${UT_TD} text-right`}>{fmt(row.sellingPrice)}</td>
                <td className={`${UT_TD} text-[#8a96a0]`}>{row.remark1 || '—'}</td>
                <td className={`${UT_TD} text-[#8a96a0]`}>{row.remark2 || '—'}</td>
              </tr>
            ))}
            <tr>
              <td className={`${UT_FIN} sticky left-0 z-[1]`}>{t('hypothesis.units.total')}</td>
              <td colSpan={5} className={UT_FIN}>
                {t('hypothesis.units.rooms', { n: rows.length })}
              </td>
              <td className={`${UT_FIN} text-right`}>{fmt(sum(r => r.usableAreaSqM))}</td>
              <td className={`${UT_FIN} text-right`}>{fmt(sum(r => r.sellingPrice))}</td>
              <td colSpan={2} className={UT_FIN} />
            </tr>
          </tbody>
        </table>
      )}

      {/* Per room-type analysis — the condo counterpart of L&B's model analysis */}
      {activeUpload && rows.length > 0 && (
        <table className={UT_TABLE}>
          <thead>
            <tr>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.typeAnalysis')}</th>
              <th className={`${UT_TH} text-right`}>{t('hypothesis.units.roomCount')}</th>
              <th className={`${UT_TH} text-right`}>{t('hypothesis.units.avgAreaSqM')}</th>
              <th className={`${UT_TH} text-right`}>{t('hypothesis.units.totalAreaSqM')}</th>
              <th className={`${UT_TH} text-right`}>{t('upload.colTotalRevenue')}</th>
            </tr>
          </thead>
          <tbody>
            {types.map(g => (
              <tr key={g.name}>
                <td className={UT_TD}>
                  <ModelPill index={pillOf(g.name)}>{g.name || '—'}</ModelPill>
                </td>
                <td className={`${UT_TD} text-right`}>{g.count.toLocaleString()}</td>
                <td className={`${UT_TD} text-right`}>{fmt(g.area / g.count)}</td>
                <td className={`${UT_TD} text-right`}>{fmt(g.area)}</td>
                <td className={`${UT_TD} text-right`}>{fmt(g.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
