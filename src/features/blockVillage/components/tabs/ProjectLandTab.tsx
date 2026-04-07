import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetVillageProjectLand, useSaveVillageProjectLand } from '../../api/villageProjectLand';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import ActionBar from '@shared/components/ActionBar';
import CancelButton from '@shared/components/buttons/CancelButton';
import TextInput from '@shared/components/inputs/TextInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import { LAND_TYPE_OPTIONS, TITLE_TYPE_OPTIONS } from '../../data/options';

// ==================== Schema ====================

const landTitleSchema = z.object({
  id: z.string().optional(),
  titleNumber: z.string().optional().nullable(),
  titleType: z.string().optional().nullable(),
  areaRai: z.coerce.number().optional().nullable(),
  areaNgan: z.coerce.number().optional().nullable(),
  areaWa: z.coerce.number().optional().nullable(),
});

const projectLandSchema = z.object({
  landType: z.string().optional().nullable(),
  totalArea: z.coerce.number().optional().nullable(),
  totalAreaRai: z.coerce.number().optional().nullable(),
  totalAreaNgan: z.coerce.number().optional().nullable(),
  totalAreaWa: z.coerce.number().optional().nullable(),
  province: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  subDistrict: z.string().optional().nullable(),
  titles: z.array(landTitleSchema).optional(),
});

type ProjectLandFormValues = z.infer<typeof projectLandSchema>;

// ==================== Sub-components ====================

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

// ==================== Main Component ====================

export default function ProjectLandTab() {
  const appraisalId = useAppraisalId();
  const { data: land, isLoading } = useGetVillageProjectLand(appraisalId ?? '');
  const { mutate: saveLand, isPending } = useSaveVillageProjectLand(appraisalId ?? '');

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<ProjectLandFormValues>({
    resolver: zodResolver(projectLandSchema),
    defaultValues: {
      titles: [],
    },
  });

  const { fields: titleFields, append: appendTitle, remove: removeTitle } = useFieldArray({
    control,
    name: 'titles',
  });

  useEffect(() => {
    if (land) {
      reset({
        landType: land.landType ?? null,
        totalArea: land.totalArea ?? null,
        totalAreaRai: land.totalAreaRai ?? null,
        totalAreaNgan: land.totalAreaNgan ?? null,
        totalAreaWa: land.totalAreaWa ?? null,
        province: land.province ?? null,
        district: land.district ?? null,
        subDistrict: land.subDistrict ?? null,
        titles: land.titles ?? [],
      });
    }
  }, [land, reset]);

  const onSubmit = (data: ProjectLandFormValues, isDraft = false) => {
    if (!appraisalId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveLand(data as any, {
      onSuccess: () => {
        toast.success(isDraft ? 'Draft saved successfully' : 'Project land saved');
        reset(data);
      },
      onError: (err: unknown) => {
        const error = err as AppError;
        toast.error(error?.apiError?.detail ?? 'Failed to save project land');
      },
    });
  };

  const landType = watch('landType');
  const totalArea = watch('totalArea');
  const totalAreaRai = watch('totalAreaRai');
  const totalAreaNgan = watch('totalAreaNgan');
  const totalAreaWa = watch('totalAreaWa');

  // Compute title area totals
  const titles = watch('titles') ?? [];
  const totalTitleRai = titles.reduce((s, t) => s + (Number(t.areaRai) || 0), 0);
  const totalTitleNgan = titles.reduce((s, t) => s + (Number(t.areaNgan) || 0), 0);
  const totalTitleWa = titles.reduce((s, t) => s + (Number(t.areaWa) || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(data => onSubmit(data, false))}
      className="flex flex-col h-full min-h-0"
    >
      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-4">
        {/* Land Details */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            icon="map"
            label="Land Details"
            color="bg-emerald-50 text-emerald-600"
          />
          <div className="h-px bg-gray-100 mb-5" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Dropdown
              value={landType ?? ''}
              onChange={val => setValue('landType', val as string, { shouldDirty: true })}
              label="Land Type"
              options={LAND_TYPE_OPTIONS}
              error={errors.landType?.message}
            />
            <TextInput
              {...register('province')}
              label="Province"
              error={errors.province?.message}
            />
            <TextInput
              {...register('district')}
              label="District"
              error={errors.district?.message}
            />
            <TextInput
              {...register('subDistrict')}
              label="Sub District"
              error={errors.subDistrict?.message}
            />
          </div>
        </div>

        {/* Total Area */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            icon="ruler-combined"
            label="Total Area"
            color="bg-blue-50 text-blue-600"
          />
          <div className="h-px bg-gray-100 mb-5" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <NumberInput
              name="totalArea"
              label="Total Area (sq.m.)"
              value={totalArea}
              decimalPlaces={2}
              onChange={e => setValue('totalArea', e.target.value, { shouldDirty: true })}
              error={errors.totalArea?.message}
            />
            <NumberInput
              name="totalAreaRai"
              label="Rai"
              value={totalAreaRai}
              decimalPlaces={0}
              onChange={e => setValue('totalAreaRai', e.target.value, { shouldDirty: true })}
              error={errors.totalAreaRai?.message}
            />
            <NumberInput
              name="totalAreaNgan"
              label="Ngan"
              value={totalAreaNgan}
              decimalPlaces={0}
              onChange={e => setValue('totalAreaNgan', e.target.value, { shouldDirty: true })}
              error={errors.totalAreaNgan?.message}
            />
            <NumberInput
              name="totalAreaWa"
              label="Wa"
              value={totalAreaWa}
              decimalPlaces={2}
              onChange={e => setValue('totalAreaWa', e.target.value, { shouldDirty: true })}
              error={errors.totalAreaWa?.message}
            />
          </div>
        </div>

        {/* Title Deeds */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            icon="file-lines"
            label="Title Deeds"
            color="bg-violet-50 text-violet-600"
          />
          <div className="h-px bg-gray-100 mb-4" />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Title Number</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Title Type</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Rai</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Ngan</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Wa</th>
                  <th className="py-2 px-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {titleFields.map((field, index) => {
                  const titleType = watch(`titles.${index}.titleType`);
                  const areaRai = watch(`titles.${index}.areaRai`);
                  const areaNgan = watch(`titles.${index}.areaNgan`);
                  const areaWa = watch(`titles.${index}.areaWa`);
                  return (
                    <tr key={field.id} className="border-b border-gray-100">
                      <td className="py-2 px-3">
                        <input
                          {...register(`titles.${index}.titleNumber`)}
                          type="text"
                          placeholder="e.g. 1234/56"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </td>
                      <td className="py-2 px-3 min-w-[140px]">
                        <Dropdown
                          value={titleType ?? ''}
                          onChange={val =>
                            setValue(`titles.${index}.titleType`, val as string, { shouldDirty: true })
                          }
                          options={TITLE_TYPE_OPTIONS}
                        />
                      </td>
                      <td className="py-2 px-3 min-w-[80px]">
                        <NumberInput
                          name={`titles.${index}.areaRai`}
                          value={areaRai}
                          decimalPlaces={0}
                          onChange={e =>
                            setValue(`titles.${index}.areaRai`, e.target.value, { shouldDirty: true })
                          }
                        />
                      </td>
                      <td className="py-2 px-3 min-w-[80px]">
                        <NumberInput
                          name={`titles.${index}.areaNgan`}
                          value={areaNgan}
                          decimalPlaces={0}
                          onChange={e =>
                            setValue(`titles.${index}.areaNgan`, e.target.value, { shouldDirty: true })
                          }
                        />
                      </td>
                      <td className="py-2 px-3 min-w-[90px]">
                        <NumberInput
                          name={`titles.${index}.areaWa`}
                          value={areaWa}
                          decimalPlaces={2}
                          onChange={e =>
                            setValue(`titles.${index}.areaWa`, e.target.value, { shouldDirty: true })
                          }
                        />
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => removeTitle(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Icon name="trash" style="regular" className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                {titleFields.length > 0 && (
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-2 px-3 text-sm text-gray-700" colSpan={2}>Total</td>
                    <td className="py-2 px-3 text-right text-sm text-gray-900">{totalTitleRai}</td>
                    <td className="py-2 px-3 text-right text-sm text-gray-900">{totalTitleNgan}</td>
                    <td className="py-2 px-3 text-right text-sm text-gray-900">
                      {totalTitleWa.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => appendTitle({ titleNumber: '', titleType: '', areaRai: undefined, areaNgan: undefined, areaWa: undefined })}
            className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary-700 transition-colors"
          >
            <Icon name="plus" style="solid" className="w-4 h-4" />
            Add title deed
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <ActionBar>
        <ActionBar.Left>
          <CancelButton />
          <ActionBar.Divider />
          <ActionBar.UnsavedIndicator show={isDirty} />
        </ActionBar.Left>
        <ActionBar.Right>
          <Button
            variant="ghost"
            type="button"
            onClick={() => handleSubmit(data => onSubmit(data, true))()}
            isLoading={isPending}
            disabled={isPending}
          >
            <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
            Save Draft
          </Button>
          <Button type="submit" isLoading={isPending} disabled={isPending}>
            <Icon name="check" style="solid" className="size-4 mr-2" />
            Save
          </Button>
        </ActionBar.Right>
      </ActionBar>
    </form>
  );
}
