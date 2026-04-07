import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Section from '@/shared/components/sections/Section';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NumberInput from '@/shared/components/inputs/NumberInput';
import Dropdown from '@/shared/components/inputs/Dropdown';
import type { ApiError } from '@/shared/types/api';

import { useGetVillageModelById, useCreateVillageModel, useUpdateVillageModel } from '../api/villageModel';
import {
  BUILDING_TYPE_OPTIONS,
  DECORATION_TYPE_OPTIONS,
  BUILDING_MATERIAL_TYPE_OPTIONS,
  BUILDING_STYLE_TYPE_OPTIONS,
  CONSTRUCTION_STYLE_TYPE_OPTIONS,
  STRUCTURE_TYPE_OPTIONS,
  ROOF_FRAME_TYPE_OPTIONS,
  ROOF_TYPE_OPTIONS,
  CEILING_TYPE_OPTIONS,
  WALL_TYPE_OPTIONS,
  FENCE_TYPE_OPTIONS,
  CONSTRUCTION_TYPE_OPTIONS,
  UTILIZATION_TYPE_OPTIONS,
  FLOOR_SURFACE_TYPE_OPTIONS,
  FLOOR_STRUCTURE_TYPE_OPTIONS,
  FIRE_INSURANCE_OPTIONS,
  DEPRECIATION_METHOD_OPTIONS,
} from '../data/options';

type AppError = AxiosError & { apiError?: ApiError };

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const areaDetailSchema = z.object({
  id: z.string().optional(),
  areaDescription: z.string().optional(),
  areaSize: z.coerce.number().optional(),
});

const surfaceSchema = z.object({
  id: z.string().optional(),
  fromFloorNumber: z.coerce.number().optional(),
  toFloorNumber: z.coerce.number().optional(),
  floorType: z.string().optional(),
  floorStructureType: z.string().optional(),
  floorStructureTypeOther: z.string().optional(),
  floorSurfaceType: z.string().optional(),
  floorSurfaceTypeOther: z.string().optional(),
});

const depreciationPeriodSchema = z.object({
  id: z.string().optional(),
  atYear: z.coerce.number().optional(),
  toYear: z.coerce.number().optional(),
  depreciationPerYear: z.coerce.number().optional(),
  totalDepreciationPct: z.coerce.number().optional(),
  priceDepreciation: z.coerce.number().optional(),
});

const depreciationDetailSchema = z.object({
  id: z.string().optional(),
  areaDescription: z.string().optional(),
  area: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
  isBuilding: z.boolean().optional(),
  pricePerSqMBeforeDepreciation: z.coerce.number().optional(),
  priceBeforeDepreciation: z.coerce.number().optional(),
  pricePerSqMAfterDepreciation: z.coerce.number().optional(),
  priceAfterDepreciation: z.coerce.number().optional(),
  depreciationMethod: z.string().optional(),
  depreciationYearPct: z.coerce.number().optional(),
  totalDepreciationPct: z.coerce.number().optional(),
  priceDepreciation: z.coerce.number().optional(),
  periods: z.array(depreciationPeriodSchema).optional(),
});

const modelSchema = z.object({
  // Model info
  modelName: z.string().min(1, 'Model name is required'),
  modelDescription: z.string().optional(),
  numberOfHouse: z.coerce.number().optional(),
  startingPrice: z.coerce.number().optional(),
  usableAreaMin: z.coerce.number().optional(),
  usableAreaMax: z.coerce.number().optional(),
  standardUsableArea: z.coerce.number().optional(),
  landAreaRai: z.coerce.number().optional(),
  landAreaNgan: z.coerce.number().optional(),
  landAreaWa: z.coerce.number().optional(),
  standardLandArea: z.coerce.number().optional(),
  fireInsuranceCondition: z.string().optional(),
  remark: z.string().optional(),
  // Building detail
  buildingType: z.string().optional(),
  buildingTypeOther: z.string().optional(),
  numberOfFloors: z.coerce.number().optional(),
  decorationType: z.string().optional(),
  decorationTypeOther: z.string().optional(),
  isEncroachingOthers: z.boolean().optional(),
  encroachingOthersRemark: z.string().optional(),
  encroachingOthersArea: z.coerce.number().optional(),
  buildingMaterialType: z.string().optional(),
  buildingStyleType: z.string().optional(),
  isResidential: z.boolean().optional(),
  buildingAge: z.coerce.number().optional(),
  constructionYear: z.coerce.number().optional(),
  residentialRemark: z.string().optional(),
  constructionStyleType: z.string().optional(),
  constructionStyleRemark: z.string().optional(),
  structureType: z.array(z.string()).optional(),
  structureTypeOther: z.string().optional(),
  roofFrameType: z.array(z.string()).optional(),
  roofFrameTypeOther: z.string().optional(),
  roofType: z.array(z.string()).optional(),
  roofTypeOther: z.string().optional(),
  ceilingType: z.array(z.string()).optional(),
  ceilingTypeOther: z.string().optional(),
  interiorWallType: z.array(z.string()).optional(),
  interiorWallTypeOther: z.string().optional(),
  exteriorWallType: z.array(z.string()).optional(),
  exteriorWallTypeOther: z.string().optional(),
  fenceType: z.array(z.string()).optional(),
  fenceTypeOther: z.string().optional(),
  constructionType: z.string().optional(),
  constructionTypeOther: z.string().optional(),
  utilizationType: z.string().optional(),
  utilizationTypeOther: z.string().optional(),
  // Collections
  areaDetails: z.array(areaDetailSchema).optional(),
  surfaces: z.array(surfaceSchema).optional(),
  depreciationDetails: z.array(depreciationDetailSchema).optional(),
});

type ModelFormType = z.infer<typeof modelSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CheckboxGroup({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label?: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter(x => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>}
      <div className="flex flex-wrap gap-3">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              disabled={disabled}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex gap-4">
        {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(opt => (
          <label key={String(opt.v)} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={value === opt.v}
              onChange={() => onChange(opt.v)}
              disabled={disabled}
              className="accent-primary"
            />
            <span className="text-sm text-gray-700">{opt.l}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ModelDetailPage() {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const appraisalId = useAppraisalId();
  const { modelId } = useParams<{ modelId?: string }>();

  const isEditMode = Boolean(modelId);

  const { data: modelData, isLoading } = useGetVillageModelById(appraisalId ?? '', modelId);
  const { mutate: createModel, isPending: isCreating } = useCreateVillageModel();
  const { mutate: updateModel, isPending: isUpdating } = useUpdateVillageModel();

  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const formDefaults = useMemo<ModelFormType>(() => {
    if (isEditMode && modelData) {
      return {
        modelName: modelData.modelName ?? '',
        modelDescription: modelData.modelDescription ?? '',
        numberOfHouse: modelData.numberOfHouse,
        startingPrice: modelData.startingPrice,
        usableAreaMin: modelData.usableAreaMin,
        usableAreaMax: modelData.usableAreaMax,
        standardUsableArea: modelData.standardUsableArea,
        landAreaRai: modelData.landAreaRai,
        landAreaNgan: modelData.landAreaNgan,
        landAreaWa: modelData.landAreaWa,
        standardLandArea: modelData.standardLandArea,
        fireInsuranceCondition: modelData.fireInsuranceCondition ?? '',
        remark: modelData.remark ?? '',
        buildingType: modelData.buildingType ?? '',
        buildingTypeOther: modelData.buildingTypeOther ?? '',
        numberOfFloors: modelData.numberOfFloors,
        decorationType: modelData.decorationType ?? '',
        decorationTypeOther: modelData.decorationTypeOther ?? '',
        isEncroachingOthers: modelData.isEncroachingOthers ?? false,
        encroachingOthersRemark: modelData.encroachingOthersRemark ?? '',
        encroachingOthersArea: modelData.encroachingOthersArea,
        buildingMaterialType: modelData.buildingMaterialType ?? '',
        buildingStyleType: modelData.buildingStyleType ?? '',
        isResidential: modelData.isResidential ?? true,
        buildingAge: modelData.buildingAge,
        constructionYear: modelData.constructionYear,
        residentialRemark: modelData.residentialRemark ?? '',
        constructionStyleType: modelData.constructionStyleType ?? '',
        constructionStyleRemark: modelData.constructionStyleRemark ?? '',
        structureType: modelData.structureType ?? [],
        structureTypeOther: modelData.structureTypeOther ?? '',
        roofFrameType: modelData.roofFrameType ?? [],
        roofFrameTypeOther: modelData.roofFrameTypeOther ?? '',
        roofType: modelData.roofType ?? [],
        roofTypeOther: modelData.roofTypeOther ?? '',
        ceilingType: modelData.ceilingType ?? [],
        ceilingTypeOther: modelData.ceilingTypeOther ?? '',
        interiorWallType: modelData.interiorWallType ?? [],
        interiorWallTypeOther: modelData.interiorWallTypeOther ?? '',
        exteriorWallType: modelData.exteriorWallType ?? [],
        exteriorWallTypeOther: modelData.exteriorWallTypeOther ?? '',
        fenceType: modelData.fenceType ?? [],
        fenceTypeOther: modelData.fenceTypeOther ?? '',
        constructionType: modelData.constructionType ?? '',
        constructionTypeOther: modelData.constructionTypeOther ?? '',
        utilizationType: modelData.utilizationType ?? '',
        utilizationTypeOther: modelData.utilizationTypeOther ?? '',
        areaDetails: modelData.areaDetails ?? [],
        surfaces: modelData.surfaces ?? [],
        depreciationDetails: modelData.depreciationDetails ?? [],
      };
    }
    return {
      modelName: '',
      modelDescription: '',
      isEncroachingOthers: false,
      isResidential: true,
      structureType: [],
      roofFrameType: [],
      roofType: [],
      ceilingType: [],
      interiorWallType: [],
      exteriorWallType: [],
      fenceType: [],
      areaDetails: [],
      surfaces: [],
      depreciationDetails: [],
    };
  }, [isEditMode, modelData]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { dirtyFields, errors },
  } = useForm<ModelFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(modelSchema),
  });

  const { fields: areaFields, append: appendArea, remove: removeArea } = useFieldArray({ control, name: 'areaDetails' });
  const { fields: surfaceFields, append: appendSurface, remove: removeSurface } = useFieldArray({ control, name: 'surfaces' });
  const { fields: depreciationFields, append: appendDepreciation, remove: removeDepreciation } = useFieldArray({ control, name: 'depreciationDetails' });

  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);
  const { isOpen, onToggle } = useDisclosure();

  useEffect(() => {
    if (isEditMode && modelData) reset(formDefaults);
  }, [isEditMode, modelData, reset, formDefaults]);

  const submitForm = (data: ModelFormType, isDraft: boolean) => {
    if (!appraisalId) return;
    if (isEditMode && modelId) {
      updateModel(
        { appraisalId, modelId, data },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(isDraft ? 'Draft saved successfully' : 'Model updated successfully');
            setSaveAction(null);
          },
          onError: (err: unknown) => {
            const error = err as AppError;
            toast.error(error.apiError?.detail || (isDraft ? 'Failed to save draft' : 'Failed to update model'));
            setSaveAction(null);
          },
        },
      );
    } else {
      createModel(
        { appraisalId, data },
        {
          onSuccess: response => {
            toast.success(isDraft ? 'Draft saved successfully' : 'Model saved successfully');
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/block-village/model/${response.id}`);
          },
          onError: (err: unknown) => {
            const error = err as AppError;
            toast.error(error.apiError?.detail || (isDraft ? 'Failed to save draft' : 'Failed to create model'));
            setSaveAction(null);
          },
        },
      );
    }
  };

  const handleSave = handleSubmit(data => {
    if (!appraisalId) return;
    setSaveAction('submit');
    submitForm(data, false);
  });

  const handleSaveDraft = () => {
    if (!appraisalId) return;
    setSaveAction('draft');
    submitForm(getValues(), true);
  };

  // Watched values
  const buildingType = watch('buildingType');
  const decorationType = watch('decorationType');
  const constructionStyleType = watch('constructionStyleType');
  const constructionType = watch('constructionType');
  const utilizationType = watch('utilizationType');
  const isEncroachingOthers = watch('isEncroachingOthers');
  const isResidential = watch('isResidential');
  const structureType = watch('structureType') ?? [];
  const roofFrameType = watch('roofFrameType') ?? [];
  const roofType = watch('roofType') ?? [];
  const ceilingType = watch('ceilingType') ?? [];
  const interiorWallType = watch('interiorWallType') ?? [];
  const exteriorWallType = watch('exteriorWallType') ?? [];
  const fenceType = watch('fenceType') ?? [];
  const numberOfHouse = watch('numberOfHouse');
  const startingPrice = watch('startingPrice');
  const usableAreaMin = watch('usableAreaMin');
  const usableAreaMax = watch('usableAreaMax');
  const standardUsableArea = watch('standardUsableArea');
  const landAreaRai = watch('landAreaRai');
  const landAreaNgan = watch('landAreaNgan');
  const landAreaWa = watch('landAreaWa');
  const standardLandArea = watch('standardLandArea');
  const numberOfFloors = watch('numberOfFloors');
  const buildingAge = watch('buildingAge');
  const constructionYear = watch('constructionYear');
  const encroachingOthersArea = watch('encroachingOthersArea');

  // Area total
  const areaDetailsValues = watch('areaDetails');
  const areaTotal = (areaDetailsValues ?? []).reduce((sum, d) => sum + (Number(d.areaSize) || 0), 0);

  if (isLoading || (isEditMode && !modelData)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="village-model-form-scroll"
          anchors={[
            { label: 'Images', id: 'model-images', icon: 'images' },
            { label: 'Model Info', id: 'model-info', icon: 'house' },
            { label: 'Land Area', id: 'land-area', icon: 'map' },
            { label: 'Building Detail', id: 'building-detail', icon: 'building' },
            { label: 'Structure & Materials', id: 'structure-materials', icon: 'layer-group' },
            { label: 'Floor Surfaces', id: 'floor-surfaces', icon: 'table-list' },
            { label: 'Area Detail', id: 'area-detail', icon: 'chart-area' },
            { label: 'Depreciation', id: 'depreciation', icon: 'trending-down' },
            { label: 'Remark', id: 'remark', icon: 'comment' },
          ]}
        />
      </div>

      <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
        <div
          id="village-model-form-scroll"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
        >
          <ResizableSidebar isOpen={isOpen} onToggle={onToggle} openedWidth="w-1/5" closedWidth="w-1/50">
            <ResizableSidebar.Main>
              <div className="flex-auto flex flex-col gap-6 min-w-0">

                {/* Model Images */}
                <Section id="model-images" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Icon name="images" style="solid" className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Model Images</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-4" />
                  <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center py-12 gap-3">
                    <Icon name="images" style="regular" className="w-10 h-10 text-gray-300" />
                    <p className="text-sm text-gray-400">Image upload coming soon</p>
                  </div>
                </Section>

                {/* Model Information */}
                <Section id="model-info" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Icon name="house" style="solid" className="w-5 h-5 text-violet-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Model Information</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="col-span-full md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('modelName')}
                        type="text"
                        disabled={isReadOnly}
                        placeholder="Enter model name"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                      />
                      {errors.modelName && (
                        <p className="text-xs text-red-500 mt-1">{errors.modelName.message}</p>
                      )}
                    </div>

                    <div className="col-span-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        {...register('modelDescription')}
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="Enter description"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </div>

                    <NumberInput
                      name="numberOfHouse"
                      label="Number of Houses"
                      value={numberOfHouse ?? undefined}
                      decimalPlaces={0}
                      disabled={isReadOnly}
                      onChange={e => setValue('numberOfHouse', e.target.value ?? undefined, { shouldDirty: true })}
                    />
                    <NumberInput
                      name="startingPrice"
                      label="Starting Price (Baht)"
                      value={startingPrice ?? undefined}
                      decimalPlaces={0}
                      disabled={isReadOnly}
                      onChange={e => setValue('startingPrice', e.target.value ?? undefined, { shouldDirty: true })}
                    />

                    <div className="col-span-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Usable Area Range (sq.m.)</label>
                      <div className="flex items-center gap-3 max-w-xs">
                        <NumberInput
                          name="usableAreaMin"
                          label="Min"
                          value={usableAreaMin ?? undefined}
                          decimalPlaces={2}
                          disabled={isReadOnly}
                          onChange={e => setValue('usableAreaMin', e.target.value ?? undefined, { shouldDirty: true })}
                        />
                        <span className="text-sm text-gray-400 mt-6">–</span>
                        <NumberInput
                          name="usableAreaMax"
                          label="Max"
                          value={usableAreaMax ?? undefined}
                          decimalPlaces={2}
                          disabled={isReadOnly}
                          onChange={e => setValue('usableAreaMax', e.target.value ?? undefined, { shouldDirty: true })}
                        />
                      </div>
                    </div>

                    <NumberInput
                      name="standardUsableArea"
                      label="Standard Usable Area (sq.m.)"
                      value={standardUsableArea ?? undefined}
                      decimalPlaces={2}
                      disabled={isReadOnly}
                      onChange={e => setValue('standardUsableArea', e.target.value ?? undefined, { shouldDirty: true })}
                    />

                    <Dropdown
                      value={watch('fireInsuranceCondition') ?? ''}
                      onChange={val => setValue('fireInsuranceCondition', val as string, { shouldDirty: true })}
                      label="Fire Insurance Condition"
                      options={FIRE_INSURANCE_OPTIONS}
                      disabled={isReadOnly}
                    />
                  </div>
                </Section>

                {/* Land Area */}
                <Section id="land-area" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Icon name="map" style="solid" className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Land Area</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <NumberInput
                      name="landAreaRai"
                      label="Rai"
                      value={landAreaRai ?? undefined}
                      decimalPlaces={0}
                      disabled={isReadOnly}
                      onChange={e => setValue('landAreaRai', e.target.value ?? undefined, { shouldDirty: true })}
                    />
                    <NumberInput
                      name="landAreaNgan"
                      label="Ngan"
                      value={landAreaNgan ?? undefined}
                      decimalPlaces={0}
                      disabled={isReadOnly}
                      onChange={e => setValue('landAreaNgan', e.target.value ?? undefined, { shouldDirty: true })}
                    />
                    <NumberInput
                      name="landAreaWa"
                      label="Wa"
                      value={landAreaWa ?? undefined}
                      decimalPlaces={2}
                      disabled={isReadOnly}
                      onChange={e => setValue('landAreaWa', e.target.value ?? undefined, { shouldDirty: true })}
                    />
                    <NumberInput
                      name="standardLandArea"
                      label="Standard Land Area (sq.wa)"
                      value={standardLandArea ?? undefined}
                      decimalPlaces={2}
                      disabled={isReadOnly}
                      onChange={e => setValue('standardLandArea', e.target.value ?? undefined, { shouldDirty: true })}
                    />
                  </div>
                </Section>

                {/* Building Detail */}
                <Section id="building-detail" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                      <Icon name="building" style="solid" className="w-5 h-5 text-sky-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Building Detail</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Dropdown
                      value={buildingType ?? ''}
                      onChange={val => setValue('buildingType', val as string, { shouldDirty: true })}
                      label="Building Type"
                      options={BUILDING_TYPE_OPTIONS}
                      disabled={isReadOnly}
                    />
                    {buildingType === 'Other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Building Type (Other)</label>
                        <input
                          {...register('buildingTypeOther')}
                          type="text"
                          disabled={isReadOnly}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </div>
                    )}

                    <NumberInput
                      name="numberOfFloors"
                      label="Number of Floors"
                      value={numberOfFloors ?? undefined}
                      decimalPlaces={0}
                      disabled={isReadOnly}
                      onChange={e => setValue('numberOfFloors', e.target.value ?? undefined, { shouldDirty: true })}
                    />

                    <Dropdown
                      value={decorationType ?? ''}
                      onChange={val => setValue('decorationType', val as string, { shouldDirty: true })}
                      label="Decoration Type"
                      options={DECORATION_TYPE_OPTIONS}
                      disabled={isReadOnly}
                    />
                    {decorationType === 'Other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Decoration Type (Other)</label>
                        <input
                          {...register('decorationTypeOther')}
                          type="text"
                          disabled={isReadOnly}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </div>
                    )}

                    <Dropdown
                      value={watch('buildingMaterialType') ?? ''}
                      onChange={val => setValue('buildingMaterialType', val as string, { shouldDirty: true })}
                      label="Building Material Type"
                      options={BUILDING_MATERIAL_TYPE_OPTIONS}
                      disabled={isReadOnly}
                    />
                    <Dropdown
                      value={watch('buildingStyleType') ?? ''}
                      onChange={val => setValue('buildingStyleType', val as string, { shouldDirty: true })}
                      label="Building Style Type"
                      options={BUILDING_STYLE_TYPE_OPTIONS}
                      disabled={isReadOnly}
                    />

                    <NumberInput
                      name="buildingAge"
                      label="Building Age (years)"
                      value={buildingAge ?? undefined}
                      decimalPlaces={0}
                      disabled={isReadOnly}
                      onChange={e => setValue('buildingAge', e.target.value ?? undefined, { shouldDirty: true })}
                    />
                    <NumberInput
                      name="constructionYear"
                      label="Construction Year"
                      value={constructionYear ?? undefined}
                      decimalPlaces={0}
                      disabled={isReadOnly}
                      onChange={e => setValue('constructionYear', e.target.value ?? undefined, { shouldDirty: true })}
                    />

                    <div className="col-span-full">
                      <YesNoField
                        label="Is Residential"
                        value={isResidential}
                        onChange={v => setValue('isResidential', v, { shouldDirty: true })}
                        disabled={isReadOnly}
                      />
                      {isResidential && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Residential Remark</label>
                          <input
                            {...register('residentialRemark')}
                            type="text"
                            disabled={isReadOnly}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-span-full">
                      <YesNoField
                        label="Encroaching Others"
                        value={isEncroachingOthers}
                        onChange={v => setValue('isEncroachingOthers', v, { shouldDirty: true })}
                        disabled={isReadOnly}
                      />
                      {isEncroachingOthers && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Encroachment Remark</label>
                            <input
                              {...register('encroachingOthersRemark')}
                              type="text"
                              disabled={isReadOnly}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                            />
                          </div>
                          <NumberInput
                            name="encroachingOthersArea"
                            label="Encroaching Area (sq.m.)"
                            value={encroachingOthersArea ?? undefined}
                            decimalPlaces={2}
                            disabled={isReadOnly}
                            onChange={e => setValue('encroachingOthersArea', e.target.value ?? undefined, { shouldDirty: true })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-span-full">
                      <Dropdown
                        value={constructionStyleType ?? ''}
                        onChange={val => setValue('constructionStyleType', val as string, { shouldDirty: true })}
                        label="Construction Style"
                        options={CONSTRUCTION_STYLE_TYPE_OPTIONS}
                        disabled={isReadOnly}
                      />
                      {constructionStyleType === 'Other' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Construction Style Remark</label>
                          <input
                            {...register('constructionStyleRemark')}
                            type="text"
                            disabled={isReadOnly}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-span-full">
                      <Dropdown
                        value={constructionType ?? ''}
                        onChange={val => setValue('constructionType', val as string, { shouldDirty: true })}
                        label="Construction Type"
                        options={CONSTRUCTION_TYPE_OPTIONS}
                        disabled={isReadOnly}
                      />
                      {constructionType === 'Other' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Construction Type (Other)</label>
                          <input
                            {...register('constructionTypeOther')}
                            type="text"
                            disabled={isReadOnly}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-span-full">
                      <Dropdown
                        value={utilizationType ?? ''}
                        onChange={val => setValue('utilizationType', val as string, { shouldDirty: true })}
                        label="Utilization Type"
                        options={UTILIZATION_TYPE_OPTIONS}
                        disabled={isReadOnly}
                      />
                      {utilizationType === 'Other' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Utilization Type (Other)</label>
                          <input
                            {...register('utilizationTypeOther')}
                            type="text"
                            disabled={isReadOnly}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </Section>

                {/* Structure & Materials */}
                <Section id="structure-materials" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Icon name="layer-group" style="solid" className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Structure & Materials</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="flex flex-col gap-6">
                    <CheckboxGroup
                      label="Structure Type"
                      options={STRUCTURE_TYPE_OPTIONS}
                      value={structureType}
                      onChange={v => setValue('structureType', v, { shouldDirty: true })}
                      disabled={isReadOnly}
                    />
                    {structureType.includes('Other') && (
                      <input {...register('structureTypeOther')} placeholder="Other structure type" disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 max-w-sm" />
                    )}

                    <CheckboxGroup
                      label="Roof Frame Type"
                      options={ROOF_FRAME_TYPE_OPTIONS}
                      value={roofFrameType}
                      onChange={v => setValue('roofFrameType', v, { shouldDirty: true })}
                      disabled={isReadOnly}
                    />
                    {roofFrameType.includes('Other') && (
                      <input {...register('roofFrameTypeOther')} placeholder="Other roof frame type" disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 max-w-sm" />
                    )}

                    <CheckboxGroup
                      label="Roof Type"
                      options={ROOF_TYPE_OPTIONS}
                      value={roofType}
                      onChange={v => setValue('roofType', v, { shouldDirty: true })}
                      disabled={isReadOnly}
                    />
                    {roofType.includes('Other') && (
                      <input {...register('roofTypeOther')} placeholder="Other roof type" disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 max-w-sm" />
                    )}

                    <CheckboxGroup
                      label="Ceiling Type"
                      options={CEILING_TYPE_OPTIONS}
                      value={ceilingType}
                      onChange={v => setValue('ceilingType', v, { shouldDirty: true })}
                      disabled={isReadOnly}
                    />
                    {ceilingType.includes('Other') && (
                      <input {...register('ceilingTypeOther')} placeholder="Other ceiling type" disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 max-w-sm" />
                    )}

                    <CheckboxGroup
                      label="Interior Wall Type"
                      options={WALL_TYPE_OPTIONS}
                      value={interiorWallType}
                      onChange={v => setValue('interiorWallType', v, { shouldDirty: true })}
                      disabled={isReadOnly}
                    />
                    {interiorWallType.includes('Other') && (
                      <input {...register('interiorWallTypeOther')} placeholder="Other interior wall type" disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 max-w-sm" />
                    )}

                    <CheckboxGroup
                      label="Exterior Wall Type"
                      options={WALL_TYPE_OPTIONS}
                      value={exteriorWallType}
                      onChange={v => setValue('exteriorWallType', v, { shouldDirty: true })}
                      disabled={isReadOnly}
                    />
                    {exteriorWallType.includes('Other') && (
                      <input {...register('exteriorWallTypeOther')} placeholder="Other exterior wall type" disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 max-w-sm" />
                    )}

                    <CheckboxGroup
                      label="Fence Type"
                      options={FENCE_TYPE_OPTIONS}
                      value={fenceType}
                      onChange={v => setValue('fenceType', v, { shouldDirty: true })}
                      disabled={isReadOnly}
                    />
                    {fenceType.includes('Other') && (
                      <input {...register('fenceTypeOther')} placeholder="Other fence type" disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 max-w-sm" />
                    )}
                  </div>
                </Section>

                {/* Floor Surfaces */}
                <Section id="floor-surfaces" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                      <Icon name="table-list" style="solid" className="w-5 h-5 text-teal-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Floor Surfaces</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-4" />

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
                        {surfaceFields.map((field, index) => {
                          const structureVal = watch(`surfaces.${index}.floorStructureType`);
                          const surfaceVal = watch(`surfaces.${index}.floorSurfaceType`);
                          const fromFloor = watch(`surfaces.${index}.fromFloorNumber`);
                          const toFloor = watch(`surfaces.${index}.toFloorNumber`);
                          return (
                            <tr key={field.id} className="border-b border-gray-100">
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
                                  options={FLOOR_STRUCTURE_TYPE_OPTIONS}
                                  disabled={isReadOnly}
                                />
                              </td>
                              <td className="py-2 px-3 min-w-[160px]">
                                <Dropdown
                                  value={surfaceVal ?? ''}
                                  onChange={val => setValue(`surfaces.${index}.floorSurfaceType`, val as string, { shouldDirty: true })}
                                  options={FLOOR_SURFACE_TYPE_OPTIONS}
                                  disabled={isReadOnly}
                                />
                              </td>
                              {!isReadOnly && (
                                <td className="py-2 px-3">
                                  <button type="button" onClick={() => removeSurface(index)}
                                    className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Icon name="trash" style="regular" className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => appendSurface({ fromFloorNumber: undefined, toFloorNumber: undefined, floorType: '', floorStructureType: '', floorSurfaceType: '' })}
                      className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary-700 transition-colors"
                    >
                      <Icon name="plus" style="solid" className="w-4 h-4" />
                      Add surface row
                    </button>
                  )}
                </Section>

                {/* Area Detail */}
                <Section id="area-detail" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Icon name="chart-area" style="solid" className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Area Detail</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-4" />

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-2/3">Description</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-1/4">Area (sq.m.)</th>
                          {!isReadOnly && <th className="py-2 px-3 w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {areaFields.map((field, index) => (
                          <tr key={field.id} className="border-b border-gray-100">
                            <td className="py-2 px-3">
                              <input
                                {...register(`areaDetails.${index}.areaDescription`)}
                                type="text"
                                disabled={isReadOnly}
                                placeholder="e.g. Interior Area"
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-transparent disabled:border-transparent"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                {...register(`areaDetails.${index}.areaSize`)}
                                type="number"
                                disabled={isReadOnly}
                                placeholder="0.00"
                                className="w-full text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-transparent disabled:border-transparent"
                              />
                            </td>
                            {!isReadOnly && (
                              <td className="py-2 px-3">
                                <button type="button" onClick={() => removeArea(index)}
                                  className="text-gray-400 hover:text-red-500 transition-colors">
                                  <Icon name="trash" style="regular" className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-medium">
                          <td className="py-2 px-3 text-sm text-gray-700">Total</td>
                          <td className="py-2 px-3 text-right text-sm text-gray-900">
                            {areaTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {!isReadOnly && <td />}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => appendArea({ areaDescription: '', areaSize: undefined })}
                      className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary-700 transition-colors"
                    >
                      <Icon name="plus" style="solid" className="w-4 h-4" />
                      Add row
                    </button>
                  )}
                </Section>

                {/* Depreciation */}
                <Section id="depreciation" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
                      <Icon name="chart-line" style="solid" className="w-5 h-5 text-rose-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Depreciation</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-4" />

                  <div className="flex flex-col gap-6">
                    {depreciationFields.map((field, dIdx) => {
                      const dArea = watch(`depreciationDetails.${dIdx}.area`);
                      const dYear = watch(`depreciationDetails.${dIdx}.year`);
                      const dMethod = watch(`depreciationDetails.${dIdx}.depreciationMethod`);
                      const dIsBuilding = watch(`depreciationDetails.${dIdx}.isBuilding`);
                      return (
                        <div key={field.id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-semibold text-gray-800">
                              Depreciation Item {dIdx + 1}
                            </p>
                            {!isReadOnly && (
                              <button type="button" onClick={() => removeDepreciation(dIdx)}
                                className="text-gray-400 hover:text-red-500 transition-colors">
                                <Icon name="trash" style="regular" className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Area Description</label>
                              <input
                                {...register(`depreciationDetails.${dIdx}.areaDescription`)}
                                type="text"
                                disabled={isReadOnly}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                              />
                            </div>
                            <NumberInput
                              name={`depreciationDetails.${dIdx}.area`}
                              label="Area (sq.m.)"
                              value={dArea ?? undefined}
                              decimalPlaces={2}
                              disabled={isReadOnly}
                              onChange={e => setValue(`depreciationDetails.${dIdx}.area`, e.target.value ?? undefined, { shouldDirty: true })}
                            />
                            <NumberInput
                              name={`depreciationDetails.${dIdx}.year`}
                              label="Year"
                              value={dYear ?? undefined}
                              decimalPlaces={0}
                              disabled={isReadOnly}
                              onChange={e => setValue(`depreciationDetails.${dIdx}.year`, e.target.value ?? undefined, { shouldDirty: true })}
                            />
                            <div>
                              <YesNoField
                                label="Is Building"
                                value={dIsBuilding}
                                onChange={v => setValue(`depreciationDetails.${dIdx}.isBuilding`, v, { shouldDirty: true })}
                                disabled={isReadOnly}
                              />
                            </div>
                            <Dropdown
                              value={dMethod ?? ''}
                              onChange={val => setValue(`depreciationDetails.${dIdx}.depreciationMethod`, val as string, { shouldDirty: true })}
                              label="Depreciation Method"
                              options={DEPRECIATION_METHOD_OPTIONS}
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => appendDepreciation({ areaDescription: '', area: undefined, year: undefined, isBuilding: true, depreciationMethod: '', periods: [] })}
                      className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary-700 transition-colors"
                    >
                      <Icon name="plus" style="solid" className="w-4 h-4" />
                      Add depreciation item
                    </button>
                  )}
                </Section>

                {/* Remark */}
                <Section id="remark" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon name="comment" style="solid" className="w-5 h-5 text-gray-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Remark</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-4" />
                  <textarea
                    {...register('remark')}
                    rows={4}
                    disabled={isReadOnly}
                    placeholder="Additional remarks..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </Section>

              </div>
            </ResizableSidebar.Main>
          </ResizableSidebar>
        </div>

        {/* Action Bar */}
        <ActionBar>
          <ActionBar.Left>
            <CancelButton />
            {!isReadOnly && (
              <>
                <ActionBar.Divider />
                <ActionBar.UnsavedIndicator show={hasDirtyFields} />
              </>
            )}
          </ActionBar.Left>
          {!isReadOnly && (
            <ActionBar.Right>
              <Button
                variant="ghost"
                type="button"
                onClick={handleSaveDraft}
                isLoading={isPending && saveAction === 'draft'}
                disabled={isPending}
              >
                <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                Save draft
              </Button>
              <Button
                type="submit"
                isLoading={isPending && saveAction === 'submit'}
                disabled={isPending}
              >
                <Icon name="check" style="solid" className="size-4 mr-2" />
                Save
              </Button>
            </ActionBar.Right>
          )}
        </ActionBar>

        <UnsavedChangesDialog blocker={blocker} />
      </form>
    </div>
  );
}
