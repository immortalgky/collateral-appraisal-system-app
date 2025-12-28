import { FormFields, type FormField } from '@/shared/components/form';
import RadioGroup from '@shared/components/inputs/RadioGroup';
import CheckboxGroup from '@shared/components/inputs/CheckboxGroup';
import { useFormContext } from 'react-hook-form';

// Landfill Options
const landfillOptions = [
  { value: 'emptyLand', label: 'Empty Land' },
  { value: 'filled', label: 'Filled' },
  { value: 'notFilledYet', label: 'Not Filled yet' },
  { value: 'partiallyFilled', label: 'Partially Filled' },
  { value: 'other', label: 'Other' },
];

// Land Accessibility Options
const landAccessibilityOptions = [
  { value: 'able', label: 'Able' },
  { value: 'unable', label: 'Unable' },
  { value: 'inAllocation', label: 'In Allocation' },
];

// Road Surface Options
const roadSurfaceOptions = [
  { value: 'reinforcedConcrete', label: 'Reinforced Concrete' },
  { value: 'gravelCrushedStone', label: 'Gravel/Crushed Stone' },
  { value: 'soil', label: 'Soil' },
  { value: 'paved', label: 'Paved' },
  { value: 'other', label: 'Other' },
];

// Public Utility Options
const publicUtilityOptions = [
  { value: 'permanentElectricity', label: 'Permanent Electricity' },
  { value: 'tapWaterGroundwater', label: 'Tap Water/Groundwater' },
  { value: 'drainagePipeStone', label: 'Drainage Pipe/Stone' },
  { value: 'streetlight', label: 'Streetlight' },
  { value: 'other', label: 'Other' },
];

// Land Use Options
const landUseOptions = [
  { value: 'residence', label: 'Residence' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industry', label: 'Industry' },
  { value: 'other', label: 'Other' },
];

// Land Entrance-Exit Options
const landEntranceExitOptions = [
  { value: 'publicInterest', label: 'Public Interest' },
  { value: 'insideAllocationProject', label: 'Inside the Allocation Project' },
  { value: 'personal', label: 'Personal' },
  { value: 'servitude', label: 'Servitude' },
  { value: 'other', label: 'Other' },
];

// Transportation Options
const transportationOptions = [
  { value: 'car', label: 'Car' },
  { value: 'bus', label: 'Bus' },
  { value: 'ship', label: 'Ship' },
  { value: 'footpath', label: 'Footpath' },
  { value: 'other', label: 'Other' },
];

// Anticipation of Property Options
const anticipationOptions = [
  { value: 'veryProspective', label: 'Very Prospective' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'likelyToProsperInFuture', label: 'Likely to Prosper in the Future' },
  { value: 'littleChanceOfProsperity', label: 'Little Chance of Prosperity' },
];

// Eviction Options
const evictionOptions = [
  { value: 'permanentElectricity', label: 'Permanent Electricity' },
  { value: 'subwayLine', label: 'Subway Line' },
  { value: 'other', label: 'Other' },
];

// Allocation Options
const allocationOptions = [
  { value: 'allocateNewProject', label: 'Allocate New Projects' },
  { value: 'allocateOldProject', label: 'Allocate Old Projects' },
  { value: 'notAllocate', label: 'Not Allocate' },
];

// Has Building Options
const hasBuildingOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'other', label: 'Other' },
];

const roadFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Road Width',
    name: 'roadWidth',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Right of Way',
    name: 'rightOfWay',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Road Frontage of land adjacent to the road',
    name: 'roadFrontage',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Number of sides facing the road',
    name: 'numberOrSidesFacingRoad',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Road running in front of the land',
    name: 'roadRunningInFrontOfLand',
    wrapperClassName: 'col-span-6',
  },
];

export default function LandCharacteristicsForm() {
  const { register } = useFormContext();

  return (
    <div className="flex flex-col gap-8">
      {/* Landfill Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Landfill</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <RadioGroup name="landfill" options={landfillOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Other',
                  name: 'landfillOther',
                  wrapperClassName: 'col-span-3',
                },
                {
                  type: 'text-input',
                  label: 'Landfill Height',
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
          <h3 className="text-base font-medium">Road</h3>
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
          <h3 className="text-base font-medium">Land Accessibility</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <RadioGroup name="landAccessibility" options={landAccessibilityOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Land Accessibility Description',
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
          <h3 className="text-base font-medium">Road Surface</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="roadSurface" options={roadSurfaceOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Other',
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
          <h3 className="text-base font-medium">Public Utility</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="publicUtility" options={publicUtilityOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Other',
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
          <h3 className="text-base font-medium">Land Use</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="landUse" options={landUseOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Other',
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
          <h3 className="text-base font-medium">Land Entrance-Exit</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="landEntranceExit" options={landEntranceExitOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Other',
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
          <h3 className="text-base font-medium">Transportation</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="transportation" options={transportationOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Other',
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
          <h3 className="text-base font-medium">Anticipation of Property</h3>
        </div>
        <div className="flex-1">
          <RadioGroup name="anticipationOfProperty" options={anticipationOptions} />
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Limitation Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Limitation</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.isExpropriate')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">Is Expropriate</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.inLineExpropriate')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">In Line Expropriate</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.royalDecree')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">Royal Decree</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.isEncroached')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">Is Encroached</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.electricity')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">Electricity</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.isLandlocked')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">Is Landlocked</span>
            </label>
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                {...register('limitation.isForestBoundary')}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="label-text">Is Forest Boundary</span>
            </label>
          </div>
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Area Sq.Wa',
                  name: 'limitation.areaSqWa',
                  wrapperClassName: 'col-span-3',
                },
                {
                  type: 'text-input',
                  label: 'Distance',
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
          <h3 className="text-base font-medium">Eviction</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <CheckboxGroup name="eviction" options={evictionOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Other',
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
          <h3 className="text-base font-medium">Allocation</h3>
        </div>
        <div className="flex-1">
          <RadioGroup name="allocation" options={allocationOptions} />
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Has Building Section */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Has Building</h3>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <RadioGroup name="hasBuilding" options={hasBuildingOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Other',
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
          <h3 className="text-base font-medium">Remark</h3>
        </div>
        <div className="flex-1">
          <textarea
            {...register('remark')}
            className="textarea textarea-bordered w-full h-24"
            placeholder="Enter remarks..."
          />
        </div>
      </div>
    </div>
  );
}
