import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { FormFields } from '@/shared/components/form';
import { useFormReadOnly } from '@/shared/components/form/context';
import NumberInput from '@/shared/components/inputs/NumberInput';
import Dropdown from '@/shared/components/inputs/Dropdown';
import Icon from '@/shared/components/Icon';
import type { ProjectType } from '../types';
import SectionRow from '../components/SectionRow';
import ProjectModelAreaDetailTable from '../components/ProjectModelAreaDetailTable';
import {
  condoModelInfoFields,
  lbModelInfoFields,
  modelFloorMaterialFields,
  lbModelBuildingDetailFields,
  lbModelStructureFields,
} from '../configs/fields';
import {
  LB_STRUCTURE_TYPE_OPTIONS,
  LB_ROOF_FRAME_TYPE_OPTIONS,
  LB_ROOF_TYPE_OPTIONS,
  LB_CEILING_TYPE_OPTIONS,
  LB_WALL_TYPE_OPTIONS,
  LB_FENCE_TYPE_OPTIONS,
  LB_FLOOR_SURFACE_TYPE_OPTIONS,
  LB_FLOOR_STRUCTURE_TYPE_OPTIONS,
} from '../configs/fields';

interface ModelDetailFormProps {
  projectType: ProjectType;
}

// ── LB-only: Floor Surfaces table ────────────────────────────────────────────

// Per-row sub-component so useWatch is called at the top level of a component,
// not inside a .map() callback (Rules of Hooks).
interface FloorSurfaceRowProps {
  index: number;
  onRemove: () => void;
}

function FloorSurfaceRow({ index, onRemove }: FloorSurfaceRowProps) {
  const { control, setValue, register } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const structureVal = useWatch({ control, name: `surfaces.${index}.floorStructureType` });
  const surfaceVal = useWatch({ control, name: `surfaces.${index}.floorSurfaceType` });
  const fromFloor = useWatch({ control, name: `surfaces.${index}.fromFloorNumber` });
  const toFloor = useWatch({ control, name: `surfaces.${index}.toFloorNumber` });

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 px-3 min-w-[80px]">
        <NumberInput
          name={`surfaces.${index}.fromFloorNumber`}
          value={fromFloor ?? undefined}
          decimalPlaces={0}
          disabled={isReadOnly}
          onChange={e => setValue(`surfaces.${index}.fromFloorNumber`, e.target.value ?? undefined, { shouldDirty: true })}
        />
      </td>
      <td className="py-2 px-3 min-w-[80px]">
        <NumberInput
          name={`surfaces.${index}.toFloorNumber`}
          value={toFloor ?? undefined}
          decimalPlaces={0}
          disabled={isReadOnly}
          onChange={e => setValue(`surfaces.${index}.toFloorNumber`, e.target.value ?? undefined, { shouldDirty: true })}
        />
      </td>
      <td className="py-2 px-3 min-w-[100px]">
        <input
          {...register(`surfaces.${index}.floorType`)}
          type="text"
          disabled={isReadOnly}
          placeholder="e.g. Ground"
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-transparent disabled:border-transparent"
        />
      </td>
      <td className="py-2 px-3 min-w-[160px]">
        <Dropdown
          value={structureVal ?? ''}
          onChange={val => setValue(`surfaces.${index}.floorStructureType`, val as string, { shouldDirty: true })}
          options={LB_FLOOR_STRUCTURE_TYPE_OPTIONS}
          disabled={isReadOnly}
        />
      </td>
      <td className="py-2 px-3 min-w-[160px]">
        <Dropdown
          value={surfaceVal ?? ''}
          onChange={val => setValue(`surfaces.${index}.floorSurfaceType`, val as string, { shouldDirty: true })}
          options={LB_FLOOR_SURFACE_TYPE_OPTIONS}
          disabled={isReadOnly}
        />
      </td>
      {!isReadOnly && (
        <td className="py-2 px-3">
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
            <Icon name="trash" style="regular" className="w-4 h-4" />
          </button>
        </td>
      )}
    </tr>
  );
}

function FloorSurfacesTable() {
  const { control } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const { fields, append, remove } = useFieldArray({ control, name: 'surfaces' });

  return (
    <div className="col-span-12">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">From Floor</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">To Floor</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Floor Type</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Structure Type</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Surface Type</th>
              {!isReadOnly && <th className="py-2 px-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <FloorSurfaceRow
                key={field.id}
                index={index}
                onRemove={() => remove(index)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!isReadOnly && (
        <button
          type="button"
          onClick={() => append({ fromFloorNumber: undefined, toFloorNumber: undefined, floorType: '', floorStructureType: '', floorSurfaceType: '' })}
          className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary-700 transition-colors"
        >
          <Icon name="plus" style="solid" className="w-4 h-4" />
          Add surface row
        </button>
      )}
    </div>
  );
}

// ── LB-only: Depreciation table ───────────────────────────────────────────────

// Per-item sub-component so useWatch is called at the top level of a component,
// not inside a .map() callback (Rules of Hooks).
interface DepreciationDetailRowProps {
  index: number;
  onRemove: () => void;
}

function DepreciationDetailRow({ index, onRemove }: DepreciationDetailRowProps) {
  const { control, setValue, register } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const dArea = useWatch({ control, name: `depreciationDetails.${index}.area` });
  const dYear = useWatch({ control, name: `depreciationDetails.${index}.year` });
  const dIsBuilding = useWatch({ control, name: `depreciationDetails.${index}.isBuilding` });

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-800">Depreciation Item {index + 1}</p>
        {!isReadOnly && (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
            <Icon name="trash" style="regular" className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area Description</label>
          <input
            {...register(`depreciationDetails.${index}.areaDescription`)}
            type="text"
            disabled={isReadOnly}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
        <NumberInput
          name={`depreciationDetails.${index}.area`}
          label="Area (sq.m.)"
          value={dArea ?? undefined}
          decimalPlaces={2}
          disabled={isReadOnly}
          onChange={e => setValue(`depreciationDetails.${index}.area`, e.target.value ?? undefined, { shouldDirty: true })}
        />
        <NumberInput
          name={`depreciationDetails.${index}.year`}
          label="Year"
          value={dYear ?? undefined}
          decimalPlaces={0}
          disabled={isReadOnly}
          onChange={e => setValue(`depreciationDetails.${index}.year`, e.target.value ?? undefined, { shouldDirty: true })}
        />
        <div className="col-span-full">
          <p className="text-sm font-medium text-gray-700 mb-2">Is Building</p>
          <div className="flex gap-4">
            {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(opt => (
              <label key={String(opt.v)} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={dIsBuilding === opt.v}
                  onChange={() => setValue(`depreciationDetails.${index}.isBuilding`, opt.v, { shouldDirty: true })}
                  disabled={isReadOnly}
                  className="accent-primary"
                />
                <span className="text-sm text-gray-700">{opt.l}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DepreciationSection() {
  const { control } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const { fields, append, remove } = useFieldArray({ control, name: 'depreciationDetails' });

  return (
    <div className="col-span-12 flex flex-col gap-4">
      {fields.map((field, dIdx) => (
        <DepreciationDetailRow
          key={field.id}
          index={dIdx}
          onRemove={() => remove(dIdx)}
        />
      ))}
      {!isReadOnly && (
        <button
          type="button"
          onClick={() => append({ areaDescription: '', area: undefined, year: undefined, isBuilding: true, depreciationMethod: '', periods: [] })}
          className="mt-1 flex items-center gap-2 text-sm text-primary hover:text-primary-700 transition-colors"
        >
          <Icon name="plus" style="solid" className="w-4 h-4" />
          Add depreciation item
        </button>
      )}
    </div>
  );
}

// ── LB-only: Multi-select structure checkboxes ────────────────────────────────

interface CheckboxArrayGroupProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

function CheckboxArrayGroup({ name, label, options }: CheckboxArrayGroupProps) {
  const { setValue, watch } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const values: string[] = watch(name) ?? [];

  const toggle = (v: string) => {
    if (values.includes(v)) {
      setValue(name, values.filter(x => x !== v), { shouldDirty: true });
    } else {
      setValue(name, [...values, v], { shouldDirty: true });
    }
  };

  return (
    <div className="col-span-12">
      {label && <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>}
      <div className="flex flex-wrap gap-3">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={values.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              disabled={isReadOnly}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Merged model-detail form for both Condo and LandAndBuilding.
 *
 * Condo sections: Model Information (condo fields), Floor Materials, Area Detail.
 * LandAndBuilding sections: Model Information (LB fields), Floor Materials, Land Area,
 *   Building Detail, Structure & Materials, Floor Surfaces, Area Detail, Depreciation.
 *
 * projectType cannot change after creation so we don't need hidden inputs for
 * inapplicable fields (no runtime toggle).
 */
const ModelDetailForm = ({ projectType }: ModelDetailFormProps) => {
  if (projectType === 'Condo') {
    return (
      <div className="w-full max-w-full overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Model Detail</h2>
        <div className="grid grid-cols-5 gap-x-6 gap-y-4">
          <SectionRow title="Model Information" icon="layer-group">
            <FormFields fields={condoModelInfoFields} />
          </SectionRow>

          <SectionRow title="Floor Materials" icon="layer-group">
            <FormFields fields={modelFloorMaterialFields} />
          </SectionRow>

          <SectionRow title="Area Detail" icon="chart-area" isLast>
            <ProjectModelAreaDetailTable />
          </SectionRow>
        </div>
      </div>
    );
  }

  // LandAndBuilding
  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Model Detail</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title="Model Information" icon="house">
          <FormFields fields={lbModelInfoFields} />
        </SectionRow>

        <SectionRow title="Floor Materials" icon="layer-group">
          <FormFields fields={modelFloorMaterialFields} />
        </SectionRow>

        <SectionRow title="Building Detail" icon="building">
          <FormFields fields={lbModelBuildingDetailFields} />
        </SectionRow>

        <SectionRow title="Structure & Materials" icon="layer-group">
          <CheckboxArrayGroup name="structureType" label="Structure Type" options={LB_STRUCTURE_TYPE_OPTIONS} />
          <FormFields fields={[lbModelStructureFields[0]!]} /> {/* structureTypeOther */}
          <CheckboxArrayGroup name="roofFrameType" label="Roof Frame Type" options={LB_ROOF_FRAME_TYPE_OPTIONS} />
          <FormFields fields={[lbModelStructureFields[1]!]} /> {/* roofFrameTypeOther */}
          <CheckboxArrayGroup name="roofType" label="Roof Type" options={LB_ROOF_TYPE_OPTIONS} />
          <FormFields fields={[lbModelStructureFields[2]!]} /> {/* roofTypeOther */}
          <CheckboxArrayGroup name="ceilingType" label="Ceiling Type" options={LB_CEILING_TYPE_OPTIONS} />
          <FormFields fields={[lbModelStructureFields[3]!]} /> {/* ceilingTypeOther */}
          <CheckboxArrayGroup name="interiorWallType" label="Interior Wall Type" options={LB_WALL_TYPE_OPTIONS} />
          <FormFields fields={[lbModelStructureFields[4]!]} /> {/* interiorWallTypeOther */}
          <CheckboxArrayGroup name="exteriorWallType" label="Exterior Wall Type" options={LB_WALL_TYPE_OPTIONS} />
          <FormFields fields={[lbModelStructureFields[5]!]} /> {/* exteriorWallTypeOther */}
          <CheckboxArrayGroup name="fenceType" label="Fence Type" options={LB_FENCE_TYPE_OPTIONS} />
          <FormFields fields={[lbModelStructureFields[6]!]} /> {/* fenceTypeOther */}
        </SectionRow>

        <SectionRow title="Floor Surfaces" icon="table-list">
          <FloorSurfacesTable />
        </SectionRow>

        <SectionRow title="Area Detail" icon="chart-area">
          <ProjectModelAreaDetailTable />
        </SectionRow>

        <SectionRow title="Depreciation" icon="chart-line" isLast>
          <DepreciationSection />
        </SectionRow>
      </div>
    </div>
  );
};

export default ModelDetailForm;
