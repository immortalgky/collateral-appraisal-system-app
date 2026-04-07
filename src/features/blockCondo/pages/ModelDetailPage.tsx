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
import type { ApiError } from '@/shared/types/api';

import { useGetCondoModelById, useCreateCondoModel, useUpdateCondoModel } from '../api/condoModel';
import SectionRow from '../components/SectionRow';
import RadioGroup from '../components/RadioGroup';
import { FLOOR_MATERIAL_OPTIONS } from '../data/options';

type AppError = AxiosError & { apiError?: ApiError };

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const areaDetailSchema = z.object({
  id: z.string().optional(),
  areaDescription: z.string().optional(),
  areaSize: z.coerce.number().optional(),
});

const modelDetailSchema = z.object({
  modelName: z.string().min(1, 'Model name is required'),
  modelDescription: z.string().optional(),
  buildingNumber: z.string().min(1, 'Building number is required'),
  startingPriceMin: z.coerce.number().optional(),
  startingPriceMax: z.coerce.number().optional(),
  hasMezzanine: z.boolean().optional(),
  usableAreaMin: z.coerce.number().optional(),
  usableAreaMax: z.coerce.number().optional(),
  standardUsableArea: z.coerce.number().optional(),
  fireInsuranceCondition: z.string().optional(),
  roomLayoutType: z.string().optional(),
  roomLayoutTypeOther: z.string().optional(),
  groundFloorMaterialType: z.string().optional(),
  groundFloorMaterialTypeOther: z.string().optional(),
  upperFloorMaterialType: z.string().optional(),
  upperFloorMaterialTypeOther: z.string().optional(),
  bathroomFloorMaterialType: z.string().optional(),
  bathroomFloorMaterialTypeOther: z.string().optional(),
  remark: z.string().optional(),
  areaDetails: z.array(areaDetailSchema).optional(),
});

type ModelDetailFormType = z.infer<typeof modelDetailSchema>;

const modelDetailDefaults: ModelDetailFormType = {
  modelName: '',
  modelDescription: '',
  buildingNumber: '',
  startingPriceMin: undefined,
  startingPriceMax: undefined,
  hasMezzanine: false,
  usableAreaMin: undefined,
  usableAreaMax: undefined,
  standardUsableArea: undefined,
  fireInsuranceCondition: '',
  roomLayoutType: '',
  roomLayoutTypeOther: '',
  groundFloorMaterialType: '',
  groundFloorMaterialTypeOther: '',
  upperFloorMaterialType: '',
  upperFloorMaterialTypeOther: '',
  bathroomFloorMaterialType: '',
  bathroomFloorMaterialTypeOther: '',
  remark: '',
  areaDetails: [],
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ROOM_LAYOUT_OPTIONS = [
  { value: 'Studio', label: 'Studio' },
  { value: '1Bedroom', label: '1 Bedroom' },
  { value: '2Bedroom', label: '2 Bedroom' },
  { value: 'Duplex', label: 'Duplex' },
  { value: 'Penthouse', label: 'Penthouse' },
  { value: 'Other', label: 'Other' },
];

const FIRE_INSURANCE_OPTIONS = [
  { value: 'WithInsurance', label: 'With insurance' },
  { value: 'WithoutInsurance', label: 'Without insurance' },
  { value: 'Unknown', label: 'Unknown' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ModelDetailPage() {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const appraisalId = useAppraisalId();
  const { modelId } = useParams<{ modelId?: string }>();

  const isEditMode = Boolean(modelId);

  const { data: modelData, isLoading } = useGetCondoModelById(appraisalId ?? '', modelId);
  const { mutate: createModel, isPending: isCreating } = useCreateCondoModel();
  const { mutate: updateModel, isPending: isUpdating } = useUpdateCondoModel();

  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const formDefaults = useMemo<ModelDetailFormType>(() => {
    if (isEditMode && modelData) {
      return {
        modelName: modelData.modelName ?? '',
        modelDescription: modelData.modelDescription ?? '',
        buildingNumber: modelData.buildingNumber ?? '',
        startingPriceMin: modelData.startingPriceMin,
        startingPriceMax: modelData.startingPriceMax,
        hasMezzanine: modelData.hasMezzanine ?? false,
        usableAreaMin: modelData.usableAreaMin,
        usableAreaMax: modelData.usableAreaMax,
        standardUsableArea: modelData.standardUsableArea,
        fireInsuranceCondition: modelData.fireInsuranceCondition ?? '',
        roomLayoutType: modelData.roomLayoutType ?? '',
        roomLayoutTypeOther: modelData.roomLayoutTypeOther ?? '',
        groundFloorMaterialType: modelData.groundFloorMaterialType ?? '',
        groundFloorMaterialTypeOther: modelData.groundFloorMaterialTypeOther ?? '',
        upperFloorMaterialType: modelData.upperFloorMaterialType ?? '',
        upperFloorMaterialTypeOther: modelData.upperFloorMaterialTypeOther ?? '',
        bathroomFloorMaterialType: modelData.bathroomFloorMaterialType ?? '',
        bathroomFloorMaterialTypeOther: modelData.bathroomFloorMaterialTypeOther ?? '',
        remark: modelData.remark ?? '',
        areaDetails: modelData.areaDetails ?? [],
      };
    }
    return modelDetailDefaults;
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
  } = useForm<ModelDetailFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(modelDetailSchema),
  });

  const { fields: areaFields, append: appendArea, remove: removeArea } = useFieldArray({
    control,
    name: 'areaDetails',
  });

  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);
  const { isOpen, onToggle } = useDisclosure();

  useEffect(() => {
    if (isEditMode && modelData) {
      reset(formDefaults);
    }
  }, [isEditMode, modelData, reset, formDefaults]);

  const handleNavigateBack = () => {
    navigate(`${basePath}/block-condo?tab=models`);
  };

  const submitForm = (data: ModelDetailFormType, isDraft: boolean) => {
    if (!appraisalId) return;
    const successMsg = isDraft ? 'Draft saved successfully' : 'Model saved successfully';
    if (isEditMode && modelId) {
      updateModel(
        { appraisalId, modelId, data },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(isDraft ? 'Draft saved successfully' : 'Model updated successfully');
            setSaveAction(null);
          },
          onError: (error: AppError) => {
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
            toast.success(successMsg);
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/block-condo/model/${response.id}`);
          },
          onError: (error: AppError) => {
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

  const roomLayoutType = watch('roomLayoutType');
  const groundFloorMaterialType = watch('groundFloorMaterialType');
  const upperFloorMaterialType = watch('upperFloorMaterialType');
  const bathroomFloorMaterialType = watch('bathroomFloorMaterialType');
  const hasMezzanine = watch('hasMezzanine');

  // Compute area total
  const areaDetailsValues = watch('areaDetails');
  const areaTotal = (areaDetailsValues ?? []).reduce(
    (sum, d) => sum + (Number(d.areaSize) || 0),
    0,
  );

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
          containerId="model-form-scroll"
          anchors={[
            { label: 'Images', id: 'model-images', icon: 'images' },
            { label: 'Model Info', id: 'model-info', icon: 'layer-group' },
            { label: 'Room Layout', id: 'room-layout', icon: 'door-open' },
            { label: 'Floor Materials', id: 'floor-materials', icon: 'layer-group' },
            { label: 'Area Detail', id: 'area-detail', icon: 'chart-area' },
            { label: 'Remark', id: 'remark', icon: 'comment' },
          ]}
        />
      </div>

      <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
        <div
          id="model-form-scroll"
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
                    {modelData?.imageDocumentIds && modelData.imageDocumentIds.length > 0 && (
                      <div className="flex gap-2 flex-wrap justify-center mt-2">
                        {modelData.imageDocumentIds.map(docId => (
                          <div
                            key={docId}
                            className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-500 overflow-hidden"
                          >
                            <Icon name="image" style="regular" className="w-6 h-6 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>

                {/* Model Information */}
                <Section id="model-info" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Icon name="layer-group" style="solid" className="w-5 h-5 text-violet-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Model Information</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="flex flex-col gap-6">
                    <SectionRow title="Model Name *" icon="tag">
                      <div>
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
                    </SectionRow>

                    <SectionRow title="Model Description" icon="align-left">
                      <textarea
                        {...register('modelDescription')}
                        rows={2}
                        disabled={isReadOnly}
                        placeholder="Enter description"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </SectionRow>

                    <SectionRow title="Building Number *" icon="hashtag">
                      <div>
                        <input
                          {...register('buildingNumber')}
                          type="text"
                          disabled={isReadOnly}
                          placeholder="Enter building number"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        {errors.buildingNumber && (
                          <p className="text-xs text-red-500 mt-1">{errors.buildingNumber.message}</p>
                        )}
                      </div>
                    </SectionRow>

                    <SectionRow title="Starting Price Range" icon="money-bill">
                      <div className="flex items-center gap-3">
                        <input
                          {...register('startingPriceMin')}
                          type="number"
                          disabled={isReadOnly}
                          placeholder="Min"
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <span className="text-sm text-gray-400">–</span>
                        <input
                          {...register('startingPriceMax')}
                          type="number"
                          disabled={isReadOnly}
                          placeholder="Max"
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <span className="text-sm text-gray-500 shrink-0">THB</span>
                      </div>
                    </SectionRow>

                    <SectionRow title="Has Mezzanine" icon="stairs">
                      <div className="flex gap-4">
                        {[
                          { value: true, label: 'Yes' },
                          { value: false, label: 'No' },
                        ].map(opt => (
                          <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={hasMezzanine === opt.value}
                              onChange={() => setValue('hasMezzanine', opt.value, { shouldDirty: true })}
                              disabled={isReadOnly}
                              className="accent-primary"
                            />
                            <span className="text-sm text-gray-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </SectionRow>

                    <SectionRow title="Usable Area Range" icon="ruler">
                      <div className="flex items-center gap-3">
                        <input
                          {...register('usableAreaMin')}
                          type="number"
                          disabled={isReadOnly}
                          placeholder="Min"
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <span className="text-sm text-gray-400">–</span>
                        <input
                          {...register('usableAreaMax')}
                          type="number"
                          disabled={isReadOnly}
                          placeholder="Max"
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <span className="text-sm text-gray-500 shrink-0">sq.m.</span>
                      </div>
                    </SectionRow>

                    <SectionRow title="Standard Usable Area *" icon="ruler-combined">
                      <input
                        {...register('standardUsableArea')}
                        type="number"
                        disabled={isReadOnly}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </SectionRow>

                    <SectionRow title="Fire Insurance Condition *" icon="fire">
                      <select
                        {...register('fireInsuranceCondition')}
                        disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="">Select condition</option>
                        {FIRE_INSURANCE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </SectionRow>
                  </div>
                </Section>

                {/* Room Layout */}
                <Section id="room-layout" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                      <Icon name="door-open" style="solid" className="w-5 h-5 text-sky-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Room Layout</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-4" />
                  <RadioGroup
                    name="roomLayoutType"
                    options={ROOM_LAYOUT_OPTIONS}
                    value={roomLayoutType ?? ''}
                    onChange={v => setValue('roomLayoutType', v, { shouldDirty: true })}
                    showOther
                    otherValue={watch('roomLayoutTypeOther')}
                    onOtherChange={v => setValue('roomLayoutTypeOther', v, { shouldDirty: true })}
                    disabled={isReadOnly}
                  />
                </Section>

                {/* Floor Materials */}
                <Section id="floor-materials" anchor>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Icon name="layer-group" style="solid" className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Floor Materials</h2>
                  </div>
                  <div className="h-px bg-gray-200 mb-6" />

                  <div className="flex flex-col gap-6">
                    <SectionRow title="Ground Flooring Materials" icon="layer-group">
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

                    <SectionRow title="Upper Flooring Materials" icon="layer-group">
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

                    <SectionRow title="Bathroom Flooring Materials" icon="layer-group">
                      <RadioGroup
                        name="bathroomFloorMaterialType"
                        options={FLOOR_MATERIAL_OPTIONS}
                        value={bathroomFloorMaterialType ?? ''}
                        onChange={v => setValue('bathroomFloorMaterialType', v, { shouldDirty: true })}
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
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-2/3">
                            Description
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-1/4">
                            Area (sq.m.)
                          </th>
                          {!isReadOnly && (
                            <th className="py-2 px-3 w-10" />
                          )}
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
                                <button
                                  type="button"
                                  onClick={() => removeArea(index)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Icon name="trash" style="regular" className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {/* Total row */}
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
