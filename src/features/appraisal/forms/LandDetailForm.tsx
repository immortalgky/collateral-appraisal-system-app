import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

const LandDetailForm = () => {
  return (
    <div>
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-1">
          <p>Land Information</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={landInfoField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Land Location</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={landLocationField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Plot Location</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={plotLocationField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Landfill</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={landFillField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Road</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={roadField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Road Surface</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={roadSurfaceField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Public Utility</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={publicUtilityField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Land Use</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={landUseField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Land Entrance-Exit</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={landEntranceField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Transpotation</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={transpotationField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Anticipation of Prosperity</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={anticipationProsperityField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Limitation</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={limitationField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Eviction</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={evictionField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Allocation</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={allocationField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Other Information</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={otherInformationField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
        <div className="col-span-1">
          <p>Remark</p>
        </div>
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-4">
            <FormSection fields={remarkLandField} />
          </div>
        </div>
        <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
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
  },
  {
    type: 'text-input',
    label: 'Longitude',
    name: 'longitude',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Sub-District',
    name: 'subDistrict',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'district',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'province',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'dropdown',
    label: 'Land Office',
    name: 'landOffice',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' },
    ],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'textarea',
    label: 'Land Description',
    name: 'landDescription',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Check Owner',
    name: 'landDetail.varifiableOwner',
    orientation: 'horizontal',
    options: [
      { value: '1', label: 'Can' },
      { value: '0', label: 'Can not' },
    ],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'landDetail.owner',
    wrapperClassName: 'col-span-9',
  },
  {
    type: 'radio-group',
    label: 'Is Obligation',
    name: 'landDetail.isObligation',
    orientation: 'horizontal',
    options: [
      { value: '1', label: 'No Obligation' },
      { value: '0', label: 'Mortgage as Security' },
    ],
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Obligation',
    name: 'landDetail.obligation',
    wrapperClassName: 'col-span-12',
  },
];

const landLocationField: FormField[] = [
  {
    type: 'radio-group',
    name: 'landDetail.landLocationVerification',
    orientation: 'horizontal',
    options: [
      { value: '1', label: 'Correct' },
      { value: '0', label: 'In Correct' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Check By',
    name: 'landDetail.landCheckMethod',
    orientation: 'horizontal',
    options: [
      { value: 'plot', label: 'Plot' },
      { value: 'rawang', label: 'Rawang' },
      { value: 'other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.landCheckOther',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Street',
    name: 'landDetail.street',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'landDetail.soi',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Distance',
    name: 'landDetail.distance',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Village',
    name: 'landDetail.village',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Address / Location',
    name: 'landDetail.addressLocation',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'dropdown',
    label: 'Land Shape',
    name: 'landDetail.landShape',
    wrapperClassName: 'col-span-6',
    options: [
      {
        value: 'a',
        label: 'A shape with soil, space is appropriate for development made a very beneficial',
      },
      {
        value: 'b',
        label: 'A shape with soil, space is appropriate for development benefit and medium',
      },
      {
        value: 'c',
        label: 'A shape with soil, space, there are no appropriate development benefits ',
      },
    ],
  },
  {
    type: 'dropdown',
    label: 'Type of urban plan',
    name: 'landDetail.urbanPlanningType',
    wrapperClassName: 'col-span-6',
    options: [
      {
        value: 'a',
        label: 'Commerce or commercial district',
      },
      {
        value: 'b',
        label: 'A very dense residential area',
      },
    ],
  },
  {
    type: 'checkbox-group',
    label: 'Location',
    name: 'landDetail.location',
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
    name: 'landDetail.plotLocation',
    orientation: 'horizontal',
    options: [
      { value: 'ShowHouse', label: 'Show House' },
      { value: 'CornerPlot', label: 'Corner Plot' },
      { value: 'Other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.plotLocationOther',
    wrapperClassName: 'col-span-12',
  },
];

const landFillField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'landDetail.landFill',
    orientation: 'horizontal',
    options: [
      { value: 'ShowHouse', label: 'Show House' },
      { value: 'CornerPlot', label: 'Corner Plot' },
      { value: 'Other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.landFillOther',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Landfill ( % )',
    name: 'landDetail.landFillPct',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Soil Level',
    name: 'landDetail.soilLevel',
    wrapperClassName: 'col-span-6',
  },
];

const roadField: FormField[] = [
  {
    type: 'text-input',
    label: 'Road Width',
    name: 'landDetail.roadWidth',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Right of Way',
    name: 'landDetail.rightOfWay',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Wide frontage of land adjacent to the road',
    name: 'landDetail.wideFrontageOfLand',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Number of sides facing the road',
    name: 'landDetail.noOfSideFacingRoad',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Road passing in front of the land',
    name: 'landDetail.roadPassInFrontOfLand',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'radio-group',
    label: 'Land Accessibility',
    name: 'landDetail.landAccessibility',
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
    name: 'landDetail.landAccessibilityDesc',
    wrapperClassName: 'col-span-12',
  },
];

const roadSurfaceField: FormField[] = [
  {
    type: 'radio-group',
    name: 'landDetail.roadSurface',
    orientation: 'horizontal',
    options: [
      { value: 'ReinforcedConcrete', label: 'Reinforced Concrete' },
      { value: 'Gravel/CrushedStone', label: 'Gravel/Crushed Stone' },
      { value: 'Soil', label: 'Soil' },
      { value: 'Paved', label: 'Paved' },
      { value: 'Other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.roadSurfaceOther',
    wrapperClassName: 'col-span-12',
  },
];

const publicUtilityField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'landDetail.publicUtility',
    orientation: 'horizontal',
    options: [
      { value: 'PermanentElectricity', label: 'Permanent Electricity' },
      { value: 'TapWater/Groundwater', label: 'Tap Water/Groundwater' },
      { value: 'DrainagePipe/Sump', label: 'Drainage Pipe/Sump' },
      { value: 'Streetlight', label: 'Streetlight' },
      { value: 'Other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.publicUtilityOther',
    wrapperClassName: 'col-span-12',
  },
];

const landUseField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'landDetail.landUse',
    orientation: 'horizontal',
    options: [
      { value: 'Residential', label: 'Residential' },
      { value: 'Commercial', label: 'Commercial' },
      { value: 'Industrial', label: 'Industrial' },
      { value: 'Agricultural', label: 'Agricultural' },
      { value: 'Other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.landUseOther',
    wrapperClassName: 'col-span-12',
  },
];

const landEntranceField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'landDetail.landEntranceExit',
    orientation: 'horizontal',
    options: [
      { value: 'PublicInterest', label: 'Public Interest' },
      { value: 'InsideAllocationProject', label: 'Inside the  Allocation Project' },
      { value: 'Personal', label: 'Personal' },
      { value: 'Servitude', label: 'Servitude' },
      { value: 'Other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.landEntranceExitOther',
    wrapperClassName: 'col-span-12',
  },
];

const transpotationField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'landDetail.transpotation',
    orientation: 'horizontal',
    options: [
      { value: 'Car', label: 'Car' },
      { value: 'Bus', label: 'Bus' },
      { value: 'Ship', label: 'Ship' },
      { value: 'Footpath', label: 'Footpath' },
      { value: 'Other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.transpotationOther',
    wrapperClassName: 'col-span-12',
  },
];

const anticipationProsperityField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'landDetail.anticipationProsperity',
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

// Expropriate need to change
const limitationField: FormField[] = [
  {
    type: 'radio-group',
    name: 'landDetail.isExpropriate',
    orientation: 'horizontal',
    options: [
      { value: 'IsExpropriate', label: 'Is Expropriate' },
      { value: 'InLineExpropriate', label: 'In Line Expropriate' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Is Expropriate Other',
    name: 'landDetail.limitationDetails',
    wrapperClassName: 'col-span-12',
  },
];

const evictionField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'landDetail.eviction',
    orientation: 'horizontal',
    options: [
      { value: 'PermanentElectricity', label: 'Permanent Electricity' },
      { value: 'SubwayLine', label: 'Subway Line' },
      { value: 'Other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.evictionOther',
    wrapperClassName: 'col-span-12',
  },
];

const allocationField: FormField[] = [
  {
    type: 'radio-group',
    name: 'landDetail.allocation',
    orientation: 'horizontal',
    options: [
      { value: 'AllocateNewProjects', label: 'Allocate New Projects' },
      { value: 'AllocateOldProjects', label: 'Allocate Old Projects' },
      { value: 'NotAllocate', label: 'Not Allocate' },
    ],
    wrapperClassName: 'col-span-12',
  },
];

const otherInformationField: FormField[] = [
  {
    type: 'text-input',
    label: 'Pound Area',
    name: 'landDetail.poundArea',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Depth of Pit',
    name: 'landDetail.depthPit',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'radio-group',
    label: 'Has Building',
    name: 'landDetail.hasBuilding',
    orientation: 'horizontal',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'other', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'landDetail.hasBuildingOther',
    wrapperClassName: 'col-span-12',
  },
];

const remarkLandField: FormField[] = [
  {
    type: 'textarea',
    label: '',
    name: 'landDetail.remark',
    wrapperClassName: 'col-span-12',
  },
];

export default LandDetailForm;
