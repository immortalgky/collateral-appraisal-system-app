import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import type { ApiError } from '@/shared/types/api';

import { useGetCondoTowerById, useCreateCondoTower, useUpdateCondoTower } from '../api/condoTower';
import { useGetCondoModels } from '../api/condoModel';
import SectionRow from '../components/SectionRow';
import RadioGroup from '../components/RadioGroup';
import { FLOOR_MATERIAL_OPTIONS, ROOF_OPTIONS } from '../data/options';

type AppError = AxiosError & { apiError?: ApiError };

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const towerDetailSchema = z.object({
  towerName: z.string().optional(),
  numberOfUnits: z.coerce.number().min(1, 'Required'),
  numberOfFloors: z.coerce.number().min(1, 'Required'),
  condoRegistrationNumber: z.string().min(1, 'Registration number is required'),
  modelTypeIds: z.array(z.string()).optional(),
  conditionType: z.string().optional(),
  hasObligation: z.boolean().optional(),
  obligationDetails: z.string().optional(),
  documentValidationType: z.string().optional(),
  isLocationCorrect: z.boolean().optional(),
  distance: z.coerce.number().optional(),
  roadWidth: z.coerce.number().optional(),
  rightOfWay: z.coerce.number().optional(),
  roadSurfaceType: z.string().optional(),
  roadSurfaceTypeOther: z.string().optional(),
  decorationType: z.string().optional(),
  decorationTypeOther: z.string().optional(),
  constructionYear: z.coerce.number().optional(),
  totalNumberOfFloors: z.coerce.number().optional(),
  buildingFormType: z.string().optional(),
  constructionMaterialType: z.string().optional(),
  groundFloorMaterialType: z.string().optional(),
  groundFloorMaterialTypeOther: z.string().optional(),
  upperFloorMaterialType: z.string().optional(),
  upperFloorMaterialTypeOther: z.string().optional(),
  bathroomFloorMaterialType: z.string().optional(),
  bathroomFloorMaterialTypeOther: z.string().optional(),
  roofType: z.array(z.string()).optional(),
  roofTypeOther: z.string().optional(),
  isExpropriated: z.boolean().optional(),
  expropriationRemark: z.string().optional(),
  isInExpropriationLine: z.boolean().optional(),
  royalDecree: z.string().optional(),
  isForestBoundary: z.boolean().optional(),
  forestBoundaryRemark: z.string().optional(),
  remark: z.string().optional(),
});

type TowerDetailFormType = z.infer<typeof towerDetailSchema>;

const towerDetailDefaults: TowerDetailFormType = {
  towerName: '',
  numberOfUnits: 0,
  numberOfFloors: 0,
  condoRegistrationNumber: '',
  modelTypeIds: [],
  conditionType: '',
  hasObligation: false,
  obligationDetails: '',
  documentValidationType: '',
  isLocationCorrect: true,
  distance: undefined,
  roadWidth: undefined,
  rightOfWay: undefined,
  roadSurfaceType: '',
  roadSurfaceTypeOther: '',
  decorationType: '',
  decorationTypeOther: '',
  constructionYear: undefined,
  totalNumberOfFloors: undefined,
  buildingFormType: '',
  constructionMaterialType: '',
  groundFloorMaterialType: '',
  groundFloorMaterialTypeOther: '',
  upperFloorMaterialType: '',
  upperFloorMaterialTypeOther: '',
  bathroomFloorMaterialType: '',
  bathroomFloorMaterialTypeOther: '',
  roofType: [],
  roofTypeOther: '',
  isExpropriated: false,
  expropriationRemark: '',
  isInExpropriationLine: false,
  royalDecree: '',
  isForestBoundary: false,
  forestBoundaryRemark: '',
  remark: '',
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CONDITION_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Old', label: 'Old' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Dilapidated', label: 'Dilapidated' },
];

const ROAD_SURFACE_OPTIONS = [
  { value: 'Concrete', label: 'Concrete' },
  { value: 'Asphalt', label: 'Asphalt' },
  { value: 'GravelCrushedStone', label: 'Gravel/crushed stone' },
  { value: 'Soil', label: 'Soil' },
  { value: 'Other', label: 'Other' },
];

const DECORATION_OPTIONS = [
  { value: 'ReadyToMoveIn', label: 'Ready to move in' },
  { value: 'Partially', label: 'Partially' },
  { value: 'None', label: 'None' },
  { value: 'Other', label: 'Other' },
];

const QUALITY_OPTIONS = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Good', label: 'Good' },
  { value: 'VeryGood', label: 'Very Good' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TowerDetailPage() {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const appraisalId = useAppraisalId();
  const { towerId } = useParams<{ towerId?: string }>();

  const isEditMode = Boolean(towerId);

  const { data: towerData, isLoading } = useGetCondoTowerById(appraisalId ?? '', towerId);
  const { data: modelsData } = useGetCondoModels(appraisalId ?? '');
  const models = Array.isArray(modelsData) ? modelsData : Array.isArray(modelsData?.models) ? modelsData.models : [];
  const { mutate: createTower, isPending: isCreating } = useCreateCondoTower();
  const { mutate: updateTower, isPending: isUpdating } = useUpdateCondoTower();

  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const formDefaults = useMemo<TowerDetailFormType>(() => {
    if (isEditMode && towerData) {
      return {
        towerName: towerData.towerName ?? '',
        numberOfUnits: towerData.numberOfUnits ?? 0,
        numberOfFloors: towerData.numberOfFloors ?? 0,
        condoRegistrationNumber: towerData.condoRegistrationNumber ?? '',
        modelTypeIds: towerData.modelTypeIds ?? [],
        conditionType: towerData.conditionType ?? '',
        hasObligation: towerData.hasObligation ?? false,
        obligationDetails: towerData.obligationDetails ?? '',
        documentValidationType: towerData.documentValidationType ?? '',
        isLocationCorrect: towerData.isLocationCorrect ?? true,
        distance: towerData.distance,
        roadWidth: towerData.roadWidth,
        rightOfWay: towerData.rightOfWay,
        roadSurfaceType: towerData.roadSurfaceType ?? '',
        roadSurfaceTypeOther: towerData.roadSurfaceTypeOther ?? '',
        decorationType: towerData.decorationType ?? '',
        decorationTypeOther: towerData.decorationTypeOther ?? '',
        constructionYear: towerData.constructionYear,
        totalNumberOfFloors: towerData.totalNumberOfFloors,
        buildingFormType: towerData.buildingFormType ?? '',
        constructionMaterialType: towerData.constructionMaterialType ?? '',
        groundFloorMaterialType: towerData.groundFloorMaterialType ?? '',
        groundFloorMaterialTypeOther: towerData.groundFloorMaterialTypeOther ?? '',
        upperFloorMaterialType: towerData.upperFloorMaterialType ?? '',
        upperFloorMaterialTypeOther: towerData.upperFloorMaterialTypeOther ?? '',
        bathroomFloorMaterialType: towerData.bathroomFloorMaterialType ?? '',
        bathroomFloorMaterialTypeOther: towerData.bathroomFloorMaterialTypeOther ?? '',
        roofType: towerData.roofType ?? [],
        roofTypeOther: towerData.roofTypeOther ?? '',
        isExpropriated: towerData.isExpropriated ?? false,
        expropriationRemark: towerData.expropriationRemark ?? '',
        isInExpropriationLine: towerData.isInExpropriationLine ?? false,
        royalDecree: towerData.royalDecree ?? '',
        isForestBoundary: towerData.isForestBoundary ?? false,
        forestBoundaryRemark: towerData.forestBoundaryRemark ?? '',
        remark: towerData.remark ?? '',
      };
    }
    return towerDetailDefaults;
  }, [isEditMode, towerData]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { dirtyFields, errors },
  } = useForm<TowerDetailFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(towerDetailSchema),
  });

  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);
  const { isOpen, onToggle } = useDisclosure();

  useEffect(() => {
    if (isEditMode && towerData) {
      reset(formDefaults);
    }
  }, [isEditMode, towerData, reset, formDefaults]);

  const handleNavigateBack = () => {
    navigate(`${basePath}/block-condo?tab=towers`);
  };

  const submitForm = (data: TowerDetailFormType, isDraft: boolean) => {
    if (!appraisalId) return;
    const successMsg = isDraft ? 'Draft saved successfully' : 'Tower saved successfully';
    if (isEditMode && towerId) {
      updateTower(
        { appraisalId, towerId, data },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(isDraft ? 'Draft saved successfully' : 'Tower updated successfully');
            setSaveAction(null);
          },
          onError: (error: AppError) => {
            toast.error(error.apiError?.detail || (isDraft ? 'Failed to save draft' : 'Failed to update tower'));
            setSaveAction(null);
          },
        },
      );
    } else {
      createTower(
        { appraisalId, data },
        {
          onSuccess: response => {
            toast.success(successMsg);
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/block-condo/tower/${response.id}`);
          },
          onError: (error: AppError) => {
            toast.error(error.apiError?.detail || (isDraft ? 'Failed to save draft' : 'Failed to create tower'));
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

  // Watched values for controlled inputs
  const conditionType = watch('conditionType');
  const hasObligation = watch('hasObligation');
  const documentValidationType = watch('documentValidationType');
  const isLocationCorrect = watch('isLocationCorrect');
  const roadSurfaceType = watch('roadSurfaceType');
  const decorationType = watch('decorationType');
  const buildingFormType = watch('buildingFormType');
  const constructionMaterialType = watch('constructionMaterialType');
  const groundFloorMaterialType = watch('groundFloorMaterialType');
  const upperFloorMaterialType = watch('upperFloorMaterialType');
  const bathroomFloorMaterialType = watch('bathroomFloorMaterialType');
  const roofType = watch('roofType') ?? [];
  const isExpropriated = watch('isExpropriated');
  const isInExpropriationLine = watch('isInExpropriationLine');
  const isForestBoundary = watch('isForestBoundary');
  const modelTypeIds = watch('modelTypeIds') ?? [];

  const toggleRoofType = (value: string) => {
    const current = roofType;
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setValue('roofType', updated, { shouldDirty: true });
  };

  const toggleModelType = (id: string) => {
    const current = modelTypeIds;
    const updated = current.includes(id)
      ? current.filter(v => v !== id)
      : [...current, id];
    setValue('modelTypeIds', updated, { shouldDirty: true });
  };

  if (isLoading || (isEditMode && !towerData)) {
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
          containerId="tower-form-scroll"
          anchors={[
            { label: 'Images', id: 'tower-images', icon: 'images' },
            { label: 'Tower Info', id: 'tower-info', icon: 'building' },
            { label: 'Model Types', id: 'model-types', icon: 'layer-group' },
            { label: 'Condition', id: 'tower-condition', icon: 'star' },
            { label: 'Location', id: 'tower-location', icon: 'map-location-dot' },
            { label: 'Structure', id: 'tower-structure', icon: 'building-columns' },
            { label: 'Floor', id: 'tower-floor', icon: 'layer-group' },
            { label: 'Roof', id: 'tower-roof', icon: 'tent' },
            { label: 'Legal', id: 'tower-legal', icon: 'gavel' },
            { label: 'Remark', id: 'tower-remark', icon: 'comment' },
          ]}
        />
      </div>

      <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
        <div
          id="tower-form-scroll"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
        >
          <ResizableSidebar isOpen={isOpen} onToggle={onToggle} openedWidth="w-1/5" closedWidth="w-1/50">
            <ResizableSidebar.Main>
              <div className="flex-auto flex flex-col gap-6 min-w-0">

                {/* Tower Images */}
                <Section id="tower-images" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Icon name="images" style="solid" className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Tower Images</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-4" />
                  <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center py-12 gap-3">
                    <Icon name="images" style="regular" className="w-10 h-10 text-gray-300" />
                    <p className="text-sm text-gray-400">Image upload coming soon</p>
                    {towerData?.imageDocumentIds && towerData.imageDocumentIds.length > 0 && (
                      <div className="flex gap-2 flex-wrap justify-center mt-2">
                        {towerData.imageDocumentIds.map(docId => (
                          <div
                            key={docId}
                            className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center"
                          >
                            <Icon name="image" style="regular" className="w-6 h-6 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>

                {/* Tower Information */}
                <Section id="tower-info" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Icon name="building" style="solid" className="w-5 h-5 text-violet-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Tower Information</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="flex flex-col gap-6">
                    <SectionRow title="Tower Name" icon="tag">
                      <input
                        {...register('towerName')}
                        type="text"
                        disabled={isReadOnly}
                        placeholder="Enter tower name"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </SectionRow>

                    <SectionRow title="Number of Units *" icon="hashtag">
                      <div>
                        <input
                          {...register('numberOfUnits')}
                          type="number"
                          disabled={isReadOnly}
                          placeholder="0"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        {errors.numberOfUnits && (
                          <p className="text-xs text-red-500 mt-1">{errors.numberOfUnits.message}</p>
                        )}
                      </div>
                    </SectionRow>

                    <SectionRow title="Number of Floors *" icon="stairs">
                      <div>
                        <input
                          {...register('numberOfFloors')}
                          type="number"
                          disabled={isReadOnly}
                          placeholder="0"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        {errors.numberOfFloors && (
                          <p className="text-xs text-red-500 mt-1">{errors.numberOfFloors.message}</p>
                        )}
                      </div>
                    </SectionRow>

                    <SectionRow title="Condo Registration Number *" icon="id-card">
                      <div>
                        <input
                          {...register('condoRegistrationNumber')}
                          type="text"
                          disabled={isReadOnly}
                          placeholder="Enter registration number"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        {errors.condoRegistrationNumber && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.condoRegistrationNumber.message}
                          </p>
                        )}
                      </div>
                    </SectionRow>
                  </div>
                </Section>

                {/* Model Types */}
                <Section id="model-types" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                      <Icon name="layer-group" style="solid" className="w-5 h-5 text-sky-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Model Type</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-4" />
                  {models.length === 0 ? (
                    <p className="text-sm text-gray-400">No models available. Add models first.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {models.map(model => (
                        <label key={model.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modelTypeIds.includes(model.id)}
                            onChange={() => toggleModelType(model.id)}
                            disabled={isReadOnly}
                            className="accent-primary w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">
                            {model.modelName ?? model.id}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Condominium Condition */}
                <Section id="tower-condition" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Icon name="star" style="solid" className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Condominium Condition</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="flex flex-col gap-6">
                    <SectionRow title="Condition" icon="star">
                      <RadioGroup
                        name="conditionType"
                        options={CONDITION_OPTIONS}
                        value={conditionType ?? ''}
                        onChange={v => setValue('conditionType', v, { shouldDirty: true })}
                        disabled={isReadOnly}
                      />
                    </SectionRow>

                    <SectionRow title="Is Obligation" icon="file-contract">
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-4">
                          {[
                            { value: false, label: 'No obligations' },
                            { value: true, label: 'Mortgage as security' },
                          ].map(opt => (
                            <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={hasObligation === opt.value}
                                onChange={() => setValue('hasObligation', opt.value, { shouldDirty: true })}
                                disabled={isReadOnly}
                                className="accent-primary"
                              />
                              <span className="text-sm text-gray-700">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {hasObligation && (
                          <input
                            {...register('obligationDetails')}
                            type="text"
                            disabled={isReadOnly}
                            placeholder="Obligation details"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        )}
                      </div>
                    </SectionRow>

                    <SectionRow title="Document Validation" icon="file-check">
                      <RadioGroup
                        name="documentValidationType"
                        options={[
                          { value: 'CorrectlyMatched', label: 'Correctly Matched' },
                          { value: 'NotConsistent', label: 'Not Consistent' },
                        ]}
                        value={documentValidationType ?? ''}
                        onChange={v => setValue('documentValidationType', v, { shouldDirty: true })}
                        disabled={isReadOnly}
                      />
                    </SectionRow>
                  </div>
                </Section>

                {/* Location */}
                <Section id="tower-location" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Icon name="map-location-dot" style="solid" className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Condominium Location</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="flex flex-col gap-6">
                    <SectionRow title="Location Correct" icon="location-check">
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-4">
                          {[
                            { value: true, label: 'Correct' },
                            { value: false, label: 'Incorrect' },
                          ].map(opt => (
                            <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={isLocationCorrect === opt.value}
                                onChange={() =>
                                  setValue('isLocationCorrect', opt.value, { shouldDirty: true })
                                }
                                disabled={isReadOnly}
                                className="accent-primary"
                              />
                              <span className="text-sm text-gray-700">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Distance (m)</label>
                            <input
                              {...register('distance')}
                              type="number"
                              disabled={isReadOnly}
                              placeholder="0"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Road Width (m)</label>
                            <input
                              {...register('roadWidth')}
                              type="number"
                              disabled={isReadOnly}
                              placeholder="0"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Right of Way (m)</label>
                            <input
                              {...register('rightOfWay')}
                              type="number"
                              disabled={isReadOnly}
                              placeholder="0"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                            />
                          </div>
                        </div>
                      </div>
                    </SectionRow>

                    <SectionRow title="Road Surface" icon="road">
                      <RadioGroup
                        name="roadSurfaceType"
                        options={ROAD_SURFACE_OPTIONS}
                        value={roadSurfaceType ?? ''}
                        onChange={v => setValue('roadSurfaceType', v, { shouldDirty: true })}
                        showOther
                        otherValue={watch('roadSurfaceTypeOther')}
                        onOtherChange={v =>
                          setValue('roadSurfaceTypeOther', v, { shouldDirty: true })
                        }
                        disabled={isReadOnly}
                      />
                    </SectionRow>
                  </div>
                </Section>

                {/* Structure & Decoration */}
                <Section id="tower-structure" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
                      <Icon name="building-columns" style="solid" className="w-5 h-5 text-rose-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Structure & Decoration</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="flex flex-col gap-6">
                    <SectionRow title="Decoration *" icon="paint-roller">
                      <RadioGroup
                        name="decorationType"
                        options={DECORATION_OPTIONS}
                        value={decorationType ?? ''}
                        onChange={v => setValue('decorationType', v, { shouldDirty: true })}
                        showOther
                        otherValue={watch('decorationTypeOther')}
                        onOtherChange={v =>
                          setValue('decorationTypeOther', v, { shouldDirty: true })
                        }
                        disabled={isReadOnly}
                      />
                    </SectionRow>

                    <SectionRow title="Age / Height" icon="calendar">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Construction Year</label>
                          <input
                            {...register('constructionYear')}
                            type="number"
                            disabled={isReadOnly}
                            placeholder="e.g. 2010"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">
                            Total Number of Floors *
                          </label>
                          <input
                            {...register('totalNumberOfFloors')}
                            type="number"
                            disabled={isReadOnly}
                            placeholder="0"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </div>
                      </div>
                    </SectionRow>

                    <SectionRow title="Building Form" icon="building">
                      <RadioGroup
                        name="buildingFormType"
                        options={QUALITY_OPTIONS}
                        value={buildingFormType ?? ''}
                        onChange={v => setValue('buildingFormType', v, { shouldDirty: true })}
                        disabled={isReadOnly}
                      />
                    </SectionRow>

                    <SectionRow title="Construction Materials" icon="bricks">
                      <RadioGroup
                        name="constructionMaterialType"
                        options={QUALITY_OPTIONS}
                        value={constructionMaterialType ?? ''}
                        onChange={v => setValue('constructionMaterialType', v, { shouldDirty: true })}
                        disabled={isReadOnly}
                      />
                    </SectionRow>
                  </div>
                </Section>

                {/* Floor Materials */}
                <Section id="tower-floor" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Icon name="layer-group" style="solid" className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Floor Materials</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="flex flex-col gap-6">
                    <SectionRow title="Ground Flooring" icon="layer-group">
                      <RadioGroup
                        name="groundFloorMaterialType"
                        options={FLOOR_MATERIAL_OPTIONS}
                        value={groundFloorMaterialType ?? ''}
                        onChange={v => setValue('groundFloorMaterialType', v, { shouldDirty: true })}
                        showOther
                        otherValue={watch('groundFloorMaterialTypeOther')}
                        onOtherChange={v =>
                          setValue('groundFloorMaterialTypeOther', v, { shouldDirty: true })
                        }
                        disabled={isReadOnly}
                      />
                    </SectionRow>

                    <SectionRow title="Upper Flooring" icon="layer-group">
                      <RadioGroup
                        name="upperFloorMaterialType"
                        options={FLOOR_MATERIAL_OPTIONS}
                        value={upperFloorMaterialType ?? ''}
                        onChange={v => setValue('upperFloorMaterialType', v, { shouldDirty: true })}
                        showOther
                        otherValue={watch('upperFloorMaterialTypeOther')}
                        onOtherChange={v =>
                          setValue('upperFloorMaterialTypeOther', v, { shouldDirty: true })
                        }
                        disabled={isReadOnly}
                      />
                    </SectionRow>

                    <SectionRow title="Bathroom Flooring" icon="layer-group">
                      <RadioGroup
                        name="bathroomFloorMaterialType"
                        options={FLOOR_MATERIAL_OPTIONS}
                        value={bathroomFloorMaterialType ?? ''}
                        onChange={v =>
                          setValue('bathroomFloorMaterialType', v, { shouldDirty: true })
                        }
                        showOther
                        otherValue={watch('bathroomFloorMaterialTypeOther')}
                        onOtherChange={v =>
                          setValue('bathroomFloorMaterialTypeOther', v, { shouldDirty: true })
                        }
                        disabled={isReadOnly}
                      />
                    </SectionRow>
                  </div>
                </Section>

                {/* Roof */}
                <Section id="tower-roof" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <Icon name="tent" style="solid" className="w-5 h-5 text-cyan-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Roof</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-4" />
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {ROOF_OPTIONS.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roofType.includes(opt.value)}
                          onChange={() => toggleRoofType(opt.value)}
                          disabled={isReadOnly}
                          className="accent-primary w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                    {roofType.includes('Other') && (
                      <input
                        {...register('roofTypeOther')}
                        type="text"
                        disabled={isReadOnly}
                        placeholder="Please specify"
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    )}
                  </div>
                </Section>

                {/* Legal — Expropriation & Forest Boundary */}
                <Section id="tower-legal" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                      <Icon name="gavel" style="solid" className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Legal</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="flex flex-col gap-6">
                    <SectionRow title="Expropriation" icon="file-invoice">
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isExpropriated ?? false}
                              onChange={e =>
                                setValue('isExpropriated', e.target.checked, { shouldDirty: true })
                              }
                              disabled={isReadOnly}
                              className="accent-primary w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">Is Expropriated</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isInExpropriationLine ?? false}
                              onChange={e =>
                                setValue('isInExpropriationLine', e.target.checked, {
                                  shouldDirty: true,
                                })
                              }
                              disabled={isReadOnly}
                              className="accent-primary w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">In Line Expropriated</span>
                          </label>
                        </div>
                        {(isExpropriated || isInExpropriationLine) && (
                          <input
                            {...register('royalDecree')}
                            type="text"
                            disabled={isReadOnly}
                            placeholder="Royal Decree reference"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        )}
                        <input
                          {...register('expropriationRemark')}
                          type="text"
                          disabled={isReadOnly}
                          placeholder="Expropriation remark"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </div>
                    </SectionRow>

                    <SectionRow title="In Forest Boundary" icon="tree-city">
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-4">
                          {[
                            { value: true, label: 'Yes' },
                            { value: false, label: 'No' },
                          ].map(opt => (
                            <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={isForestBoundary === opt.value}
                                onChange={() =>
                                  setValue('isForestBoundary', opt.value, { shouldDirty: true })
                                }
                                disabled={isReadOnly}
                                className="accent-primary"
                              />
                              <span className="text-sm text-gray-700">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {isForestBoundary && (
                          <input
                            {...register('forestBoundaryRemark')}
                            type="text"
                            disabled={isReadOnly}
                            placeholder="Forest boundary remark"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        )}
                      </div>
                    </SectionRow>
                  </div>
                </Section>

                {/* Remark */}
                <Section id="tower-remark" anchor>
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
            <CancelButton onClick={handleNavigateBack} />
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
