/**
 * Cost of Building tab (Tab 2 of L&B) — house model → building mapping (HANDOFF 18c, mock v94).
 *
 * Each house model picks one building from the property group; that building's Final Cost Value
 * (its override from the building-detail page, else the depreciated sum rounded to the thousand)
 * is the construction cost per house. It reads the PROPERTY, never a Building Cost method, so the
 * screen is the same whether or not the appraiser ever made one.
 *
 * `รวม` arrives filled with per-house × units and stays editable; typing stores `totalCost`, and
 * "ใช้ค่าที่คำนวณ" clears it back to null. A model with no building costs 0 and warns — saving is
 * not blocked (user, 2026-09-21). The backend recomputes the same figure and is the one of record.
 */
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/components';
import Badge from '@/shared/components/Badge';
import NumberInput from '@/shared/components/inputs/NumberInput';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { fmt } from '../../../domain/formatters';
import { buildingFinalCostValue } from '../../../domain/calculation';
import type { LandBuildingFormValues } from '../../../schemas/hypothesisForm';
import type { LandBuildingModelAggregate } from '../../../types/hypothesis';

// Same building types CostBuildingPanel lists — the backend's per-building SQL covers every
// property with a building detail in the group, which is these.
const BUILDING_TYPES = ['B', 'LB', 'LSB', 'LS'];

type Mapping = LandBuildingFormValues['modelBuildingMappings'][number];

const TD = 'px-[8px] py-0 h-[26px] border-r border-r-[#eef2f2]';
const TH = 'px-[8px] py-0 h-[26px] border-r border-b border-gray-200 font-semibold text-gray-600';

interface CostOfBuildingTabProps {
  models: Record<string, LandBuildingModelAggregate> | null;
  properties?: Record<string, unknown>[];
}

export function CostOfBuildingTab({ models, properties }: CostOfBuildingTabProps) {
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = usePageReadOnly();
  const { control, setValue } = useFormContext<LandBuildingFormValues>();
  const mappings = useWatch({ control, name: 'modelBuildingMappings' }) ?? [];

  const buildings = (properties ?? [])
    .filter(p => BUILDING_TYPES.includes(p.propertyType as string))
    .map((p, i) => ({
      id: p.propertyId as string,
      name:
        (p.propertyName as string) || t('hypothesis.costTab.buildingFallback', { index: i + 1 }),
      value: buildingFinalCostValue(p),
    }));

  const modelList = models ? Object.values(models) : [];
  if (modelList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Icon name="upload" style="regular" className="size-8 text-gray-300" />
        <p className="text-sm text-gray-500 font-medium">{t('hypothesis.costTab.noUnits')}</p>
        <p className="text-xs text-gray-400">{t('hypothesis.costTab.noUnitsHint')}</p>
      </div>
    );
  }

  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const mappingOf = (modelName: string): Mapping =>
    mappings.find(m => same(m.modelName, modelName)) ?? {
      modelName,
      appraisalPropertyId: null,
      totalCost: null,
    };
  // Upsert one model's row, keeping everyone else's as-is.
  const update = (modelName: string, patch: Partial<Mapping>) => {
    const next = { ...mappingOf(modelName), ...patch };
    const rest = mappings.filter(m => !same(m.modelName, modelName));
    setValue('modelBuildingMappings', [...rest, next], { shouldDirty: true });
  };

  const rows = modelList.map(m => {
    const mapping = mappingOf(m.modelName);
    const building = buildings.find(b => b.id === mapping.appraisalPropertyId);
    const perUnit = building?.value ?? 0;
    const computed = perUnit * m.unitCount;
    return { m, mapping, building, perUnit, computed, total: mapping.totalCost ?? computed };
  });

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="text-[12px] text-gray-600 bg-primary/5 border border-primary/15 rounded-md px-[10px] py-[6px]">
        {t('hypothesis.costTab.banner')}
      </div>
      {buildings.length === 0 && (
        <div className="text-[12px] text-amber-700">{t('hypothesis.costTab.noBuildings')}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-[12px] leading-[25px] border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className={`${TH} text-left sticky left-0 bg-gray-50 w-[190px]`}>
                {t('hypothesis.costTab.colModel')}
              </th>
              <th className={`${TH} text-right w-[90px]`}>{t('hypothesis.costTab.colUnits')}</th>
              <th className={`${TH} text-left`}>{t('hypothesis.costTab.colBuilding')}</th>
              <th className={`${TH} text-right w-[160px]`}>{t('hypothesis.costTab.colPerUnit')}</th>
              <th className={`${TH} text-right w-[240px] border-r-0`}>
                {t('hypothesis.costTab.colTotal')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, mapping, building, perUnit, computed, total }) => {
              const edited = mapping.totalCost != null;
              const diff = total - computed;
              return (
                <tr key={m.modelName} className="border-b border-gray-100">
                  <td className={`${TD} sticky left-0 bg-white font-medium text-gray-800`}>
                    {m.modelName}
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{fmt(m.unitCount)}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-[6px]">
                      <select
                        value={mapping.appraisalPropertyId ?? ''}
                        disabled={readOnly}
                        onChange={e =>
                          update(m.modelName, { appraisalPropertyId: e.target.value || null })
                        }
                        aria-label={t('hypothesis.costTab.buildingAria', { model: m.modelName })}
                        className="h-[21px] text-[12px] border border-gray-200 rounded px-[6px] bg-white min-w-[220px]"
                      >
                        <option value="">{t('hypothesis.costTab.notSelected')}</option>
                        {buildings.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name} · {fmt(b.value)}
                          </option>
                        ))}
                      </select>
                      {!building && (
                        <Badge tone="yellow" size="sm" dot={false}>
                          {t('hypothesis.costTab.warnNotSelected')}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>
                    {building ? fmt(perUnit) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-[8px] py-0 h-[26px] text-right">
                    <div className="flex items-center justify-end gap-[6px]">
                      {edited && (
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">
                          {t('hypothesis.costTab.edited', {
                            calc: fmt(computed),
                            diff: `${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))}`,
                          })}
                          {!readOnly && (
                            <>
                              {' · '}
                              <button
                                type="button"
                                className="text-primary hover:underline"
                                onClick={() => update(m.modelName, { totalCost: null })}
                              >
                                {t('hypothesis.costTab.useCalculated')}
                              </button>
                            </>
                          )}
                        </span>
                      )}
                      <div className="w-[120px] shrink-0">
                        <NumberInput
                          value={total}
                          disabled={readOnly}
                          decimalPlaces={2}
                          dense
                          aria-label={t('hypothesis.costTab.totalAria', { model: m.modelName })}
                          onChange={e => update(m.modelName, { totalCost: e.target.value })}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-800">
              <td className={`${TD} sticky left-0 bg-gray-50`}>
                {t('hypothesis.costTab.totalRow')}
              </td>
              <td className={`${TD} text-right tabular-nums`}>
                {fmt(rows.reduce((s, r) => s + r.m.unitCount, 0))}
              </td>
              <td className={TD} colSpan={2} />
              <td className="px-[8px] py-0 h-[26px] text-right tabular-nums">
                {fmt(rows.reduce((s, r) => s + r.total, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
