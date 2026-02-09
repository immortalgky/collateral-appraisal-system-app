import { FormFields, type FormField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';

/** Section row component for form layout */
interface SectionRowProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="h-px bg-gray-200 col-span-5 my-2" />}
  </>
);

const LandDetailForm = () => {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Land Detail</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title="Land Information" icon="info-circle">
          <FormFields fields={landInfoField} />
        </SectionRow>

        <SectionRow title="Land Location" icon="map-location-dot">
          <FormFields fields={landLocationField} />
        </SectionRow>

        <SectionRow title="Plot Location" icon="location-dot">
          <FormFields fields={plotLocationField} />
        </SectionRow>

        <SectionRow title="Landfill" icon="mountain">
          <FormFields fields={landFillField} />
        </SectionRow>

        <SectionRow title="Road" icon="road">
          <FormFields fields={roadField} />
        </SectionRow>

        <SectionRow title="Road Surface" icon="road-circle-check">
          <FormFields fields={roadSurfaceField} />
        </SectionRow>

        <SectionRow title="Public Utility" icon="bolt">
          <FormFields fields={publicUtilityField} />
        </SectionRow>

        <SectionRow title="Land Use" icon="seedling">
          <FormFields fields={landUseField} />
        </SectionRow>

        <SectionRow title="Land Entrance-Exit" icon="door-open">
          <FormFields fields={landEntranceField} />
        </SectionRow>

        <SectionRow title="Transportation" icon="car">
          <FormFields fields={transpotationField} />
        </SectionRow>

        <SectionRow title="Anticipation of Prosperity" icon="chart-line">
          <FormFields fields={anticipationProsperityField} />
        </SectionRow>

        <SectionRow title="Limitation" icon="triangle-exclamation">
          <FormFields fields={expropriateField} />
          <FormFields fields={encroachedField} />
          <FormFields fields={LimitationOther} />
        </SectionRow>

        <SectionRow title="Eviction" icon="ban">
          <FormFields fields={evictionField} />
        </SectionRow>

        <SectionRow title="Allocation" icon="th-large">
          <FormFields fields={allocationField} />
        </SectionRow>

        <SectionRow title="Size and Boundary" icon="ruler-combined">
          <FormFields fields={sizeAndBoundary} />
        </SectionRow>

        <SectionRow title="Other Information" icon="circle-info">
          <FormFields fields={otherInformationField} />
        </SectionRow>

        <SectionRow title="Remark" icon="comment" isLast>
          <FormFields fields={remarkLandField} />
        </SectionRow>
      </div>
    </div>
  );
};

const landInfoField: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Latitude',
    name: 'latitude',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Longitude',
    name: 'longitude',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  // Location selector (sub-district autocomplete that populates district, province, postcode)
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    wrapperClassName: 'col-span-3',
    required: true,
  },

  // Display fields (autopopulated by location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'dropdown',
    label: 'Land Office',
    name: 'landOffice',
    options: [
      { label: 'Bangkok Land Office', value: 'Bangkok Land Office' },
      { label: 'Land Office', value: 'Land Office' },
    ],
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'textarea',
    label: 'Land Description',
    name: 'landDescription',
    wrapperClassName: 'col-span-12',
    required: true,
  },
  {
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'isOwnerVerified',
    required: true,
    options: ['Can', 'Can not'],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-4',
    required: true,
    disableWhen: { field: 'isOwnerVerified', is: false },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
  },
  {
    type: 'boolean-toggle',
    label: 'Is Obligation',
    name: 'hasObligation',
    options: ['Mortgage as Security', 'No Obligation'],
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Obligation',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    required: true,
    showWhen: { field: 'hasObligation', is: true },
  },
];

const landLocationField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: '',
    name: 'isLandLocationVerified',
    options: ['Correct', 'In Correct'],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Check By',
    name: 'landCheckMethodType',
    orientation: 'horizontal',
    options: [
      { value: 'plot', label: 'Plot' },
      { value: 'rawang', label: 'Rawang' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landCheckMethodTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landCheckMethodType', is: '99', operator: 'equals' },
    required: true,
  },
  {
    type: 'text-input',
    label: 'Street',
    name: 'street',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'soi',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'number-input',
    label: 'Distance',
    name: 'distanceFromMainRoad',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Village',
    name: 'village',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Address / Location',
    name: 'addressLocation',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'dropdown',
    label: 'Land Shape',
    name: 'landShapeType',
    wrapperClassName: 'col-span-6',
    options: [
      {
        value: 'A shape with soil, space is appropriate for development made a very beneficial',
        label: 'A shape with soil, space is appropriate for development made a very beneficial',
      },
      {
        value: 'A shape with soil, space is appropriate for development benefit and medium',
        label: 'A shape with soil, space is appropriate for development benefit and medium',
      },
      {
        value: 'A shape with soil, space, there are no appropriate development benefits',
        label: 'A shape with soil, space, there are no appropriate development benefits',
      },
    ],
  },
  {
    type: 'dropdown',
    label: 'Type of urban plan',
    name: 'urbanPlanningType',
    wrapperClassName: 'col-span-6',
    options: [
      {
        value: 'Commerce or commercial district',
        label: 'Commerce or commercial district',
      },
      {
        value: 'A very dense residential area',
        label: 'A very dense residential area',
      },
    ],
  },
  {
    type: 'checkbox-group',
    label: 'Location',
    name: 'landZoneType',
    orientation: 'horizontal',
    options: [
      { value: 'SanitaryZone', label: 'Sanitary Zone' },
      { value: 'Municipality', label: 'Municipality' },
      {
        value: 'Subdistrict Administrative Organization Area',
        label: 'Subdistrict Administrative Organization Area',
      },
      { value: 'Bangkok Metropolitan Area', label: 'Bangkok Metropolitan Area' },
    ],
    wrapperClassName: 'col-span-12',
  },
];

const plotLocationField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'plotLocationType',
    orientation: 'horizontal',
    options: [
      { value: 'ShowHouse', label: 'Show House' },
      { value: 'CornerPlot', label: 'Corner Plot' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'plotLocationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'plotLocationType', is: '99', operator: 'in' },
  },
];

const landFillField: FormField[] = [
  {
    type: 'radio-group',
    name: 'landFillType',
    orientation: 'horizontal',
    options: [
      { value: 'Empty Land', label: 'Empty Land' },
      { value: 'Filled', label: 'Filled' },
      { value: 'Not Filled yet', label: 'Not Filled yet' },
      { value: 'Partially Filled', label: 'Partially Filled' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landFillTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landFillStatusType', is: ['99'], operator: 'in' },
  },
  {
    type: 'number-input',
    label: 'Landfill ( % )',
    name: 'landFillPercent',
    wrapperClassName: 'col-span-6',
    decimalPlaces: 2,
    max: 100,
  },
  {
    type: 'number-input',
    label: 'Soil Level',
    name: 'soilLevel',
    wrapperClassName: 'col-span-6',
  },
];

const roadField: FormField[] = [
  {
    type: 'number-input',
    label: 'Road Width',
    name: 'accessRoadWidth',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Right of Way',
    name: 'rightOfWay',
    wrapperClassName: 'col-span-6',
    decimalPlaces: 0,
  },
  {
    type: 'number-input',
    label: 'Wide frontage of land adjacent to the road',
    name: 'roadFrontage',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Number of sides facing the road',
    name: 'numberOfSidesFacingRoad',
    wrapperClassName: 'col-span-6',
    decimalPlaces: 0,
  },
  {
    type: 'text-input',
    label: 'Road passing in front of the land',
    name: 'roadPassInFrontOfLand',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'radio-group',
    label: 'Land Accessibility',
    name: 'landAccessibilityType',
    orientation: 'horizontal',
    options: [
      { value: 'Able', label: 'Able' },
      { value: 'Unable', label: 'Unable' },
      { value: 'IsAlteration', label: 'Is Alteration' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'textarea',
    label: 'Land Accessibility Description',
    name: 'landAccessibilityRemark',
    wrapperClassName: 'col-span-12',
  },
];

const roadSurfaceField: FormField[] = [
  {
    type: 'radio-group',
    name: 'roadSurfaceType',
    orientation: 'horizontal',
    options: [
      { value: 'ReinforcedConcrete', label: 'Reinforced Concrete' },
      { value: 'Gravel/CrushedStone', label: 'Gravel/Crushed Stone' },
      { value: 'Soil', label: 'Soil' },
      { value: 'Paved', label: 'Paved' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'roadSurfaceTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roadSurfaceType', is: '99', operator: 'equals' },
  },
];

const publicUtilityField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'publicUtilityType',
    orientation: 'horizontal',
    options: [
      { value: 'PermanentElectricity', label: 'Permanent Electricity' },
      { value: 'TapWater/Groundwater', label: 'Tap Water/Groundwater' },
      { value: 'DrainagePipe/Sump', label: 'Drainage Pipe/Sump' },
      { value: 'Streetlight', label: 'Streetlight' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'publicUtilityTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'publicUtilityType', is: '99', operator: 'in' },
  },
];

const landUseField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'landUseType',
    orientation: 'horizontal',
    options: [
      { value: 'Residential', label: 'Residential' },
      { value: 'Commercial', label: 'Commercial' },
      { value: 'Industrial', label: 'Industrial' },
      { value: 'Agricultural', label: 'Agricultural' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landUseTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landUseType', is: '99', operator: 'in' },
  },
];

const landEntranceField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'landEntranceExitType',
    orientation: 'horizontal',
    options: [
      { value: 'PublicInterest', label: 'Public Interest' },
      { value: 'InsideAllocationProject', label: 'Inside the  Allocation Project' },
      { value: 'Personal', label: 'Personal' },
      { value: 'Servitude', label: 'Servitude' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landEntranceExitTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landEntranceExitType', is: '99', operator: 'in' },
  },
];

const transpotationField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'transportationAccessType',
    orientation: 'horizontal',
    options: [
      { value: 'Car', label: 'Car' },
      { value: 'Bus', label: 'Bus' },
      { value: 'Ship', label: 'Ship' },
      { value: 'Footpath', label: 'Footpath' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'transportationAccessTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'transportationAccessType', is: '99', operator: 'in' },
  },
];

const anticipationProsperityField: FormField[] = [
  {
    type: 'radio-group',
    name: 'propertyAnticipationType',
    orientation: 'horizontal',
    options: [
      { value: 'VeryProsperous', label: 'Very Prosperous' },
      { value: 'Moderate', label: 'Moderate' },
      { value: 'LikelyProsperFuture', label: 'Likely to Prosper in the Future' },
      { value: 'LittleChanceProsperity', label: 'Little Chance of Prosperity' },
    ],
    wrapperClassName: 'col-span-12',
  },
];

//****** */
const expropriateField: FormField[] = [
  {
    type: 'checkbox',
    name: 'isExpropriated',
    label: 'Is Expropriate',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'checkbox',
    name: 'isInExpropriationLine',
    label: 'In Line Expropriate',
    wrapperClassName: 'col-span-7',
  },
  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'textarea',
    label: 'Is Expropriated',
    name: 'expropriationRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isExpropriated', is: true },
  },
  {
    type: 'textarea',
    label: 'Is In Line Expropriate',
    name: 'expropriationLineRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isInExpropriationLine', is: true },
  },
];

const encroachedField: FormField[] = [
  {
    type: 'checkbox',
    name: 'isEncroached',
    label: 'Is Encroached',
    wrapperClassName: 'col-span-9',
  },
  {
    type: 'number-input',
    label: 'Encraoched Area Sq.wa',
    name: 'encroachmentArea',
    wrapperClassName: 'col-span-3',
    disableWhen: { field: 'isEncroached', is: false },
  },
  {
    type: 'textarea',
    label: 'Is Encroached',
    name: 'encroachmentRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isEncroached', is: true },
  },
];
const LimitationOther: FormField[] = [
  {
    type: 'checkbox',
    name: 'hasElectricity',
    label: 'Has Electricity',
    wrapperClassName: 'col-span-9',
  },
  {
    type: 'number-input',
    label: 'Distance',
    name: 'electricityDistance',
    wrapperClassName: 'col-span-3',
    disableWhen: { field: 'hasElectricity', is: false },
  },
  {
    type: 'checkbox',
    label: 'Is Landlocked',
    name: 'isLandlocked',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'checkbox',
    label: 'Is Forest Boundary',
    name: 'isForestBoundary',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'textarea',
    label: 'Is Landlocked Other',
    name: 'landlockedRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isLandlocked', is: true },
  },

  {
    type: 'textarea',
    label: 'Is Forest Boundary Other',
    name: 'forestBoundaryRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isForestBoundary', is: true },
  },
  {
    type: 'textarea',
    label: 'Other',
    name: 'otherLegalLimitations',
    wrapperClassName: 'col-span-12',
  },
];

const evictionField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'evictionType',
    orientation: 'horizontal',
    options: [
      { value: 'PermanentElectricity', label: 'Permanent Electricity' },
      { value: 'SubwayLine', label: 'Subway Line' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'evictionTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'evictionStatusType', is: '99', operator: 'in' },
  },
];

const allocationField: FormField[] = [
  {
    type: 'radio-group',
    name: 'allocationType',
    orientation: 'horizontal',
    options: [
      { value: 'AllocateNewProjects', label: 'Allocate Projects' },
      { value: 'NotAllocate', label: 'Not Allocate' },
    ],
    wrapperClassName: 'col-span-12',
  },
];

const sizeAndBoundary: FormField[] = [
  {
    type: 'text-input',
    label: 'North Consecutive Area',
    name: 'northAdjacentArea',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'North Estimate Length',
    name: 'northBoundaryLength',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'South Consecutive Area',
    name: 'southAdjacentArea',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'South Estimate Length',
    name: 'southBoundaryLength',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'East Consecutive Area',
    name: 'eastAdjacentArea',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'East Estimate Length',
    name: 'eastBoundaryLength',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'West Consecutive Area',
    name: 'westAdjacentArea',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'West Estimate Length',
    name: 'westBoundaryLength',
    wrapperClassName: 'col-span-6',
  },
];

const otherInformationField: FormField[] = [
  {
    type: 'number-input',
    label: 'Pond Area',
    name: 'pondArea',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Depth of Pit',
    name: 'pondDepth',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'checkbox',
    label: 'Has Building',
    name: 'hasBuilding',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'hasBuildingOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasBuilding', is: true },
  },
];

const remarkLandField: FormField[] = [
  {
    type: 'textarea',
    label: '',
    name: 'remark',
    wrapperClassName: 'col-span-12',
  },
];

export default LandDetailForm;
