import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetProjectLand, useSaveProjectLand } from '../api/projectLand';
import ActionBar from '@/shared/components/ActionBar';
import Button from '@/shared/components/Button';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Icon from '@/shared/components/Icon';
import NumberInput from '@/shared/components/inputs/NumberInput';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };

// ── Schema ─────────────────────────────────────────────────────────────────────
// Covers the title-deed collection used in ProjectLand.titles.
// The full ProjectLand DTO has many fields; this form exposes the ones
// most commonly edited (matches the village ProjectLandTab scope).

const landTitleSchema = z.object({
  id: z.string().nullable().optional(),
  titleNumber: z.string().min(1, 'Title number is required'),
  titleType: z.string().min(1, 'Title type is required'),
  rai: z.coerce.number().nullable().optional(),
  ngan: z.coerce.number().nullable().optional(),
  squareWa: z.coerce.number().nullable().optional(),
});

const projectLandFormSchema = z.object({
  propertyName: z.string().nullable().optional(),
  landDescription: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  subDistrict: z.string().nullable().optional(),
  landOffice: z.string().nullable().optional(),
  titles: z.array(landTitleSchema),
});

type ProjectLandFormValues = z.infer<typeof projectLandFormSchema>;

// ── Section Header ──────────────────────────────────────────────────────────

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

// ── Main Component ─────────────────────────────────────────────────────────────

/**
 * LandAndBuilding-only project land form.
 * Manages land detail + title-deed collection.
 * Used inside ProjectLandTab.
 */
export default function ProjectLandForm() {
  const appraisalId = useAppraisalId();
  const { data: land, isLoading } = useGetProjectLand(appraisalId ?? '');
  const { mutate: saveLand, isPending } = useSaveProjectLand();

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<ProjectLandFormValues>({
    resolver: zodResolver(projectLandFormSchema),
    defaultValues: { titles: [] },
  });

  const { fields: titleFields, append: appendTitle, remove: removeTitle } = useFieldArray({
    control,
    name: 'titles',
  });

  useEffect(() => {
    if (land) {
      reset({
        propertyName: land.propertyName ?? null,
        landDescription: land.landDescription ?? null,
        province: land.province ?? null,
        district: land.district ?? null,
        subDistrict: land.subDistrict ?? null,
        landOffice: land.landOffice ?? null,
        titles: (land.titles ?? []).map(t => ({
          id: t.id ?? null,
          titleNumber: t.titleNumber,
          titleType: t.titleType,
          rai: t.rai ?? null,
          ngan: t.ngan ?? null,
          squareWa: t.squareWa ?? null,
        })),
      });
    }
  }, [land, reset]);

  const onSubmit = (data: ProjectLandFormValues, isDraft = false) => {
    if (!appraisalId) return;
    saveLand(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { appraisalId, data: data as any },
      {
        onSuccess: () => {
          toast.success(isDraft ? 'Draft saved successfully' : 'Project land saved');
          reset(data);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? 'Failed to save project land');
        },
      },
    );
  };

  const titles = watch('titles') ?? [];
  const totalRai = titles.reduce((s, t) => s + (Number(t.rai) || 0), 0);
  const totalNgan = titles.reduce((s, t) => s + (Number(t.ngan) || 0), 0);
  const totalWa = titles.reduce((s, t) => s + (Number(t.squareWa) || 0), 0);

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
          <SectionHeader icon="map" label="Land Details" color="bg-emerald-50 text-emerald-600" />
          <div className="h-px bg-gray-100 mb-5" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="col-span-full md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
              <input
                {...register('propertyName')}
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Land Description</label>
              <textarea
                {...register('landDescription')}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <input
                {...register('province')}
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.province && <p className="text-xs text-red-500 mt-1">{errors.province.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <input
                {...register('district')}
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub District</label>
              <input
                {...register('subDistrict')}
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Land Office</label>
              <input
                {...register('landOffice')}
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Title Deeds */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader icon="file-lines" label="Title Deeds" color="bg-violet-50 text-violet-600" />
          <div className="h-px bg-gray-100 mb-4" />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Title Number</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Title Type</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Rai</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Ngan</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">sq.wa</th>
                  <th className="py-2 px-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {titleFields.map((field, index) => {
                  const rai = watch(`titles.${index}.rai`);
                  const ngan = watch(`titles.${index}.ngan`);
                  const squareWa = watch(`titles.${index}.squareWa`);
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
                      <td className="py-2 px-3">
                        <input
                          {...register(`titles.${index}.titleType`)}
                          type="text"
                          placeholder="e.g. Chanote"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </td>
                      <td className="py-2 px-3 min-w-[80px]">
                        <NumberInput
                          name={`titles.${index}.rai`}
                          value={rai}
                          decimalPlaces={0}
                          onChange={e => setValue(`titles.${index}.rai`, e.target.value, { shouldDirty: true })}
                        />
                      </td>
                      <td className="py-2 px-3 min-w-[80px]">
                        <NumberInput
                          name={`titles.${index}.ngan`}
                          value={ngan}
                          decimalPlaces={0}
                          onChange={e => setValue(`titles.${index}.ngan`, e.target.value, { shouldDirty: true })}
                        />
                      </td>
                      <td className="py-2 px-3 min-w-[90px]">
                        <NumberInput
                          name={`titles.${index}.squareWa`}
                          value={squareWa}
                          decimalPlaces={2}
                          onChange={e => setValue(`titles.${index}.squareWa`, e.target.value, { shouldDirty: true })}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <button type="button" onClick={() => removeTitle(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Icon name="trash" style="regular" className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {titleFields.length > 0 && (
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-2 px-3 text-sm text-gray-700" colSpan={2}>Total</td>
                    <td className="py-2 px-3 text-right text-sm text-gray-900">{totalRai}</td>
                    <td className="py-2 px-3 text-right text-sm text-gray-900">{totalNgan}</td>
                    <td className="py-2 px-3 text-right text-sm text-gray-900">
                      {totalWa.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => appendTitle({ titleNumber: '', titleType: '', rai: null, ngan: null, squareWa: null })}
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
