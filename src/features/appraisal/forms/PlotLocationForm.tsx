import { FormFields } from '@/shared/components/form';
import CheckboxGroup from '@shared/components/inputs/CheckboxGroup';

const plotLocationOptions = [
  { value: 'showHouse', label: 'Show House' },
  { value: 'cornerPlot', label: 'Corner Plot' },
  { value: 'nearClubhouse', label: 'Near Clubhouse' },
  { value: 'houseNotFacingAnother', label: 'House not Facing Another' },
  { value: 'edgePlot', label: 'Edge Plot' },
  { value: 'cornerWithWindow', label: 'Corner with Window' },
  { value: 'cornerWithoutWindow', label: 'Corner without Window' },
  { value: 'cornerWithUTurn', label: 'Corner with U-Turn' },
  { value: 'adjacentToMainRoad', label: 'Adjacent to Main Road' },
  { value: 'adjacentToPark', label: 'Adjacent to Park / Near Park / Opposite Park' },
  { value: 'adjacentToClubhouse', label: 'Adjacent to Clubhouse' },
  { value: 'adjacentToLake', label: 'Adjacent to Lake / Opposite Lake' },
  { value: 'frontZoneOfProject', label: 'Front Zone of the Project' },
  { value: 'houseNotFacingEmpire', label: 'House Not Facing Empire' },
  { value: 'privateZone', label: 'Private Zone' },
  { value: 'adjacentToTransformer', label: 'Adjacent to / Near Transformer / High Voltage Power Lines' },
  { value: 'adjacentToSewageTreatment', label: 'Adjacent to Sewage Treatment Plant / Garbage Disposal Area' },
  { value: 'other', label: 'Other' },
];

export default function PlotLocationForm() {
  return (
    <div className="flex gap-6">
      {/* Section Title */}
      <div className="w-44 flex-shrink-0">
        <h3 className="text-base font-normal">Plot Location</h3>
      </div>

      {/* Form Fields */}
      <div className="flex-1 flex flex-col gap-6">
        <CheckboxGroup
          name="plotLocation"
          options={plotLocationOptions}
        />

        {/* Other field */}
        <div className="grid grid-cols-6 gap-4">
          <FormFields
            fields={[
              {
                type: 'text-input',
                label: 'Other',
                name: 'plotLocationOther',
                wrapperClassName: 'col-span-6',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
