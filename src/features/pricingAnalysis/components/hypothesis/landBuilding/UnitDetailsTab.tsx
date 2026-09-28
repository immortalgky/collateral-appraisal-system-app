/**
 * Unit Details tab for L&B hypothesis analysis (mock v94): the unit table at full height with a
 * total row, and the per-model analysis under it. Upload / file history live in the tab toolbar
 * (see UnitUploadControls); the KPI figures live there too (LandBuildingTabs).
 */
import { useTranslation } from 'react-i18next';
import { fmt } from '../../../domain/formatters';
import type {
  UploadHistoryDto,
  LandBuildingUnitRowDto,
  LandBuildingModelAggregate,
} from '../../../types/hypothesis';
import { useUnitUpload, UnitUploadEmpty } from '../_shared/UnitUploadControls';
import { UT_TABLE, UT_TH, UT_TD, UT_FIN, ModelPill, pillIndexer } from '../_shared/unitTable';

interface UnitDetailsTabProps {
  pricingAnalysisId: string;
  methodId: string;
  uploads: UploadHistoryDto[];
  rows: LandBuildingUnitRowDto[];
  models: Record<string, LandBuildingModelAggregate> | null;
}

export function UnitDetailsTab({
  pricingAnalysisId,
  methodId,
  uploads,
  rows,
  models,
}: UnitDetailsTabProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { controls, pickFile, dropFile } = useUnitUpload({ pricingAnalysisId, methodId, uploads });
  const activeUpload = uploads.find(u => u.isActive);
  const pillOf = pillIndexer(rows.map(r => r.modelName));
  const sum = (f: (r: LandBuildingUnitRowDto) => number | null | undefined) =>
    rows.reduce((acc, r) => acc + (f(r) ?? 0), 0);

  return (
    <div className="flex flex-col gap-[10px]">
      {controls}
      {!(activeUpload && rows.length > 0) && (
        <UnitUploadEmpty onPick={pickFile} onDrop={dropFile} />
      )}

      {/* Unit listing from active upload */}
      {activeUpload && rows.length > 0 && (
        <table className={UT_TABLE}>
          <thead>
            <tr>
              <th className={`${UT_TH} text-left left-0 z-[3] w-[48px]`}>#</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.planNo')}</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.houseNo')}</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.modelName')}</th>
              <th className={`${UT_TH} text-left`}>{t('hypothesis.units.cols.location')}</th>
              <th className={`${UT_TH} text-right`}>{t('hypothesis.units.cols.floorNo')}</th>
              <th className={`${UT_TH} text-right`}>{t('hypothesis.units.cols.landArea')}</th>
              <th className={`${UT_TH} text-right`}>{t('hypothesis.units.cols.usableArea')}</th>
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
                <td className={UT_TD}>{row.planNo ?? '—'}</td>
                <td className={UT_TD}>{row.houseNo ?? '—'}</td>
                <td className={UT_TD}>
                  <ModelPill index={pillOf(row.modelName)}>{row.modelName ?? '—'}</ModelPill>
                </td>
                <td className={UT_TD}>{row.location ?? '—'}</td>
                <td className={`${UT_TD} text-right`}>{row.floorNo ?? '—'}</td>
                <td className={`${UT_TD} text-right`}>{fmt(row.landAreaSqWa)}</td>
                <td className={`${UT_TD} text-right`}>{fmt(row.usableAreaSqM)}</td>
                <td className={`${UT_TD} text-right`}>{fmt(row.sellingPrice)}</td>
                <td className={`${UT_TD} text-[#8a96a0]`}>{row.remark1 || '—'}</td>
                <td className={`${UT_TD} text-[#8a96a0]`}>{row.remark2 || '—'}</td>
              </tr>
            ))}
            <tr>
              <td className={`${UT_FIN} sticky left-0 z-[1]`}>{t('hypothesis.units.total')}</td>
              <td colSpan={5} className={UT_FIN}>
                {t('hypothesis.units.houses', { n: rows.length })}
              </td>
              <td className={`${UT_FIN} text-right`}>{fmt(sum(r => r.landAreaSqWa))}</td>
              <td className={UT_FIN} />
              <td className={`${UT_FIN} text-right`}>{fmt(sum(r => r.sellingPrice))}</td>
              <td colSpan={2} className={UT_FIN} />
            </tr>
          </tbody>
        </table>
      )}

      {/* Per-model analysis — mock v94 `hyModelAnalysis`: the title rides the first header cell */}
      {models && Object.keys(models).length > 0 && (
        <table className={UT_TABLE}>
          <thead>
            <tr>
              <th className={`${UT_TH} text-left`}>
                {t('upload.modelAnalysis')} · {t('upload.colModel')}
              </th>
              <th className={`${UT_TH} text-right`}>{t('upload.colUnits')}</th>
              <th className={`${UT_TH} text-right`}>{t('upload.colAvgArea')}</th>
              <th className={`${UT_TH} text-right`}>{t('upload.colTotalArea')}</th>
              <th className={`${UT_TH} text-right`}>{t('upload.colTotalRevenue')}</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(models).map(m => (
              <tr key={m.modelName}>
                <td className={UT_TD}>
                  <ModelPill index={pillOf(m.modelName)}>{m.modelName}</ModelPill>
                </td>
                <td className={`${UT_TD} text-right`}>{m.unitCount.toLocaleString()}</td>
                <td className={`${UT_TD} text-right`}>{fmt(m.avgLandAreaSqWa)}</td>
                <td className={`${UT_TD} text-right`}>{fmt(m.totalLandAreaSqWa)}</td>
                <td className={`${UT_TD} text-right`}>{fmt(m.totalSellingPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
