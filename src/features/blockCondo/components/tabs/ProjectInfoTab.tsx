import { useEffect } from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetCondoProject, useSaveCondoProject } from '../../api/condoProject';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import ActionBar from '@shared/components/ActionBar';
import CancelButton from '@shared/components/buttons/CancelButton';
import TextInput from '@shared/components/inputs/TextInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import Textarea from '@shared/components/inputs/Textarea';
import Dropdown from '@shared/components/inputs/Dropdown';
import { FormProvider } from '@shared/components/form';

// ==================== Schema ====================

const projectInfoSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  projectDescription: z.string().optional().nullable(),
  developer: z.string().optional().nullable(),
  projectSaleLaunchDate: z.string().optional().nullable(),
  landAreaRai: z.number().optional().nullable(),
  landAreaNgan: z.number().optional().nullable(),
  landAreaWa: z.number().optional().nullable(),
  unitForSaleCount: z.number().optional().nullable(),
  landOffice: z.string().min(1, 'Land office is required'),
  projectType: z.string().min(1, 'Project type is required'),
  numberOfPhase: z.number().optional().nullable(),
  locationNumber: z.string().optional().nullable(),
  road: z.string().optional().nullable(),
  soi: z.string().optional().nullable(),
  subDistrict: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  builtOnTitleDeedNumber: z.string().optional().nullable(),
  utilities: z.array(z.string()).default([]),
  utilitiesOther: z.string().optional().nullable(),
  facilities: z.array(z.string()).default([]),
  facilitiesOther: z.string().optional().nullable(),
  remark: z.string().optional().nullable(),
});

type ProjectInfoFormValues = z.infer<typeof projectInfoSchema>;

// ==================== Constants ====================

const PROJECT_TYPES = [
  { id: 'Condominium', value: 'Condominium', label: 'Condominium' },
  { id: 'Apartment', value: 'Apartment', label: 'Apartment' },
  { id: 'Serviced Apartment', value: 'Serviced Apartment', label: 'Serviced Apartment' },
];

const UTILITY_OPTIONS = [
  { key: 'PermanentElectricity', label: 'Permanent Electricity' },
  { key: 'TapWater', label: 'Tap Water / Groundwater' },
  { key: 'StreetElectricity', label: 'Street Electricity' },
  { key: 'DrainagePipe', label: 'Drainage Pipe / Manhole' },
  { key: 'Other', label: 'Other' },
];

const FACILITY_OPTIONS = [
  { key: 'PassengerElevator', label: 'Passenger Elevator' },
  { key: 'Hallway', label: 'Hallway' },
  { key: 'Parking', label: 'Parking' },
  { key: 'FireEscape', label: 'Fire Escape' },
  { key: 'FireExtinguishingSystem', label: 'Fire Extinguishing System' },
  { key: 'SwimmingPool', label: 'Swimming Pool' },
  { key: 'FitnessRoom', label: 'Fitness Room' },
  { key: 'Garden', label: 'Garden' },
  { key: 'OutdoorStadium', label: 'Outdoor Stadium' },
  { key: 'Club', label: 'Club' },
  { key: 'SteamRoom', label: 'Steam Room' },
  { key: 'SecurityRoom', label: 'Security Room' },
  { key: 'KeyCardSystem', label: 'Key Card System' },
  { key: 'LegalEntity', label: 'Legal Entity' },
  { key: 'Kindergarten', label: 'Kindergarten' },
  { key: 'GarbageDisposalPoint', label: 'Garbage Disposal Point' },
  { key: 'WasteDisposalSystem', label: 'Waste Disposal System' },
  { key: 'Other', label: 'Other' },
];

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
  const { data: project, isLoading } = useGetCondoProject(appraisalId ?? '');
  const { mutate: saveProject, isPending } = useSaveCondoProject(appraisalId ?? '');

  const methods = useForm<ProjectInfoFormValues>({
    resolver: zodResolver(projectInfoSchema),
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

  // Populate form when data loads
  useEffect(() => {
    if (project) {
      reset({
        projectName: project.projectName ?? '',
        projectDescription: project.projectDescription ?? null,
        developer: project.developer ?? null,
        projectSaleLaunchDate: project.projectSaleLaunchDate ?? null,
        landAreaRai: project.landAreaRai ?? null,
        landAreaNgan: project.landAreaNgan ?? null,
        landAreaWa: project.landAreaWa ?? null,
        unitForSaleCount: project.unitForSaleCount ?? null,
        landOffice: project.landOffice ?? '',
        projectType: project.projectType ?? '',
        numberOfPhase: project.numberOfPhase ?? null,
        locationNumber: project.locationNumber ?? null,
        road: project.road ?? null,
        soi: project.soi ?? null,
        subDistrict: project.subDistrict ?? null,
        district: project.district ?? null,
        province: project.province ?? null,
        postcode: project.postcode ?? null,
        latitude: project.latitude ?? null,
        longitude: project.longitude ?? null,
        builtOnTitleDeedNumber: project.builtOnTitleDeedNumber ?? null,
        utilities: project.utilities ?? [],
        utilitiesOther: project.utilitiesOther ?? null,
        facilities: project.facilities ?? [],
        facilitiesOther: project.facilitiesOther ?? null,
        remark: project.remark ?? null,
      });
    }
  }, [project, reset]);

  const onSubmit = (data: ProjectInfoFormValues, isDraft = false) => {
    if (!appraisalId) return;
    saveProject(data, {
      onSuccess: () => {
        toast.success(isDraft ? 'Draft saved successfully' : 'Project information saved');
        reset(data);
      },
      onError: (error: AppError) => {
        toast.error(error?.apiError?.detail ?? 'Failed to save project information');
      },
    });
  };

  const projectType = watch('projectType');
  const utilitiesSelected = watch('utilities') ?? [];
  const landAreaRai = watch('landAreaRai');
  const landAreaNgan = watch('landAreaNgan');
  const landAreaWa = watch('landAreaWa');
  const unitForSaleCount = watch('unitForSaleCount');
  const numberOfPhase = watch('numberOfPhase');
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const facilitiesSelected = watch('facilities') ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FormProvider methods={methods} schema={projectInfoSchema}>
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
                <div className="col-span-full">
                  <Textarea
                    {...register('projectDescription')}
                    label="Project Description"
                    rows={3}
                    error={errors.projectDescription?.message}
                  />
                </div>
                <TextInput
                  {...register('developer')}
                  label="Developer"
                  error={errors.developer?.message}
                />
                <TextInput
                  {...register('projectSaleLaunchDate')}
                  label="Project Sale Launch Date"
                  placeholder="YYYY-MM-DD"
                  error={errors.projectSaleLaunchDate?.message}
                />
                <TextInput
                  {...register('landOffice')}
                  label="Land Office"
                  required
                  error={errors.landOffice?.message}
                />

                {/* Land Area */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Land Area
                  </label>
                  <div className="flex gap-3">
                    <NumberInput
                      name="landAreaRai"
                      label="Rai"
                      value={landAreaRai}
                      decimalPlaces={0}
                      onChange={e => setValue('landAreaRai', e.target.value, { shouldDirty: true })}
                      error={errors.landAreaRai?.message}
                    />
                    <NumberInput
                      name="landAreaNgan"
                      label="Ngan"
                      value={landAreaNgan}
                      decimalPlaces={0}
                      onChange={e => setValue('landAreaNgan', e.target.value, { shouldDirty: true })}
                      error={errors.landAreaNgan?.message}
                    />
                    <NumberInput
                      name="landAreaWa"
                      label="Wa"
                      value={landAreaWa}
                      decimalPlaces={2}
                      onChange={e => setValue('landAreaWa', e.target.value, { shouldDirty: true })}
                      error={errors.landAreaWa?.message}
                    />
                  </div>
                </div>

                <NumberInput
                  name="unitForSaleCount"
                  label="Unit For Sale"
                  value={unitForSaleCount}
                  decimalPlaces={0}
                  onChange={e => setValue('unitForSaleCount', e.target.value, { shouldDirty: true })}
                  error={errors.unitForSaleCount?.message}
                />
                <Dropdown
                  value={projectType ?? ''}
                  onChange={val => setValue('projectType', val as string, { shouldDirty: true })}
                  label="Project Type"
                  required
                  options={PROJECT_TYPES}
                  error={errors.projectType?.message}
                />
                <NumberInput
                  name="numberOfPhase"
                  label="Number of Phase"
                  value={numberOfPhase}
                  decimalPlaces={0}
                  onChange={e => setValue('numberOfPhase', e.target.value, { shouldDirty: true })}
                  error={errors.numberOfPhase?.message}
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
                  {...register('locationNumber')}
                  label="Location Number"
                  error={errors.locationNumber?.message}
                />
                <TextInput
                  {...register('road')}
                  label="Road"
                  error={errors.road?.message}
                />
                <TextInput
                  {...register('soi')}
                  label="Soi"
                  error={errors.soi?.message}
                />
                <TextInput
                  {...register('subDistrict')}
                  label="Sub District"
                  error={errors.subDistrict?.message}
                />
                <TextInput
                  {...register('district')}
                  label="District"
                  error={errors.district?.message}
                />
                <TextInput
                  {...register('province')}
                  label="Province"
                  error={errors.province?.message}
                />
                <TextInput
                  {...register('postcode')}
                  label="Postcode"
                  error={errors.postcode?.message}
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
                <TextInput
                  {...register('builtOnTitleDeedNumber')}
                  label="Built on Title Deed Number"
                  error={errors.builtOnTitleDeedNumber?.message}
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
    </FormProvider>
  );
}
