import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useAuthStore } from '@/features/auth/store';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { FormProvider } from '@/shared/components/form';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Badge from '@/shared/components/Badge';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Checkbox from '@/shared/components/inputs/Checkbox';
import Pagination from '@/shared/components/Pagination';
import { errorText } from '@/shared/utils/errorUtils';

import {
  useGetProjectPricingAssumptions,
  useSaveProjectPricingAssumptions,
} from '../../api/projectPricingAssumption';
import {
  useGetProjectUnitPrices,
  useGetUnitPriceSource,
  useCalculateProjectUnitPrices,
  useSaveProjectUnitPrices,
} from '../../api/projectUnitPrice';
import { isCondo, isLandAndBuildingLike } from '../../types';
import type {
  ProjectModelAssumption,
  ProjectUnitPrice,
  ProjectUnitPriceFlagData,
  ProjectType,
  UnitPriceSource,
  UnitPriceSourceInfo,
} from '../../types';
import {
  projectPricingAssumptionForm,
  condoPricingAssumptionFormDefaults,
  lbPricingAssumptionFormDefaults,
  type CondoPricingAssumptionFormType,
  type LbPricingAssumptionFormType,
} from '../../schemas/form';
import PricingAssumptionForm from '../../forms/PricingAssumptionForm';
import { useFireInsuranceOptions, useGetFireInsuranceRates } from '@/shared/api/pricingParameters';
import DataErrorState from '@/shared/components/DataErrorState';
import {
  buildDisplayedUnitPrices,
  differsFromStored,
  type AssumptionInputs,
  type ModelPricing,
} from '../../utils/recomputeUnitPrice';
import { SectionHeader as CardSectionHeader } from '@/shared/components/sections';
import UnitPriceImportCard from '../UnitPriceImportCard';
import UnitPriceImportDialog from '../UnitPriceImportDialog';

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

interface ModelAssumptionsTableProps {
  assumptions: ProjectModelAssumption[];
  projectType: ProjectType;
}

function ModelAssumptionsTable({ assumptions, projectType }: ModelAssumptionsTableProps) {
  const { t } = useTranslation('blockProject');
  const condoFireInsuranceOptions = useFireInsuranceOptions('Condo');
  const lbFireInsuranceOptions = useFireInsuranceOptions('LandAndBuilding');
  const fireInsuranceLabelByCondition = useMemo(() => {
    const options = isCondo(projectType) ? condoFireInsuranceOptions : lbFireInsuranceOptions;
    return new Map(options.map(o => [o.value, o.label]));
  }, [projectType, condoFireInsuranceOptions, lbFireInsuranceOptions]);

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
            {isCondo(projectType) && (
              <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap min-w-[100px]">
                {t('unitPrice.cols.towerName')}
              </th>
            )}
            <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap min-w-[160px]">
              {t('unitPrice.cols.model')}
            </th>
            <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold w-full min-w-[200px]">
              {t('unitPrice.cols.description')}
            </th>
            <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
              {t('unitPrice.cols.usableAreaSqm2')}
            </th>
            {isLandAndBuildingLike(projectType) && (
              <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                {t('unitPrice.cols.standardLandSqWa')}
              </th>
            )}
            <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
              {t('unitPrice.cols.standardPriceBahtSqm')}
            </th>
            <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
              {t('unitPrice.cols.coverageAmountBahtSqm')}
            </th>
            <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
              {t('unitPrice.cols.fireInsuranceCode')}
            </th>
          </tr>
        </thead>
        <tbody>
          {assumptions.map(m => (
            <tr key={m.projectModelId} className="border-b border-gray-100 hover:bg-gray-50">
              {isCondo(projectType) && (
                <td className="py-2 px-3 text-gray-600">{m.towerName ?? '-'}</td>
              )}
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
                {m.finalAppraisedValue?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.coverageAmount?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-gray-600">
                {m.fireInsuranceCode
                  ? (fireInsuranceLabelByCondition.get(m.fireInsuranceCode) ?? m.fireInsuranceCode)
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

function SoldChip({ show }: { show: boolean }) {
  const { t } = useTranslation('blockProject');
  if (!show) return null;
  return (
    <Badge size="sm" tone="gray" dot={false} className="ml-1.5 whitespace-nowrap">
      {t('unitPrice.soldChip')}
    </Badge>
  );
}

type CondoFlag = 'isCorner' | 'isEdge' | 'isPoolView' | 'isSouth' | 'isOther' | 'isNearGarden';

interface UnitPriceResultTableProps {
  unitPrices: ProjectUnitPrice[];
  projectType: ProjectType;
  /** Imported view: stored values only, no location flags or the columns derived from them. */
  imported: boolean;
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
  pageNumber: number;
  pageSize: number;
  onPageChange: (pageNumber: number) => void;
  onPageSizeChange: (size: number) => void;
}

function UnitPriceResultTable({
  unitPrices,
  projectType,
  imported,
  isLoading,
  pricingAssumption,
  onToggleFlag,
  isDisabled,
  pageNumber,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: UnitPriceResultTableProps) {
  const { t } = useTranslation('blockProject');
  const pagedUnitPrices = useMemo(
    () => unitPrices.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize),
    [unitPrices, pageNumber, pageSize],
  );
  const totalPages = Math.ceil(unitPrices.length / pageSize);
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
      // coverageAmount is already the per-unit total (see ProjectUnitPrice), so no x usableArea.
      coverageAmount: sum(up => up.coverageAmount),
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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-xs text-center py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                {t('unitPrice.cols.seqNo')}
              </th>
              {isCondo(projectType) && (
                <>
                  <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold">
                    {t('unitPrice.cols.floor')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.towerName')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.regNumber')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.roomNo')}
                  </th>
                </>
              )}
              {isLandAndBuildingLike(projectType) && (
                <>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.plotNo')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.houseNo')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.model')}
                  </th>
                  <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.numberOfFloors')}
                  </th>
                  <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.landAreaSqWa')}
                  </th>
                </>
              )}
              {isCondo(projectType) && (
                <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                  {t('unitPrice.cols.model')}
                </th>
              )}
              <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                {t('unitPrice.cols.usableAreaSqm')}
              </th>
              <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                {t('unitPrice.cols.sellingPrice')}
              </th>
              <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                {t('unitPrice.cols.standardPrice')}
              </th>
              {/* Location flags and the columns derived from them: Calculated view only */}
              {imported ? null : isCondo(projectType) ? (
                <>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold">
                    {t('unitPrice.cols.corner')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold">
                    {t('unitPrice.cols.edge')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.poolView')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold">
                    {t('unitPrice.cols.south')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold">
                    {t('unitPrice.cols.other')}
                  </th>
                  <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.adjustPriceLocation')}
                  </th>
                  <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.priceIncrementFloor')}
                  </th>
                </>
              ) : (
                <>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold">
                    {t('unitPrice.cols.corner')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold">
                    {t('unitPrice.cols.edge')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.nearGardenClubhouse')}
                  </th>
                  <th className="text-xs text-left py-2.5 px-3 text-gray-500 font-semibold">
                    {t('unitPrice.cols.other')}
                  </th>
                  <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.landDiffSqWa')}
                  </th>
                  <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.landPlusMinus')}
                  </th>
                  <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                    {t('unitPrice.cols.locationAdj')}
                  </th>
                </>
              )}
              <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                {t('unitPrice.cols.appraisalValue')}
              </th>
              <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                {t('unitPrice.cols.roundedValue')}
              </th>
              <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                {t('unitPrice.cols.forceSalePrice')}
              </th>
              <th className="text-xs text-right py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">
                {t('unitPrice.cols.coverageAmount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedUnitPrices.map(up => (
              <tr key={up.projectUnitId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-center text-gray-700">{up.sequenceNumber}</td>
                {isCondo(projectType) && (
                  <>
                    <td className="py-2 px-3 text-right text-gray-700">{up.floor ?? '-'}</td>
                    <td className="py-2 px-3 text-gray-700">{up.towerName ?? '-'}</td>
                    <td className="py-2 px-3 text-gray-700">{up.condoRegistrationNumber ?? '-'}</td>
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">
                      {up.roomNumber ?? '-'}
                      <SoldChip show={up.isSold} />
                    </td>
                  </>
                )}
                {isLandAndBuildingLike(projectType) && (
                  <>
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">
                      {up.plotNumber ?? '-'}
                      <SoldChip show={up.isSold} />
                    </td>
                    <td className="py-2 px-3 text-gray-700">{up.houseNumber ?? '-'}</td>
                    <td className="py-2 px-3 text-gray-700">{up.modelType ?? '-'}</td>
                    <td className="py-2 px-3 text-right text-gray-700">
                      {up.numberOfFloors ?? '-'}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700">{fmt(up.landArea)}</td>
                  </>
                )}
                {isCondo(projectType) && (
                  <td className="py-2 px-3 text-gray-700">{up.modelType ?? '-'}</td>
                )}
                <td className="py-2 px-3 text-right text-gray-700">{fmt(up.usableArea)}</td>
                <td className="py-2 px-3 text-right text-gray-700">{fmt(up.sellingPrice)}</td>
                <td className="py-2 px-3 text-right text-gray-800">{fmt(up.standardPrice)}</td>
                {imported ? null : isCondo(projectType) ? (
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
                  </>
                )}
                <td className="py-2 px-3 text-right font-medium text-gray-900">
                  {fmt(up.totalAppraisalValue)}
                </td>
                <td className="py-2 px-3 text-right font-medium text-gray-900">
                  {fmt(up.totalAppraisalValueRounded)}
                </td>
                <td className="py-2 px-3 text-right text-gray-800">{fmt(up.forceSellingPrice)}</td>
                <td className="py-2 px-3 text-right text-gray-800">{fmt(up.coverageAmount)}</td>
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
                    {t('unitPrice.total', {
                      count: totals.unitCount,
                      n: totals.unitCount.toLocaleString(),
                    })}
                  </td>
                ) : (
                  <td
                    colSpan={5}
                    className="py-2.5 px-3 text-xs font-semibold text-primary whitespace-nowrap"
                  >
                    {t('unitPrice.total', {
                      count: totals.unitCount,
                      n: totals.unitCount.toLocaleString(),
                    })}
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
                {/* Standard Price — skip (per-sqm rate, not summable) */}
                <td className="py-2.5 px-3" />
                {/* Flag totals and derived columns: Calculated view only */}
                {!imported && (
                  <>
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
                    {isCondo(projectType) && (
                      /* Price Increment/Floor — not summable */
                      <td className="py-2.5 px-3" />
                    )}
                  </>
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
      <Pagination
        currentPage={pageNumber}
        totalPages={totalPages}
        totalCount={unitPrices.length}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 25, 50, 75, 100]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
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

  const {
    data: pricingAssumption,
    isLoading: assumptionLoading,
    isError: assumptionError,
    isFetching: assumptionFetching,
    refetch: refetchAssumption,
  } = useGetProjectPricingAssumptions(appraisalId ?? '');

  const {
    data: unitPricesData,
    isLoading: pricesLoading,
    isError: pricesError,
    isFetching: pricesFetching,
    refetch: refetchPrices,
  } = useGetProjectUnitPrices(appraisalId ?? '', { alwaysRefetch: true });
  const {
    data: sourceInfo,
    isLoading: sourceLoading,
    isFetching: sourceFetching,
    dataUpdatedAt: sourceUpdatedAt,
    refetch: refetchSource,
  } = useGetUnitPriceSource(appraisalId ?? '', { alwaysRefetch: true });
  const {
    data: fireRates,
    isLoading: ratesLoading,
    isError: ratesError,
    refetch: refetchRates,
  } = useGetFireInsuranceRates({ alwaysRefetch: true });

  // The server's price source is the truth; the toggle only overrides it locally. After an import
  // or a Save (calculate) succeeds the override is set to the new source, so the tab doesn't flash
  // the stale server mode while the source query refetches. Never reset by an effect.
  const [modeOverride, setModeOverride] = useState<UnitPriceSource | null>(null);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  // The source as known after this tab's own last write. A successful import / calculate has
  // changed it on the server, but the cached value stays until the refetch lands: this is
  // authoritative in between. Dropped only by a source read that completed after the write began
  // (dataUpdatedAt) and says the same: a failed refetch leaves the cached record, which may be older.
  const [writtenSource, setWrittenSource] = useState<UnitPriceSource | null>(null);
  const [writtenAt, setWrittenAt] = useState(0);
  // Likewise the details of the file just imported, so the card doesn't show the previous file (or
  // none) until the refetch brings the server's own record.
  const [justImported, setJustImported] = useState<Pick<
    UnitPriceSourceInfo,
    'fileName' | 'importedAt' | 'importedBy'
  > | null>(null);
  const currentUsername = useAuthStore(s => s.user?.username ?? null);
  useEffect(() => {
    if (
      writtenSource &&
      !sourceFetching &&
      sourceUpdatedAt > writtenAt &&
      sourceInfo?.source === writtenSource &&
      // After an import the record must also be the new file's: a read that began before the import
      // and landed after it can carry the same source with the previous file.
      (!justImported || sourceInfo.fileName === justImported.fileName)
    ) {
      setWrittenSource(null);
      setJustImported(null);
    }
  }, [
    writtenSource,
    writtenAt,
    justImported,
    sourceFetching,
    sourceUpdatedAt,
    sourceInfo?.source,
    sourceInfo?.fileName,
  ]);
  const serverSource = writtenSource ?? sourceInfo?.source;
  // Built on the effective source (written, else server): a stale cached 'Imported' record must not
  // read as current after a calculate; the file details only follow a just-finished import.
  const cardSource: UnitPriceSourceInfo | undefined = sourceInfo && {
    ...sourceInfo,
    source: serverSource ?? sourceInfo.source,
    ...(writtenSource === 'Imported' && justImported ? justImported : {}),
  };
  const mode: UnitPriceSource = modeOverride ?? serverSource ?? 'Calculated';
  const imported = mode === 'Imported';
  // The Imported view can be open while the server still holds calculated prices (local toggle);
  // only then-stored prices from a real import get the "imported file" labels and metadata.
  const showingImported = imported && serverSource === 'Imported';

  // Local mirror of unit prices: lets the user toggle flags and see an immediate
  // client-side recompute (preview). The backend remains the source of truth on
  // Save / Save Draft — the query is invalidated after save and this state is
  // refilled from the fresh server data via the useEffect below.
  const [localUnitPrices, setLocalUnitPrices] = useState<ProjectUnitPrice[]>([]);
  const [flagsDirty, setFlagsDirty] = useState(false);
  const [saveIntent, setSaveIntent] = useState<'draft' | 'full' | null>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  useEffect(() => {
    setLocalUnitPrices(unitPricesData ?? []);
    setFlagsDirty(false);
    setPageNumber(prev => {
      const totalPages = Math.max(1, Math.ceil((unitPricesData?.length ?? 0) / pageSize));
      return Math.min(prev, totalPages - 1);
    });
  }, [unitPricesData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page: number) => setPageNumber(page);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNumber(0);
  };

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

  const resetFormToServer = useCallback(() => {
    // Nothing saved yet: back to the type's blank form.
    if (!pricingAssumption) {
      reset(defaults);
    } else {
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
  }, [pricingAssumption, reset, projectType, defaults]);
  useEffect(() => {
    if (pricingAssumption) resetFormToServer();
  }, [pricingAssumption, resetFormToServer]);

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
    const startedAt = Date.now();
    const flags: ProjectUnitPriceFlagData[] = localUnitPrices.map(up => ({
      projectUnitId: up.projectUnitId,
      isCorner: up.isCorner,
      isEdge: up.isEdge,
      isPoolView: up.isPoolView,
      isSouth: up.isSouth,
      isOther: up.isOther,
      isNearGarden: up.isNearGarden,
    }));

    try {
      if (flags.length > 0) {
        await saveUnitFlagsAsync({ appraisalId, flags });
      }
      await saveAssumptionAsync({ appraisalId, data });
      reset(data);
      // The flags are stored now. Not left to the [unitPricesData] effect: when the refetch returns
      // identical data React Query keeps the same reference and that effect never runs.
      setFlagsDirty(false);

      if (withCalculate) {
        await calculatePricesAsync({ appraisalId });
        setModeOverride('Calculated'); // the new server source, ahead of the refetch
        setWrittenSource('Calculated');
        setWrittenAt(startedAt);
        refetchRates(); // calculate priced with the current rates; the preview should too
        toast.success(t('toasts.pricing.saveSuccess'));
      } else {
        toast.success(t('toasts.pricing.saveDraftSuccess'));
      }
    } catch (err) {
      toast.error(errorText(err, t('toasts.pricing.saveFailed')));
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

  const modelAssumptions = useMemo(
    () => pricingAssumption?.modelAssumptions ?? [],
    [pricingAssumption],
  );

  // Current fire-insurance rate (Baht/sq.m.) per rate code. No property-kind filter: the backend's
  // calculate looks rates up by code alone.
  const fireRateByCode = useMemo(
    () => new Map((fireRates ?? []).map(r => [r.code, r.ratePerSqm])),
    [fireRates],
  );

  // The coverage rate for a model, as the backend resolves it: the current rate for its
  // fire-insurance code, else the one saved on the model assumption. The preview and the table of
  // assumptions both use it.
  const coverageRateOf = useCallback(
    (m: ProjectModelAssumption) =>
      (m.fireInsuranceCode ? fireRateByCode.get(m.fireInsuranceCode) : undefined) ??
      m.coverageAmount,
    [fireRateByCode],
  );
  const shownAssumptions = useMemo(
    () => modelAssumptions.map(m => ({ ...m, coverageAmount: coverageRateOf(m) })),
    [modelAssumptions, coverageRateOf],
  );

  // Lookup: projectModelId → model assumption fields needed for the live preview.
  // Keyed by id, not modelType — for Condo a model's identity is (Tower, ModelName), so the same
  // model name can legitimately repeat across towers with different standard price/coverage.
  // Keying by name alone would collapse those into one entry and misprice every unit whose model
  // name repeats in another tower.
  const modelLookup = useMemo(
    () =>
      new Map<string, ModelPricing>(
        modelAssumptions.map(m => [
          m.projectModelId,
          {
            standardPrice: m.finalAppraisedValue,
            coverageAmount: coverageRateOf(m),
            // standardLandPrice holds the standard land AREA (Sq.Wa) — see DeriveFromModels
            standardLandArea: m.standardLandPrice,
          },
        ]),
      ),
    [modelAssumptions, coverageRateOf],
  );

  // The form's forced-sale % (unsaved edits included) when it is a number in 0..100, else the
  // system default. Not the saved/effective rate: clearing the field stores null on Save, and the
  // backend then applies the system default (it also treats an out-of-range value that way).
  const previewAssumption = useMemo<AssumptionInputs>(() => {
    const entered = watchedAssumption.forceSalePercentage;
    const valid = typeof entered === 'number' && entered >= 0 && entered <= 100;
    return {
      ...watchedAssumption,
      forceSalePercentage: valid
        ? entered
        : (pricingAssumption?.systemDefaultForceSalePercentage ?? null),
    };
  }, [watchedAssumption, pricingAssumption?.systemDefaultForceSalePercentage]);

  // Calculated view: always the live recompute (what Save would write). Imported view: the
  // stored rows exactly as the API returned them.
  const displayedUnitPrices = useMemo(
    () =>
      imported
        ? localUnitPrices
        : buildDisplayedUnitPrices(localUnitPrices, previewAssumption, projectType, modelLookup),
    [imported, localUnitPrices, previewAssumption, projectType, modelLookup],
  );

  // The Calculated grid is only "calculated" when it equals what is stored. It is a preview while
  // the form or a flag is dirty, over an imported price list, or when the recompute differs from
  // the stored rows (never calculated, or a model price changed since the last Save). Not while the
  // lookup it is priced from is still loading or has failed: an empty lookup would mark every row
  // as changed.
  // A background refetch that fails while earlier data is on screen is not a failed load.
  // "No data" means undefined: a successful null (nothing saved yet) is data.
  const assumptionFailed = assumptionError && pricingAssumption === undefined;
  const ratesFailed = ratesError && fireRates === undefined;
  const pricesFailed = pricesError && unitPricesData === undefined;
  const lookupReady = !assumptionLoading && !assumptionFailed && !ratesLoading && !ratesFailed;
  // Skipped when the answer cannot matter: an edit already makes the grid "unsaved", and the Imported
  // view shows the stored rows themselves.
  const editing = isDirty || flagsDirty;
  const differs = useMemo(
    () => (editing || imported ? false : differsFromStored(displayedUnitPrices, localUnitPrices)),
    [editing, imported, displayedUnitPrices, localUnitPrices],
  );
  const previewDriven = lookupReady && (serverSource === 'Imported' || differs);
  // Unsaved: edits, or a recompute that differs from what is stored. The "Preview" badge is
  // stricter: it also needs the lookup the preview is priced from (an empty one would mislabel).
  const hasUnsaved = !imported && (isDirty || flagsDirty || previewDriven);
  const isPreviewing = hasUnsaved && lookupReady;
  const isBusy = isSaving || isSavingFlags || isCalculating || saveIntent !== null;
  // Save writes the form over the stored assumption, so it waits for that assumption to be known.
  // Nor before the source is fresh: a cached mode may be stale, and Save's meaning depends on it.
  const assumptionBlocked = assumptionLoading || assumptionFailed;
  // While the assumption or the stored prices are being refetched, the effects that copy the server's
  // values into the form and the local rows could overwrite an edit made in the meantime: so nothing
  // is editable (nor savable) until they have landed.
  const refreshing = assumptionFetching || pricesFetching;
  // One lock for everything the user can edit or save, so the parts cannot drift apart: read-only
  // page, a save in progress, or any of the data it is built on being refetched. (The source toggle
  // has its own rule.)
  const locked = isReadOnly || isBusy || refreshing || sourceFetching;

  const handleSwitchMode = (next: UnitPriceSource) => {
    if (isReadOnly || isBusy || next === mode) return;
    // Leaving an imported price list: nothing is written until Save, but warn first.
    if (next === 'Calculated' && serverSource === 'Imported') setConfirmSwitch(true);
    // Unsaved edits are not carried into the Imported view: ask, then drop them.
    else if (next === 'Imported' && (isDirty || flagsDirty)) setConfirmDiscard(true);
    else setModeOverride(next);
  };

  const handleDiscardAndImport = () => {
    resetFormToServer();
    setLocalUnitPrices(unitPricesData ?? []);
    setFlagsDirty(false);
    setModeOverride('Imported');
    setConfirmDiscard(false);
  };

  // Until the server says where the prices come from, nothing is offered: guessing Calculated
  // would put Save Draft in front of an imported price list.
  if (sourceLoading) {
    return (
      <div className="space-y-3 p-2" role="status" aria-label={t('unitPrice.source.loading')}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }
  // Only with no source data at all: a failed background refetch keeps the tab on screen.
  if (sourceInfo === undefined) {
    return <DataErrorState variant="inline" onRetry={() => refetchSource()} />;
  }

  return (
    <FormProvider methods={methods} schema={schema}>
      <form
        onSubmit={handleSubmit(data => persistAssumption(data, true))}
        className="flex flex-col h-full min-h-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          <div className="flex flex-col gap-6">
            {/* Price source */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <CardSectionHeader
                variant="card"
                title={t('unitPrice.source.label')}
                icon="tags"
                iconColor="blue"
                className="border-b-0!"
                rightIcon={
                  <SegmentedControl<UnitPriceSource>
                    label={t('unitPrice.source.label')}
                    value={mode}
                    onChange={handleSwitchMode}
                    options={[
                      {
                        value: 'Calculated',
                        label: t('unitPrice.source.calculated'),
                        icon: 'calculator',
                        disabled: (isReadOnly || isBusy) && mode !== 'Calculated',
                      },
                      {
                        value: 'Imported',
                        label: t('unitPrice.source.imported'),
                        icon: 'file-excel',
                        disabled: (isReadOnly || isBusy) && mode !== 'Imported',
                      },
                    ]}
                  />
                }
              />
            </div>

            {imported ? (
              <UnitPriceImportCard
                appraisalId={appraisalId ?? ''}
                source={cardSource}
                unitPrices={unitPricesData}
                pricesLoading={pricesLoading}
                isReadOnly={isReadOnly}
                onUpload={() => setUploadOpen(true)}
              />
            ) : (
              <>
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
                  ) : assumptionFailed ? (
                    // Retry lives on the unit price table below, which waits on the same query.
                    <DataErrorState variant="inline" />
                  ) : (
                    <ModelAssumptionsTable
                      assumptions={shownAssumptions}
                      projectType={projectType}
                    />
                  )}
                </div>

                {/* Pricing Assumption form: only once the saved assumption is known, so the blank
                    defaults can never be saved over it. */}
                {!assumptionBlocked && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <FormReadOnlyContext.Provider value={locked}>
                      <PricingAssumptionForm projectType={projectType} />
                    </FormReadOnlyContext.Provider>
                  </div>
                )}
              </>
            )}

            {/* Unit Prices: stored values, or the live preview while editing */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader
                  icon="tags"
                  label={t(
                    showingImported
                      ? 'unitPrice.importedUnitPrices'
                      : 'unitPrice.calculatedUnitPrices',
                  )}
                  color="bg-violet-50 text-violet-600"
                />
                <div className="flex items-center gap-2 self-start mt-0.5">
                  <Badge size="sm" tone={isPreviewing ? 'yellow' : 'gray'} dot={false}>
                    {t(
                      showingImported
                        ? 'unitPrice.valuesImported'
                        : isPreviewing
                          ? 'unitPrice.valuesPreview'
                          : 'unitPrice.valuesCalculated',
                    )}
                  </Badge>
                  {displayedUnitPrices.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {t('unitPrice.totalUnits', {
                        count: displayedUnitPrices.length,
                        n: displayedUnitPrices.length.toLocaleString(),
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-px bg-gray-100 mb-4" />
              {pricesFailed ? (
                // A failed load must not read as "no units uploaded".
                <DataErrorState variant="inline" onRetry={() => refetchPrices()} />
              ) : !imported && (assumptionFailed || ratesFailed) ? (
                <DataErrorState
                  variant="inline"
                  onRetry={() => {
                    if (assumptionFailed) refetchAssumption();
                    if (ratesFailed) refetchRates();
                  }}
                />
              ) : (
                <UnitPriceResultTable
                  unitPrices={displayedUnitPrices}
                  projectType={projectType}
                  imported={imported}
                  // The preview prices every row from the model lookup and the fire-insurance rates: until
                  // both have loaded (or if one failed) rows would come out priced at 0, so wait for them.
                  isLoading={pricesLoading || (!imported && (assumptionLoading || ratesLoading))}
                  pricingAssumption={watchedAssumption}
                  onToggleFlag={handleToggleFlag}
                  isDisabled={locked}
                  pageNumber={pageNumber}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sticky bottom action bar */}
        <ActionBar>
          <ActionBar.Left>
            <CancelButton />
            {!isReadOnly && !imported && (
              <>
                <ActionBar.Divider />
                <ActionBar.UnsavedIndicator show={hasUnsaved} />
              </>
            )}
          </ActionBar.Left>
          {!isReadOnly && !imported && (
            <ActionBar.Right>
              {/* Over an imported price list only Save is offered: it recalculates and flips the
                  source, whereas a draft would leave the imported prices next to new assumptions. */}
              {serverSource !== 'Imported' && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => handleSubmit(data => persistAssumption(data, false))()}
                  isLoading={saveIntent === 'draft' && isBusy}
                  disabled={locked || assumptionBlocked}
                >
                  Save Draft
                </Button>
              )}
              <Button
                type="submit"
                isLoading={saveIntent === 'full' && isBusy}
                disabled={locked || assumptionBlocked}
              >
                <Icon name="calculator" style="solid" className="size-4 mr-2" />
                Save
              </Button>
            </ActionBar.Right>
          )}
        </ActionBar>
      </form>

      <ConfirmDialog
        isOpen={confirmSwitch}
        onClose={() => setConfirmSwitch(false)}
        onConfirm={() => {
          setModeOverride('Calculated');
          setConfirmSwitch(false);
        }}
        title={t('unitPrice.switchToCalculated.title')}
        message={t('unitPrice.switchToCalculated.message')}
        confirmText={t('unitPrice.switchToCalculated.confirm')}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={handleDiscardAndImport}
        title={t('unitPrice.discardChanges.title')}
        message={t('unitPrice.discardChanges.message')}
        confirmText={t('unitPrice.discardChanges.confirm')}
        variant="warning"
      />

      {uploadOpen && appraisalId && (
        <UnitPriceImportDialog
          appraisalId={appraisalId}
          onClose={() => setUploadOpen(false)}
          onImported={(result, startedAt) => {
            setModeOverride('Imported');
            setWrittenSource('Imported');
            setWrittenAt(startedAt);
            setJustImported({
              fileName: result.fileName,
              importedAt: new Date().toISOString(),
              importedBy: currentUsername,
            });
          }}
        />
      )}
    </FormProvider>
  );
}
