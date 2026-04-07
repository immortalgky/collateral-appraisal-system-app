import { useEffect } from 'react';
import { useForm, useFormContext, FormProvider as RHFFormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetVillageProject, useSaveVillageProject } from '../../api/villageProject';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import ActionBar from '@shared/components/ActionBar';
import CancelButton from '@shared/components/buttons/CancelButton';
import TextInput from '@shared/components/inputs/TextInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import Textarea from '@shared/components/inputs/Textarea';
import Dropdown from '@shared/components/inputs/Dropdown';
import { PROJECT_TYPE_OPTIONS, PROJECT_STATUS_OPTIONS, UTILITY_OPTIONS, FACILITY_OPTIONS } from '../../data/options';

// ==================== Schema ====================

const projectInfoSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  projectCode: z.string().optional().nullable(),
  developer: z.string().optional().nullable(),
  projectType: z.string().optional().nullable(),
  projectStatus: z.string().optional().nullable(),
  totalUnits: z.number().optional().nullable(),
  openingYear: z.number().optional().nullable(),
  completionYear: z.number().optional().nullable(),
  saleRate: z.number().optional().nullable(),
  occupancyRate: z.number().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address: z.object({
    houseNumber: z.string().optional().nullable(),
    moo: z.string().optional().nullable(),
    soi: z.string().optional().nullable(),
    road: z.string().optional().nullable(),
    subDistrict: z.string().optional().nullable(),
    district: z.string().optional().nullable(),
    province: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
  }).optional(),
  utilities: z.array(z.string()).default([]),
  utilitiesOther: z.string().optional().nullable(),
  facilities: z.array(z.string()).default([]),
  facilitiesOther: z.string().optional().nullable(),
  remark: z.string().optional().nullable(),
});

type ProjectInfoFormValues = z.infer<typeof projectInfoSchema>;

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

function CheckboxList({
  name,
  options,
}: {
  name: 'utilities' | 'facilities';
  options: { key: string; label: string }[];
}) {
  const { watch, setValue } = useFormContext<ProjectInfoFormValues>();
  const values: string[] = watch(name) ?? [];

  const toggle = (key: string) => {
    if (values.includes(key)) {
      setValue(name, values.filter(v => v !== key), { shouldDirty: true });
    } else {
      setValue(name, [...values, key], { shouldDirty: true });
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {options.map(opt => (
        <label
          key={opt.key}
          className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={values.includes(opt.key)}
            onChange={() => toggle(opt.key)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// ==================== Main Component ====================

export default function ProjectInfoTab() {
  const appraisalId = useAppraisalId();
  const { data: project, isLoading } = useGetVillageProject(appraisalId ?? '');
  const { mutate: saveProject, isPending } = useSaveVillageProject(appraisalId ?? '');

  const methods = useForm<ProjectInfoFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(projectInfoSchema) as any,
    defaultValues: {
      utilities: [],
      facilities: [],
    },
  });

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = methods;

  useEffect(() => {
    if (project) {
      reset({
        projectName: project.projectName ?? '',
        projectCode: project.projectCode ?? null,
        developer: project.developer ?? null,
        projectType: project.projectType ?? null,
        projectStatus: project.projectStatus ?? null,
        totalUnits: project.totalUnits ?? null,
        openingYear: project.openingYear ?? null,
        completionYear: project.completionYear ?? null,
        saleRate: project.saleRate ?? null,
        occupancyRate: project.occupancyRate ?? null,
        latitude: project.latitude ?? null,
        longitude: project.longitude ?? null,
        address: {
          houseNumber: project.address?.houseNumber ?? null,
          moo: project.address?.moo ?? null,
          soi: project.address?.soi ?? null,
          road: project.address?.road ?? null,
          subDistrict: project.address?.subDistrict ?? null,
          district: project.address?.district ?? null,
          province: project.address?.province ?? null,
          postalCode: project.address?.postalCode ?? null,
        },
        utilities: project.utilities ?? [],
        facilities: project.facilities ?? [],
        remark: project.remark ?? null,
      });
    }
  }, [project, reset]);

  const onSubmit = (data: ProjectInfoFormValues, isDraft = false) => {
    if (!appraisalId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveProject(data as any, {
      onSuccess: () => {
        toast.success(isDraft ? 'Draft saved successfully' : 'Project information saved');
        reset(data);
      },
      onError: (err: unknown) => {
        const error = err as AppError;
        toast.error(error?.apiError?.detail ?? 'Failed to save project information');
      },
    });
  };

  const projectType = watch('projectType');
  const projectStatus = watch('projectStatus');
  const totalUnits = watch('totalUnits');
  const openingYear = watch('openingYear');
  const completionYear = watch('completionYear');
  const saleRate = watch('saleRate');
  const occupancyRate = watch('occupancyRate');
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const utilitiesSelected = watch('utilities') ?? [];
  const facilitiesSelected = watch('facilities') ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RHFFormProvider {...methods}>
      <form
        onSubmit={handleSubmit(data => onSubmit(data, false))}
        className="flex flex-col h-full min-h-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-4">
          {/* Project Information */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <SectionHeader
              icon="building-columns"
              label="Project Information"
              color="bg-blue-50 text-blue-600"
            />
            <div className="h-px bg-gray-100 mb-5" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="col-span-full md:col-span-2">
                <TextInput
                  {...register('projectName')}
                  label="Project Name"
                  required
                  error={errors.projectName?.message}
                />
              </div>
              <TextInput
                {...register('projectCode')}
                label="Project Code"
                error={errors.projectCode?.message}
              />
              <TextInput
                {...register('developer')}
                label="Developer"
                error={errors.developer?.message}
              />
              <Dropdown
                value={projectType ?? ''}
                onChange={val => setValue('projectType', val as string, { shouldDirty: true })}
                label="Project Type"
                options={PROJECT_TYPE_OPTIONS}
                error={errors.projectType?.message}
              />
              <Dropdown
                value={projectStatus ?? ''}
                onChange={val => setValue('projectStatus', val as string, { shouldDirty: true })}
                label="Project Status"
                options={PROJECT_STATUS_OPTIONS}
                error={errors.projectStatus?.message}
              />
              <NumberInput
                name="totalUnits"
                label="Total Units"
                value={totalUnits}
                decimalPlaces={0}
                onChange={e => setValue('totalUnits', e.target.value, { shouldDirty: true })}
                error={errors.totalUnits?.message}
              />
              <NumberInput
                name="openingYear"
                label="Opening Year"
                value={openingYear}
                decimalPlaces={0}
                onChange={e => setValue('openingYear', e.target.value, { shouldDirty: true })}
                error={errors.openingYear?.message}
              />
              <NumberInput
                name="completionYear"
                label="Completion Year"
                value={completionYear}
                decimalPlaces={0}
                onChange={e => setValue('completionYear', e.target.value, { shouldDirty: true })}
                error={errors.completionYear?.message}
              />
              <NumberInput
                name="saleRate"
                label="Sale Rate (%)"
                value={saleRate}
                decimalPlaces={2}
                onChange={e => setValue('saleRate', e.target.value, { shouldDirty: true })}
                error={errors.saleRate?.message}
              />
              <NumberInput
                name="occupancyRate"
                label="Occupancy Rate (%)"
                value={occupancyRate}
                decimalPlaces={2}
                onChange={e => setValue('occupancyRate', e.target.value, { shouldDirty: true })}
                error={errors.occupancyRate?.message}
              />
            </div>
          </div>

          {/* Project Location */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <SectionHeader
              icon="location-dot"
              label="Project Location"
              color="bg-green-50 text-green-600"
            />
            <div className="h-px bg-gray-100 mb-5" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <TextInput
                {...register('address.houseNumber')}
                label="House Number"
                error={errors.address?.houseNumber?.message}
              />
              <TextInput
                {...register('address.moo')}
                label="Moo"
                error={errors.address?.moo?.message}
              />
              <TextInput
                {...register('address.soi')}
                label="Soi"
                error={errors.address?.soi?.message}
              />
              <TextInput
                {...register('address.road')}
                label="Road"
                error={errors.address?.road?.message}
              />
              <TextInput
                {...register('address.subDistrict')}
                label="Sub District"
                error={errors.address?.subDistrict?.message}
              />
              <TextInput
                {...register('address.district')}
                label="District"
                error={errors.address?.district?.message}
              />
              <TextInput
                {...register('address.province')}
                label="Province"
                error={errors.address?.province?.message}
              />
              <TextInput
                {...register('address.postalCode')}
                label="Postal Code"
                error={errors.address?.postalCode?.message}
              />
              <NumberInput
                name="latitude"
                label="Latitude"
                value={latitude}
                decimalPlaces={6}
                onChange={e => setValue('latitude', e.target.value, { shouldDirty: true })}
                error={errors.latitude?.message}
              />
              <NumberInput
                name="longitude"
                label="Longitude"
                value={longitude}
                decimalPlaces={6}
                onChange={e => setValue('longitude', e.target.value, { shouldDirty: true })}
                error={errors.longitude?.message}
              />
            </div>
          </div>

          {/* Project Detail */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <SectionHeader
              icon="list-check"
              label="Project Detail"
              color="bg-violet-50 text-violet-600"
            />
            <div className="h-px bg-gray-100 mb-5" />

            {/* Utilities */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Utilities</p>
              <CheckboxList name="utilities" options={UTILITY_OPTIONS} />
              {utilitiesSelected.includes('Other') && (
                <div className="mt-3">
                  <TextInput
                    {...register('utilitiesOther')}
                    label="Other Utilities"
                    placeholder="Please specify..."
                    error={errors.utilitiesOther?.message}
                  />
                </div>
              )}
            </div>

            {/* Facilities */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Facilities</p>
              <CheckboxList name="facilities" options={FACILITY_OPTIONS} />
              {facilitiesSelected.includes('Other') && (
                <div className="mt-3">
                  <TextInput
                    {...register('facilitiesOther')}
                    label="Other Facilities"
                    placeholder="Please specify..."
                    error={errors.facilitiesOther?.message}
                  />
                </div>
              )}
            </div>

            {/* Remark */}
            <Textarea
              {...register('remark')}
              label="Remark"
              rows={4}
              error={errors.remark?.message}
            />
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
    </RHFFormProvider>
  );
}
