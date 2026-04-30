import { Controller, useFormContext } from 'react-hook-form';

import { FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import Dropdown from '@/shared/components/inputs/Dropdown';
import NumberInput from '@/shared/components/inputs/NumberInput';

import type { ProjectType } from '../types';
import SectionRow from '../components/SectionRow';
import {
  pricingForceSaleFields,
  condoPricingFloorFields,
} from '../configs/fields';

interface PricingAssumptionFormProps {
  projectType: ProjectType;
}

// ── Subtitle ──────────────────────────────────────────────────────────────────

const SectionSubtitle = ({ children }: { children: React.ReactNode }) => (
  <div className="col-span-12 -mt-1">
    <p className="text-xs text-gray-400">{children}</p>
  </div>
);

// ── Inline info callout (used for Force Sale tip) ─────────────────────────────

const InfoHint = ({ children }: { children: React.ReactNode }) => (
  <div className="col-span-12">
    <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50/70 border border-amber-100">
      <Icon
        name="circle-info"
        style="solid"
        className="size-3.5 text-amber-600 mt-0.5 shrink-0"
      />
      <p className="text-xs text-amber-800 leading-relaxed">{children}</p>
    </div>
  </div>
);

// ── Section header (for sections that break out of the SectionRow grid) ───────

const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
      <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
    </div>
    <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
  </div>
);

// ── Location Assumptions Table ────────────────────────────────────────────────

const buildLocationMethodOptions = (projectType: ProjectType) => {
  const areaUnit = projectType === 'Condo' ? 'Sq.m' : 'Sq.wa';
  return [{ value: 'AdjustPriceSqm', label: `01 - Adjust Price/${areaUnit}` }];
};

interface LocationRow {
  name: string;
  label: string;
  /** Static unit suffix, when the field's unit doesn't depend on the chosen method */
  unit?: string;
  decimalPlaces?: number;
}

const CONDO_LOCATION_ROWS: LocationRow[] = [
  { name: 'cornerAdjustment', label: 'Corner' },
  { name: 'edgeAdjustment', label: 'Edge' },
  { name: 'poolViewAdjustment', label: 'Pool View' },
  { name: 'southAdjustment', label: 'South' },
  { name: 'otherAdjustment', label: 'Other' },
];

const LB_LOCATION_ROWS: LocationRow[] = [
  { name: 'cornerAdjustment', label: 'Corner' },
  { name: 'edgeAdjustment', label: 'Edge' },
  { name: 'nearGardenAdjustment', label: 'Near Garden' },
  { name: 'otherAdjustment', label: 'Other' },
  {
    name: 'landIncreaseDecreaseRate',
    label: 'Land Increase / Decrease Rate',
    unit: '%',
  },
];

interface LocationAssumptionsTableProps {
  projectType: ProjectType;
}

const LocationAssumptionsTable = ({ projectType }: LocationAssumptionsTableProps) => {
  const { control } = useFormContext();
  const rows = projectType === 'Condo' ? CONDO_LOCATION_ROWS : LB_LOCATION_ROWS;
  const methodOptions = buildLocationMethodOptions(projectType);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-2/5" />
          <col />
        </colgroup>
        <thead>
          <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
            <th className="text-left px-4 py-2.5 text-xs font-medium">Location Description</th>
            <th className="px-3 py-2 font-normal">
              <div className="max-w-[260px]">
                <Controller
                  control={control}
                  name="locationMethod"
                  render={({ field, fieldState }) => (
                    <Dropdown
                      options={methodOptions}
                      value={field.value ?? undefined}
                      onChange={value => field.onChange(value)}
                      placeholder="Select adjustment method"
                      showValuePrefix={false}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.name}>
              <td className="px-4 py-2 text-sm text-gray-700">
                {row.label}
                {row.unit && <span className="text-gray-400 ml-1">({row.unit})</span>}
              </td>
              <td className="px-3 py-1.5">
                <Controller
                  control={control}
                  name={row.name}
                  render={({ field, fieldState }) => (
                    <NumberInput
                      decimalPlaces={row.decimalPlaces ?? 2}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Form ──────────────────────────────────────────────────────────────────────

/**
 * Merged pricing-assumption form for both Condo and LandAndBuilding.
 *
 * Location Assumptions: full-width table with method selector in the header
 * and adjustment values per location attribute (Corner / Edge / Pool View / etc.).
 * Floor Assumptions: Condo-only floor-increment row.
 * Force Sale Value: discount factor for forced-sale valuation.
 */
const PricingAssumptionForm = ({ projectType }: PricingAssumptionFormProps) => (
  <div className="w-full max-w-full overflow-hidden flex flex-col gap-6">
    {/* Location Assumptions — full-width table layout */}
    <section>
      <SectionHeader title="Location Assumptions" icon="location-dot" />
      <p className="text-xs text-gray-400 mb-3">
        Choose an adjustment method, then set the per-location offset applied to each unit.
      </p>
      <LocationAssumptionsTable projectType={projectType} />
    </section>

    <div className="h-px bg-gray-200" />

    {/* Floor + Force Sale — keep existing two-column SectionRow layout */}
    <div className="grid grid-cols-5 gap-x-6 gap-y-4">
      {projectType === 'Condo' && (
        <SectionRow title="Floor Assumptions" icon="stairs">
          <SectionSubtitle>
            Price increment applied for every N floors above the base floor.
          </SectionSubtitle>
          <FormFields fields={condoPricingFloorFields} />
        </SectionRow>
      )}

      <SectionRow title="Force Sale Value" icon="percent" isLast>
        <SectionSubtitle>
          Discount factor applied to calculated unit prices for forced-sale valuation.
        </SectionSubtitle>
        <FormFields fields={pricingForceSaleFields} />
        <InfoHint>
          Enter a value between 0 and 100. The calculated unit price is multiplied by this
          percentage to derive the force-sale price.
        </InfoHint>
      </SectionRow>
    </div>
  </div>
);

export default PricingAssumptionForm;
