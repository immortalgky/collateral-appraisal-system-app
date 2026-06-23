import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { FormProvider } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import ActionBar from '@/shared/components/ActionBar';
import Checkbox from '@/shared/components/inputs/Checkbox';
import type { ApiError } from '@/shared/types/api';

import {
  useGetProjectPricingAssumptions,
  useSaveProjectPricingAssumptions,
} from '../../api/projectPricingAssumption';
import {
  useGetProjectUnitPrices,
  useCalculateProjectUnitPrices,
  useSaveProjectUnitPrices,
} from '../../api/projectUnitPrice';
import { isCondo, isLandAndBuildingLike } from '../../types';
import type {
  ProjectModelAssumption,
  ProjectUnitPrice,
  ProjectUnitPriceFlagData,
  ProjectType,
} from '../../types';
import {
  projectPricingAssumptionForm,
  condoPricingAssumptionFormDefaults,
  lbPricingAssumptionFormDefaults,
  type CondoPricingAssumptionFormType,
  type LbPricingAssumptionFormType,
} from '../../schemas/form';
import PricingAssumptionForm from '../../forms/PricingAssumptionForm';
import {
  CONDO_FIRE_INSURANCE_CONDITION_LABEL_BY_VALUE,
  LB_FIRE_INSURANCE_LABEL_BY_VALUE,
} from '../../data/options';
import { recomputeUnitPrice, type AssumptionInputs } from '../../utils/recomputeUnitPrice';
import Dropdown from '@/shared/components/inputs/Dropdown';

type AppError = AxiosError & { apiError?: ApiError };

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon name={icon} style="solid" className="w-5 h-5" />
      </div>
      <h2 className="text-base font-semibold text-gray-900">{label}</h2>
    </div>
  );
}

// ── Model Assumptions Table ───────────────────────────────────────────────────

const UNIT_PRICE_OPTIONS = [
  { label: 'Baht/sq. m', value: 'PerSquareMeter', isUsedForLand: false },
  { label: 'Baht', value: 'BahtPerUnit', isUsedForLand: true },
];

interface ModelAssumptionsTableProps {
  assumptions: ProjectModelAssumption[];
  projectType: ProjectType;
  selectedUnitKey: Map<string, string>; // tracks '1' or '2' per model
  standardPriceLookup: Map<string, number | undefined>; // resolved price per model
  onSelectUnit: (modelId: string, optionKey: string, price: number | undefined) => void;
}

function ModelAssumptionsTable({
  assumptions,
  projectType,
  selectedUnitKey,
  standardPriceLookup,
  onSelectUnit,
}: ModelAssumptionsTableProps) {
  const { t } = useTranslation('blockProject');
  if (assumptions.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-6">{t('unitPrice.noModelAssumptions')}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap min-w-[160px]">
              {t('unitPrice.cols.model')}
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium w-full min-w-[200px]">
              {t('unitPrice.cols.description')}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.usableAreaSqm2')}
            </th>
            {isLandAndBuildingLike(projectType) && (
              <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitPrice.cols.standardLandSqWa')}
              </th>
            )}
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.standardPriceBahtSqm')}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.coverageAmountBahtSqm')}
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.fireInsuranceCondition')}
            </th>
          </tr>
        </thead>
        <tbody>
          {assumptions.map(m => (
            <tr key={m.projectModelId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 font-medium text-gray-800">{m.modelType ?? '-'}</td>
              <td className="py-2 px-3 text-gray-600">{m.modelDescription ?? '-'}</td>
              <td className="py-2 px-3 text-right text-gray-800 whitespace-nowrap">
                {m.usableAreaFrom == null && m.usableAreaTo == null
                  ? '-'
                  : m.usableAreaFrom != null &&
                      m.usableAreaTo != null &&
                      m.usableAreaFrom !== m.usableAreaTo
                    ? `${m.usableAreaFrom.toLocaleString()} - ${m.usableAreaTo.toLocaleString()}`
                    : ((m.usableAreaFrom ?? m.usableAreaTo)?.toLocaleString() ?? '-')}
              </td>
              {isLandAndBuildingLike(projectType) && (
                <td className="py-2 px-3 text-right text-gray-800">
                  {m.standardLandPrice?.toLocaleString() ?? '-'}
                </td>
              )}
              <td className="py-2 px-3 text-right text-gray-800">
                {
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-36">
                        <Dropdown
                          options={UNIT_PRICE_OPTIONS.filter(o =>
                            isLandAndBuildingLike(projectType) ? o.isUsedForLand : !o.isUsedForLand,
                          )}
                          value={selectedUnitKey.get(m.projectModelId) ?? undefined}
                          showValuePrefix={false}
                          onChange={val =>
                            onSelectUnit(
                              m.projectModelId,
                              val,
                              val === 'PerSquareMeter' ? m.finalValueAdjusted : m.appraisalPrice,
                            )
                          }
                        />
                      </div>
                      {standardPriceLookup.get(m.projectModelId)?.toLocaleString() ?? '-'}
                    </div>
                  </>
                }
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.coverageAmount?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-gray-600">
                {m.fireInsuranceCondition
                  ? ((isCondo(projectType)
                      ? CONDO_FIRE_INSURANCE_CONDITION_LABEL_BY_VALUE[m.fireInsuranceCondition]
                      : LB_FIRE_INSURANCE_LABEL_BY_VALUE[m.fireInsuranceCondition]) ??
                    m.fireInsuranceCondition)
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Unit Price Result Table ───────────────────────────────────────────────────
// NOTE: UnitPriceResultTable is intentionally OUTSIDE <FormProvider>.
// Flag checkboxes (Condo + LB) directly call saveUnitFlags + calculatePrices and do
// not participate in RHF state.

function fmt(value?: number | null) {
  return (
    value?.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) ?? '-'
  );
}

// Condo: editable FlagCell (checkbox + amount column)
function FlagCell({
  checked,
  amount,
  onChange,
  disabled,
}: {
  checked: boolean;
  amount?: number | null;
  onChange: (next: boolean) => void;
  disabled: boolean;
}) {
  return (
    <td className="py-2 px-3 whitespace-nowrap">
      <div className="flex items-center gap-2">
        <Checkbox checked={checked} onChange={onChange} disabled={disabled} />
        {checked && <span className="text-gray-800">{fmt(amount)}</span>}
      </div>
    </td>
  );
}

type CondoFlag = 'isCorner' | 'isEdge' | 'isPoolView' | 'isSouth' | 'isOther' | 'isNearGarden';

interface UnitPriceResultTableProps {
  unitPrices: ProjectUnitPrice[];
  projectType: ProjectType;
  isLoading: boolean;
  pricingAssumption:
    | {
        cornerAdjustment?: number | null;
        edgeAdjustment?: number | null;
        poolViewAdjustment?: number | null;
        southAdjustment?: number | null;
        otherAdjustment?: number | null;
        nearGardenAdjustment?: number | null;
      }
    | null
    | undefined;
  onToggleFlag: (unitId: string, flag: CondoFlag, value: boolean) => void;
  isDisabled: boolean;
}

function UnitPriceResultTable({
  unitPrices,
  projectType,
  isLoading,
  pricingAssumption,
  onToggleFlag,
  isDisabled,
}: UnitPriceResultTableProps) {
  const { t } = useTranslation('blockProject');
  const totals = useMemo(() => {
    const sum = (fn: (up: ProjectUnitPrice) => number | null | undefined): number =>
      unitPrices.reduce((acc, up) => {
        const v = fn(up);
        return v != null ? acc + v : acc;
      }, 0);
    const adj = pricingAssumption;
    const cornerCount = unitPrices.filter(up => up.isCorner).length;
    const edgeCount = unitPrices.filter(up => up.isEdge).length;
    const poolViewCount = unitPrices.filter(up => up.isPoolView).length;
    const southCount = unitPrices.filter(up => up.isSouth).length;
    const otherCount = unitPrices.filter(up => up.isOther).length;
    const nearGardenCount = unitPrices.filter(up => up.isNearGarden).length;
    return {
      unitCount: unitPrices.length,
      usableArea: sum(up => up.usableArea),
      sellingPrice: sum(up => up.sellingPrice),
      landArea: sum(up => up.landArea),
      cornerCount,
      cornerAmount: cornerCount > 0 ? cornerCount * (adj?.cornerAdjustment ?? 0) : null,
      edgeCount,
      edgeAmount: edgeCount > 0 ? edgeCount * (adj?.edgeAdjustment ?? 0) : null,
      poolViewCount,
      poolViewAmount: poolViewCount > 0 ? poolViewCount * (adj?.poolViewAdjustment ?? 0) : null,
      southCount,
      southAmount: southCount > 0 ? southCount * (adj?.southAdjustment ?? 0) : null,
      otherCount,
      otherAmount: otherCount > 0 ? otherCount * (adj?.otherAdjustment ?? 0) : null,
      nearGardenCount,
      nearGardenAmount:
        nearGardenCount > 0 ? nearGardenCount * (adj?.nearGardenAdjustment ?? 0) : null,
      adjustPriceLocation: sum(up => up.adjustPriceLocation),
      landAreaDifference: sum(up => up.landAreaDifference),
      landIncreaseDecreaseAmount: sum(up => up.landIncreaseDecreaseAmount),
      totalAppraisalValue: sum(up => up.totalAppraisalValue),
      totalAppraisalValueRounded: sum(up => up.totalAppraisalValueRounded),
      forceSellingPrice: sum(up => up.forceSellingPrice),
      coverageAmount: sum(up =>
        up.coverageAmount != null && up.usableArea != null
          ? up.coverageAmount * up.usableArea
          : null,
      ),
    };
  }, [unitPrices, pricingAssumption]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (unitPrices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <Icon name="calculator" className="text-3xl mb-2" />
        <p className="text-sm">{t('unitPrice.noUnitsUploaded')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.seqNo')}
            </th>
            {isCondo(projectType) && (
              <>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium">
                  {t('unitPrice.cols.floor')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.towerName')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.regNumber')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.roomNo')}
                </th>
              </>
            )}
            {isLandAndBuildingLike(projectType) && (
              <>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.plotNo')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.houseNo')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.model')}
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.numberOfFloors')}
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.landAreaSqWa')}
                </th>
              </>
            )}
            {isCondo(projectType) && (
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                {t('unitPrice.cols.model')}
              </th>
            )}
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.usableAreaSqm')}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.sellingPrice')}
            </th>
            {/* Common flags */}
            {isCondo(projectType) ? (
              <>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                  {t('unitPrice.cols.corner')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                  {t('unitPrice.cols.edge')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.poolView')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                  {t('unitPrice.cols.south')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                  {t('unitPrice.cols.other')}
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.adjustPriceLocation')}
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.standardPrice')}
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.priceIncrementFloor')}
                </th>
              </>
            ) : (
              <>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                  {t('unitPrice.cols.corner')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                  {t('unitPrice.cols.edge')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.nearGardenClubhouse')}
                </th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">
                  {t('unitPrice.cols.other')}
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.landDiffSqWa')}
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.landPlusMinus')}
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.locationAdj')}
                </th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {t('unitPrice.cols.standardPrice')}
                </th>
              </>
            )}
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.appraisalValue')}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.roundedValue')}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.forceSalePrice')}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {t('unitPrice.cols.coverageAmount')}
            </th>
          </tr>
        </thead>
        <tbody>
          {unitPrices.map(up => (
            <tr key={up.projectUnitId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-center text-gray-700">{up.sequenceNumber}</td>
              {isCondo(projectType) && (
                <>
                  <td className="py-2 px-3 text-right text-gray-700">{up.floor ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{up.towerName ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{up.condoRegistrationNumber ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{up.roomNumber ?? '-'}</td>
                </>
              )}
              {isLandAndBuildingLike(projectType) && (
                <>
                  <td className="py-2 px-3 text-gray-700">{up.plotNumber ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{up.houseNumber ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{up.modelType ?? '-'}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{up.numberOfFloors ?? '-'}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{fmt(up.landArea)}</td>
                </>
              )}
              {isCondo(projectType) && (
                <td className="py-2 px-3 text-gray-700">{up.modelType ?? '-'}</td>
              )}
              <td className="py-2 px-3 text-right text-gray-700">{fmt(up.usableArea)}</td>
              <td className="py-2 px-3 text-right text-gray-700">{fmt(up.sellingPrice)}</td>
              {isCondo(projectType) ? (
                <>
                  <FlagCell
                    checked={up.isCorner}
                    amount={pricingAssumption?.cornerAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isCorner', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isEdge}
                    amount={pricingAssumption?.edgeAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isEdge', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isPoolView}
                    amount={pricingAssumption?.poolViewAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isPoolView', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isSouth}
                    amount={pricingAssumption?.southAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isSouth', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isOther}
                    amount={pricingAssumption?.otherAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isOther', v)}
                    disabled={isDisabled}
                  />
                  <td className="py-2 px-3 text-right text-gray-800">
                    {fmt(up.adjustPriceLocation)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-800">{fmt(up.standardPrice)}</td>
                  <td className="py-2 px-3 text-right text-gray-800">
                    {fmt(up.priceIncrementPerFloor)}
                  </td>
                </>
              ) : (
                <>
                  <FlagCell
                    checked={up.isCorner}
                    amount={pricingAssumption?.cornerAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isCorner', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isEdge}
                    amount={pricingAssumption?.edgeAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isEdge', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isNearGarden}
                    amount={pricingAssumption?.nearGardenAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isNearGarden', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isOther}
                    amount={pricingAssumption?.otherAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isOther', v)}
                    disabled={isDisabled}
                  />
                  <td className="py-2 px-3 text-right text-gray-800">
                    {up.landAreaDifference != null ? fmt(up.landAreaDifference) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-800">
                    {up.landIncreaseDecreaseAmount?.toLocaleString() ?? '-'}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-800">
                    {fmt(up.adjustPriceLocation)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-800">{fmt(up.standardPrice)}</td>
                </>
              )}
              <td className="py-2 px-3 text-right font-medium text-gray-900">
                {fmt(up.totalAppraisalValue)}
              </td>
              <td className="py-2 px-3 text-right font-medium text-gray-900">
                {fmt(up.totalAppraisalValueRounded)}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">{fmt(up.forceSellingPrice)}</td>
              <td className="py-2 px-3 text-right text-gray-800">
                {fmt(
                  up.coverageAmount != null && up.usableArea != null
                    ? up.coverageAmount * up.usableArea
                    : null,
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {unitPrices.length > 0 && (
          <tfoot>
            <tr className="bg-primary/5 border-t-2 border-primary/20">
              {isCondo(projectType) ? (
                <td
                  colSpan={6}
                  className="py-2.5 px-3 text-xs font-semibold text-primary whitespace-nowrap"
                >
                  {t('unitPrice.total', { n: totals.unitCount.toLocaleString() })}
                </td>
              ) : (
                <td
                  colSpan={5}
                  className="py-2.5 px-3 text-xs font-semibold text-primary whitespace-nowrap"
                >
                  {t('unitPrice.total', { n: totals.unitCount.toLocaleString() })}
                </td>
              )}
              {isLandAndBuildingLike(projectType) && (
                <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-800">
                  {fmt(totals.landArea)}
                </td>
              )}
              <td className="py-2.5 px-3" />
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-800">
                {fmt(totals.sellingPrice)}
              </td>
              {/* Flag totals */}
              <td className="py-2.5 px-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                {totals.cornerCount > 0 ? (
                  <>
                    {totals.cornerCount} · {fmt(totals.cornerAmount)}
                  </>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                {totals.edgeCount > 0 ? (
                  <>
                    {totals.edgeCount} · {fmt(totals.edgeAmount)}
                  </>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              {isCondo(projectType) ? (
                <>
                  <td className="py-2.5 px-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {totals.poolViewCount > 0 ? (
                      <>
                        {totals.poolViewCount} · {fmt(totals.poolViewAmount)}
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {totals.southCount > 0 ? (
                      <>
                        {totals.southCount} · {fmt(totals.southAmount)}
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </>
              ) : (
                <td className="py-2.5 px-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                  {totals.nearGardenCount > 0 ? (
                    <>
                      {totals.nearGardenCount} · {fmt(totals.nearGardenAmount)}
                    </>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              )}
              <td className="py-2.5 px-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                {totals.otherCount > 0 ? (
                  <>
                    {totals.otherCount} · {fmt(totals.otherAmount)}
                  </>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              {isLandAndBuildingLike(projectType) && (
                <>
                  <td className="py-2.5 px-3 text-right text-xs font-medium text-gray-700">
                    {fmt(totals.landAreaDifference)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-medium text-gray-700">
                    {fmt(totals.landIncreaseDecreaseAmount)}
                  </td>
                </>
              )}
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-800">
                {fmt(totals.adjustPriceLocation)}
              </td>
              {/* Standard Price — skip (per-sqm rate, not summable) */}
              <td className="py-2.5 px-3" />
              {isCondo(projectType) && (
                /* Price Increment/Floor — not summable */
                <td className="py-2.5 px-3" />
              )}
              <td className="py-2.5 px-3 text-right text-xs font-bold text-primary">
                {fmt(totals.totalAppraisalValue)}
              </td>
              <td className="py-2.5 px-3 text-right text-xs font-bold text-primary">
                {fmt(totals.totalAppraisalValueRounded)}
              </td>
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-800">
                {fmt(totals.forceSellingPrice)}
              </td>
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-800">
                {fmt(totals.coverageAmount)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface UnitPriceTabProps {
  projectType: ProjectType;
}

export default function UnitPriceTab({ projectType }: UnitPriceTabProps) {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId();
  const isReadOnly = usePageReadOnly();

  const schema = projectPricingAssumptionForm(projectType);
  const defaults = isCondo(projectType)
    ? condoPricingAssumptionFormDefaults
    : lbPricingAssumptionFormDefaults;

  const { data: pricingAssumption, isLoading: assumptionLoading } = useGetProjectPricingAssumptions(
    appraisalId ?? '',
  );

  const { data: unitPricesData, isLoading: pricesLoading } = useGetProjectUnitPrices(
    appraisalId ?? '',
  );

  // Local mirror of unit prices: lets the user toggle flags and see an immediate
  // client-side recompute (preview). The backend remains the source of truth on
  // Save / Save Draft — the query is invalidated after save and this state is
  // refilled from the fresh server data via the useEffect below.
  const [localUnitPrices, setLocalUnitPrices] = useState<ProjectUnitPrice[]>([]);
  const [flagsDirty, setFlagsDirty] = useState(false);
  const [saveIntent, setSaveIntent] = useState<'draft' | 'full' | null>(null);
  useEffect(() => {
    setLocalUnitPrices(unitPricesData ?? []);
    setFlagsDirty(false);
  }, [unitPricesData]);

  const { mutateAsync: saveAssumptionAsync, isPending: isSaving } =
    useSaveProjectPricingAssumptions();
  const { mutateAsync: calculatePricesAsync, isPending: isCalculating } =
    useCalculateProjectUnitPrices();
  const { mutateAsync: saveUnitFlagsAsync, isPending: isSavingFlags } = useSaveProjectUnitPrices();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty },
  } = methods;

  useEffect(() => {
    if (pricingAssumption) {
      if (isCondo(projectType)) {
        reset({
          locationMethod: pricingAssumption.locationMethod ?? 'AdjustPriceSqm',
          cornerAdjustment: pricingAssumption.cornerAdjustment ?? null,
          edgeAdjustment: pricingAssumption.edgeAdjustment ?? null,
          otherAdjustment: pricingAssumption.otherAdjustment ?? null,
          poolViewAdjustment: pricingAssumption.poolViewAdjustment ?? null,
          southAdjustment: pricingAssumption.southAdjustment ?? null,
          floorIncrementEveryXFloor: pricingAssumption.floorIncrementEveryXFloor ?? null,
          floorIncrementAmount: pricingAssumption.floorIncrementAmount ?? null,
          forceSalePercentage: pricingAssumption.forceSalePercentage ?? null,
        } satisfies CondoPricingAssumptionFormType);
      } else {
        reset({
          locationMethod: pricingAssumption.locationMethod ?? 'AdjustPriceSqm',
          cornerAdjustment: pricingAssumption.cornerAdjustment ?? null,
          edgeAdjustment: pricingAssumption.edgeAdjustment ?? null,
          otherAdjustment: pricingAssumption.otherAdjustment ?? null,
          nearGardenAdjustment: pricingAssumption.nearGardenAdjustment ?? null,
          landIncreaseDecreaseRate: pricingAssumption.landIncreaseDecreaseRate ?? null,
          forceSalePercentage: pricingAssumption.forceSalePercentage ?? null,
        } satisfies LbPricingAssumptionFormType);
      }
    }
  }, [pricingAssumption, reset, projectType]);

  // Live form values for the client-side preview recompute (uses unsaved edits).
  // Cast: react-hook-form's generic is `any` here since the schema differs per project type.
  const watchedAssumption = useWatch({ control: methods.control }) as AssumptionInputs;

  // Persist: save flags + assumption together. When `withCalculate` is true
  // the backend recomputes and becomes the source of truth; the unit-prices
  // query is invalidated by the mutation hooks, refilling local state.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persistAssumption = async (data: any, withCalculate: boolean) => {
    if (!appraisalId) return;
    setSaveIntent(withCalculate ? 'full' : 'draft');
    const flags: ProjectUnitPriceFlagData[] = localUnitPrices.map(up => ({
      projectUnitId: up.projectUnitId,
      isCorner: up.isCorner,
      isEdge: up.isEdge,
      isPoolView: up.isPoolView,
      isSouth: up.isSouth,
      isOther: up.isOther,
      isNearGarden: up.isNearGarden,
    }));

    const modelAssumptionsPayload = modelAssumptions.map(m => ({
      ...m,
      standardPriceUnit: selectedUnitKey.get(m.projectModelId) ?? 'BahtPerUnit',
    }));

    try {
      if (flags.length > 0) {
        await saveUnitFlagsAsync({ appraisalId, flags });
      }
      await saveAssumptionAsync({
        appraisalId,
        data: { ...data, modelAssumptions: modelAssumptionsPayload },
      });
      reset(data);

      if (withCalculate) {
        await calculatePricesAsync({ appraisalId });
        toast.success(t('toasts.pricing.saveSuccess'));
      } else {
        toast.success(t('toasts.pricing.saveDraftSuccess'));
      }
    } catch (err) {
      const error = err as AppError;
      toast.error(error?.apiError?.detail ?? t('toasts.pricing.saveFailed'));
    } finally {
      setSaveIntent(null);
    }
  };

  // Toggle a flag client-side only — just flips the flag on the local row.
  // The displayed totals are derived below via `displayedUnitPrices`, so any
  // change to the assumption form OR a flag toggle re-runs the preview.
  // No API call here — the server recomputes on Save / Save Draft.
  const handleToggleFlag = (unitId: string, flag: CondoFlag, value: boolean) => {
    setLocalUnitPrices(prev =>
      prev.map(up => (up.projectUnitId === unitId ? { ...up, [flag]: value } : up)),
    );
    setFlagsDirty(true);
  };

  const modelAssumptions = pricingAssumption?.modelAssumptions ?? [];

  // Lookup: modelType → model assumption fields needed for LB preview enrichment.
  const [selectedUnitKey, setSelectedUnitKey] = useState<Map<string, string>>(new Map());
  const [standardPriceLookup, setStandardPriceLookup] = useState<Map<string, number | undefined>>(
    new Map(),
  );

  useEffect(() => {
    if (!pricingAssumption) return;
    const assumptions = pricingAssumption.modelAssumptions ?? [];

    setSelectedUnitKey(
      new Map(
        assumptions.map(m => [
          m.projectModelId,
          m.standardPriceUnit === 'PerSquareMeter' ? 'PerSquareMeter' : 'BahtPerUnit',
        ]),
      ),
    );
    setStandardPriceLookup(
      new Map(
        assumptions.map(m => [
          m.projectModelId,
          m.standardPriceUnit === 'PerSquareMeter' ? m.finalValueAdjusted : m.appraisalPrice,
        ]),
      ),
    );
  }, [pricingAssumption]);

  const modelLookup = useMemo(
    () =>
      new Map(
        modelAssumptions.map(m => [
          m.modelType ?? '',
          {
            standardPrice: standardPriceLookup.get(m.projectModelId),
            standardPriceUnit: selectedUnitKey.get(m.projectModelId),
            coverageAmount: m.coverageAmount,
            // standardLandPrice holds the standard land AREA (Sq.Wa) — see DeriveFromModels
            standardLandArea: m.standardLandPrice,
          },
        ]),
      ),
    [modelAssumptions, selectedUnitKey, standardPriceLookup],
  );

  // Derived display rows: re-run the preview calc whenever the local flag set
  // OR the watched assumption form values change.
  const displayedUnitPrices = useMemo(
    () =>
      localUnitPrices.map(up => {
        const lookup = modelLookup.get(up.modelType ?? '');
        // For LB: compute land area diff and land +/- live from model standard land area.
        // Always recompute so it responds to rate / assumption changes in the form.
        const landAreaDifference =
          isLandAndBuildingLike(projectType) &&
          up.landArea != null &&
          lookup?.standardLandArea != null
            ? up.landArea - lookup.standardLandArea
            : up.landAreaDifference;
        const landIncreaseDecreaseAmount =
          landAreaDifference != null &&
          (watchedAssumption as AssumptionInputs).landIncreaseDecreaseRate != null
            ? landAreaDifference *
              ((watchedAssumption as AssumptionInputs).landIncreaseDecreaseRate as number)
            : up.landIncreaseDecreaseAmount;
        const enriched: typeof up = {
          ...up,
          standardPrice: lookup?.standardPrice ?? up.standardPrice ?? undefined,
          standardPriceUnit: lookup?.standardPriceUnit ?? up.standardPriceUnit,
          coverageAmount: lookup?.coverageAmount ?? up.coverageAmount ?? undefined,
          landAreaDifference,
          landIncreaseDecreaseAmount,
        };
        return recomputeUnitPrice(enriched, watchedAssumption, projectType);
      }),
    [localUnitPrices, watchedAssumption, projectType, modelLookup],
  );
  const isBusy = isSaving || isSavingFlags || isCalculating;

  return (
    <FormProvider methods={methods} schema={schema}>
      <form
        onSubmit={handleSubmit(data => persistAssumption(data, true))}
        className="flex flex-col h-full min-h-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          <div className="flex flex-col gap-6">
            {/* Model Assumptions (read-only display) */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <SectionHeader
                icon="layer-group"
                label={t('unitPrice.modelAssumptions')}
                color="bg-blue-50 text-blue-600"
              />
              <div className="h-px bg-gray-100 mb-4" />
              {assumptionLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <ModelAssumptionsTable
                  assumptions={modelAssumptions}
                  projectType={projectType}
                  selectedUnitKey={selectedUnitKey}
                  standardPriceLookup={standardPriceLookup}
                  onSelectUnit={(modelId, optionKey, price) => {
                    setSelectedUnitKey(prev => new Map(prev).set(modelId, optionKey));
                    setStandardPriceLookup(prev => new Map(prev).set(modelId, price));
                  }}
                />
              )}
            </div>

            {/* Pricing Assumption form */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <PricingAssumptionForm projectType={projectType} />
            </div>

            {/* Calculated Unit Prices */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader
                  icon="tags"
                  label={t('unitPrice.calculatedUnitPrices')}
                  color="bg-violet-50 text-violet-600"
                />
                {displayedUnitPrices.length > 0 && (
                  <span className="text-xs text-gray-500 self-start mt-0.5">
                    {t('unitPrice.totalUnits', { n: displayedUnitPrices.length.toLocaleString() })}
                  </span>
                )}
              </div>
              <div className="h-px bg-gray-100 mb-4" />
              <UnitPriceResultTable
                unitPrices={displayedUnitPrices}
                projectType={projectType}
                isLoading={pricesLoading}
                pricingAssumption={watchedAssumption}
                onToggleFlag={handleToggleFlag}
                isDisabled={isReadOnly || isBusy}
              />
            </div>
          </div>
        </div>

        {/* Sticky bottom action bar */}
        <ActionBar>
          <ActionBar.Left>
            {!isReadOnly && <ActionBar.UnsavedIndicator show={isDirty || flagsDirty} />}
          </ActionBar.Left>
          {!isReadOnly && (
            <ActionBar.Right>
              <Button
                variant="ghost"
                type="button"
                onClick={() => handleSubmit(data => persistAssumption(data, false))()}
                isLoading={saveIntent === 'draft' && isBusy}
                disabled={isBusy}
              >
                <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                Save Draft
              </Button>
              <Button type="submit" isLoading={saveIntent === 'full' && isBusy} disabled={isBusy}>
                <Icon name="calculator" style="solid" className="size-4 mr-2" />
                Save
              </Button>
            </ActionBar.Right>
          )}
        </ActionBar>
      </form>
    </FormProvider>
  );
}
