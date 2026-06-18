import { FormFields, type FormField } from '@/shared/components/form';
import RadioGroup from '@shared/components/inputs/RadioGroup';
import CheckboxGroup from '@shared/components/inputs/CheckboxGroup';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export default function LandCharacteristicsForm() {
  const { register } = useFormContext();
  const { t } = useTranslation('appraisal');

  // Option arrays built inside component so labels are translated
  const landfillOptions = [
    { value: 'emptyLand', label: t('landCharacteristicsForm.landfillOptions.emptyLand') },
    { value: 'filled', label: t('landCharacteristicsForm.landfillOptions.filled') },
    { value: 'notFilledYet', label: t('landCharacteristicsForm.landfillOptions.notFilledYet') },
    { value: 'partiallyFilled', label: t('landCharacteristicsForm.landfillOptions.partiallyFilled') },
    { value: 'other', label: t('landCharacteristicsForm.landfillOptions.other') },
  ];

  const landAccessibilityOptions = [
    { value: 'able', label: t('landCharacteristicsForm.landAccessibilityOptions.able') },
    { value: 'unable', label: t('landCharacteristicsForm.landAccessibilityOptions.unable') },
    { value: 'inAllocation', label: t('landCharacteristicsForm.landAccessibilityOptions.inAllocation') },
  ];

  const roadSurfaceOptions = [
    { value: 'reinforcedConcrete', label: t('landCharacteristicsForm.roadSurfaceOptions.reinforcedConcrete') },
    { value: 'gravelCrushedStone', label: t('landCharacteristicsForm.roadSurfaceOptions.gravelCrushedStone') },
    { value: 'soil', label: t('landCharacteristicsForm.roadSurfaceOptions.soil') },
    { value: 'paved', label: t('landCharacteristicsForm.roadSurfaceOptions.paved') },
    { value: 'other', label: t('landCharacteristicsForm.roadSurfaceOptions.other') },
  ];

  const publicUtilityOptions = [
    { value: 'permanentElectricity', label: t('landCharacteristicsForm.publicUtilityOptions.permanentElectricity') },
    { value: 'tapWaterGroundwater', label: t('landCharacteristicsForm.publicUtilityOptions.tapWaterGroundwater') },
    { value: 'drainagePipeStone', label: t('landCharacteristicsForm.publicUtilityOptions.drainagePipeStone') },
    { value: 'streetlight', label: t('landCharacteristicsForm.publicUtilityOptions.streetlight') },
    { value: 'other', label: t('landCharacteristicsForm.publicUtilityOptions.other') },
  ];

  const landUseOptions = [
    { value: 'residence', label: t('landCharacteristicsForm.landUseOptions.residence') },
    { value: 'agriculture', label: t('landCharacteristicsForm.landUseOptions.agriculture') },
    { value: 'commercial', label: t('landCharacteristicsForm.landUseOptions.commercial') },
    { value: 'industry', label: t('landCharacteristicsForm.landUseOptions.industry') },
    { value: 'other', label: t('landCharacteristicsForm.landUseOptions.other') },
  ];

  const landEntranceExitOptions = [
    { value: 'publicInterest', label: t('landCharacteristicsForm.landEntranceExitOptions.publicInterest') },
    { value: 'insideAllocationProject', label: t('landCharacteristicsForm.landEntranceExitOptions.insideAllocationProject') },
    { value: 'personal', label: t('landCharacteristicsForm.landEntranceExitOptions.personal') },
    { value: 'servitude', label: t('landCharacteristicsForm.landEntranceExitOptions.servitude') },
    { value: 'other', label: t('landCharacteristicsForm.landEntranceExitOptions.other') },
  ];

  const transportationOptions = [
    { value: 'car', label: t('landCharacteristicsForm.transportationOptions.car') },
    { value: 'bus', label: t('landCharacteristicsForm.transportationOptions.bus') },
    { value: 'ship', label: t('landCharacteristicsForm.transportationOptions.ship') },
    { value: 'footpath', label: t('landCharacteristicsForm.transportationOptions.footpath') },
    { value: 'other', label: t('landCharacteristicsForm.transportationOptions.other') },
  ];

  const anticipationOptions = [
    { value: 'veryProspective', label: t('landCharacteristicsForm.anticipationOptions.veryProspective') },
    { value: 'moderate', label: t('landCharacteristicsForm.anticipationOptions.moderate') },
    { value: 'likelyToProsperInFuture', label: t('landCharacteristicsForm.anticipationOptions.likelyToProsperInFuture') },
    { value: 'littleChanceOfProsperity', label: t('landCharacteristicsForm.anticipationOptions.littleChanceOfProsperity') },
  ];

  const evictionOptions = [
    { value: 'permanentElectricity', label: t('landCharacteristicsForm.evictionOptions.permanentElectricity') },
    { value: 'subwayLine', label: t('landCharacteristicsForm.evictionOptions.subwayLine') },
    { value: 'other', label: t('landCharacteristicsForm.evictionOptions.other') },
  ];

  const allocationOptions = [
    { value: 'allocateNewProject', label: t('landCharacteristicsForm.allocationOptions.allocateNewProject') },
    { value: 'allocateOldProject', label: t('landCharacteristicsForm.allocationOptions.allocateOldProject') },
    { value: 'notAllocate', label: t('landCharacteristicsForm.allocationOptions.notAllocate') },
  ];

  const hasBuildingOptions = [
    { value: 'yes', label: t('landCharacteristicsForm.hasBuildingOptions.yes') },
    { value: 'no', label: t('landCharacteristicsForm.hasBuildingOptions.no') },
    { value: 'other', label: t('landCharacteristicsForm.hasBuildingOptions.other') },
  ];

  const roadFields: FormField[] = [
    {
      type: 'text-input',
      label: t('landCharacteristicsForm.fields.roadWidth'),
      name: 'roadWidth',
      wrapperClassName: 'col-span-3',
    },
    {
      type: 'text-input',
      label: t('landCharacteristicsForm.fields.rightOfWay'),
      name: 'rightOfWay',
      wrapperClassName: 'col-span-3',
    },
    {
      type: 'text-input',
      label: t('landCharacteristicsForm.fields.roadFrontage'),
      name: 'roadFrontage',
      wrapperClassName: 'col-span-3',
    },
    {
      type: 'text-input',
      label: t('landCharacteristicsForm.fields.numberOrSidesFacingRoad'),
      name: 'numberOrSidesFacingRoad',
      wrapperClassName: 'col-span-3',
    },
    {
      type: 'text-input',
      label: t('landCharacteristicsForm.fields.roadRunningInFrontOfLand'),
      name: 'roadRunningInFrontOfLand',
      wrapperClassName: 'col-span-6',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Landfill Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.landfill')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <RadioGroup name="landfill" options={landfillOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.other'),
                  name: 'landfillOther',
                  wrapperClassName: 'col-span-3',
                },
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.landfillHeight'),
                  name: 'landfillHeight',
                  wrapperClassName: 'col-span-3',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Road Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.road')}</h3>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-6 gap-4">
            <FormFields fields={roadFields} />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Land Accessibility Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.landAccessibility')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <RadioGroup name="landAccessibility" options={landAccessibilityOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.landAccessibilityDescription'),
                  name: 'landAccessibilityDescription',
                  wrapperClassName: 'col-span-6',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Road Surface Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.roadSurface')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="roadSurface" options={roadSurfaceOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.other'),
                  name: 'roadSurfaceOther',
                  wrapperClassName: 'col-span-6',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Public Utility Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.publicUtility')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="publicUtility" options={publicUtilityOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.other'),
                  name: 'publicUtilityOther',
                  wrapperClassName: 'col-span-6',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Land Use Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.landUse')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="landUse" options={landUseOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.other'),
                  name: 'landUseOther',
                  wrapperClassName: 'col-span-6',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Land Entrance-Exit Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.landEntranceExit')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="landEntranceExit" options={landEntranceExitOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.other'),
                  name: 'landEntranceExitOther',
                  wrapperClassName: 'col-span-6',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Transportation Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.transportation')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="transportation" options={transportationOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.other'),
                  name: 'transportationOther',
                  wrapperClassName: 'col-span-6',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Anticipation of Property Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.anticipationOfProperty')}</h3>
        </div>
        <div className="flex-1">
          <RadioGroup name="anticipationOfProperty" options={anticipationOptions} />
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Limitation Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.limitation')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.isExpropriate')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">{t('landCharacteristicsForm.fields.isExpropriate')}</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.inLineExpropriate')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">{t('landCharacteristicsForm.fields.inLineExpropriate')}</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.royalDecree')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">{t('landCharacteristicsForm.fields.royalDecree')}</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.isEncroached')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">{t('landCharacteristicsForm.fields.isEncroached')}</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.electricity')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">{t('landCharacteristicsForm.fields.electricity')}</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.isLandlocked')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">{t('landCharacteristicsForm.fields.isLandlocked')}</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.isForestBoundary')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">{t('landCharacteristicsForm.fields.isForestBoundary')}</span>
            </label>
          </div>
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.areaSqWa'),
                  name: 'limitation.areaSqWa',
                  wrapperClassName: 'col-span-3',
                },
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.distance'),
                  name: 'limitation.distanceValue',
                  wrapperClassName: 'col-span-3',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Eviction Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.eviction')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="eviction" options={evictionOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.other'),
                  name: 'evictionOther',
                  wrapperClassName: 'col-span-6',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Allocation Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.allocation')}</h3>
        </div>
        <div className="flex-1">
          <RadioGroup name="allocation" options={allocationOptions} />
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Has Building Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.hasBuilding')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <RadioGroup name="hasBuilding" options={hasBuildingOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: t('landCharacteristicsForm.fields.other'),
                  name: 'hasBuildingOther',
                  wrapperClassName: 'col-span-6',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Remark Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('landCharacteristicsForm.sections.remark')}</h3>
        </div>
        <div className="flex-1">
          <textarea
            {...register('remark')}
            className="textarea textarea-bordered w-full h-24"
            placeholder={t('landCharacteristicsForm.fields.remarkPlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}
