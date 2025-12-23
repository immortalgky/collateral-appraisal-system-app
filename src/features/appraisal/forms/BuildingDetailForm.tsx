import FormSection, { type FormField } from '@/shared/components/sections/FormSection';
import SurfaceTable from '../components/tables/SurfaceTable';
import SectionDivider from '@/shared/components/sections/SectionDevider';
import { BuildingDetail } from '../components/tables/BuildlingDetail';

const BuildingDetailForm = () => {
  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-1">
        <p>Building Information</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={buildingInfoField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Building Type</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={buildingTypeField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Decoration</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={decorationField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Encroachment</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={encroachmentField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Building Material</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={buildingMaterialField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Building Style</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={buildingStyleField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Is Residential</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={isResidentialField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Construction Style</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={constructionStyleField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>General Structure</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={generalStructureField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Roof Frame</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={roofFrameField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Roof</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={roofField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Ceiling</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={ceilingField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Wall</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={wallField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Surface</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <SurfaceTable headers={surfaceTableHeader} name={'buildingDetail.surface'} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Fence</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={fenceField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Construction Type</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={constTypeFeild} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Utilization</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={utilizationFeild} />
        </div>
      </div>
      <SectionDivider className="col-span-5" />
      <div className="col-span-1">
        <span>Building Detail</span>
      </div>
      <div className="col-span-4">
        <BuildingDetail name="buildingDetail.buildingDepreciationDetails" />
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
      <div className="col-span-1">
        <p>Remark</p>
      </div>
      <div className="col-span-4">
        <div className="grid grid-cols-12 gap-4">
          <FormSection fields={remarkField} />
        </div>
      </div>
      <div className="h-[0.1px] bg-gray-300 mt-6 col-span-5"></div>
    </div>
  );
};

const buildingInfoField: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Building No.',
    name: 'buildingNumber',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'House No.',
    name: 'houseNumber',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Model Name',
    name: 'modelName',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'buildingDetail.verifiableOwner',
    required: true,
    options: ['Can', 'Can not'],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'buildingDetail.owner',
    wrapperClassName: 'col-span-4',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Construction on Title Deed No.',
    name: 'builtOnTitleNumber',
    wrapperClassName: 'col-span-5',
    required: true,
  },
  {
    type: 'radio-group',
    label: 'No House Number',
    options: [
      { value: 'NI', label: 'Not Installed' },
      { value: 'NR', label: 'Not Request' },
    ],
    orientation: 'horizontal',
    name: 'buildingDetail.noHouseNumber',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'radio-group',
    label: 'Building Condition',
    options: [
      { value: 'NEW', label: 'New' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'OLD', label: 'Old' },
      { value: 'CONSTRUCTION', label: 'Construction' },
      { value: 'DILAPIDATED', label: 'Dilapidated' },
    ],
    orientation: 'horizontal',
    name: 'buildingDetail.buildingCondition',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Under Construction',
    options: [
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' },
    ],
    orientation: 'horizontal',
    name: 'buildingDetail.underConst',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'number-input',
    label: 'Construction Completion (%)',
    name: 'buildingDetail.constCompletionPct',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'datetime-input',
    label: 'License Expiration Date',
    name: 'buildingDetail.licenseExpirationDate',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'boolean-toggle',
    label: 'Is Appraise',
    name: 'buildingDetail.isAppraise',
    required: true,
    options: ['Appraise', 'Not Appraise'],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Is Obligation',
    name: 'buildingDetail.isObligation',
    orientation: 'horizontal',
    options: [
      { value: '1', label: 'No Obligation' },
      { value: '2', label: 'Mortgage as Security' },
    ],
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Obligation',
    name: 'buildingDetail.obligation',
    wrapperClassName: 'col-span-12',
  },
];

const buildingTypeField: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingDetail.buildingType',
    orientation: 'horizontal',
    options: [
      { value: 'SGH', label: 'Single House' },
      { value: 'TWH', label: 'Twin House' },
      { value: 'TNH', label: 'Townhouse' },
      { value: 'CMB', label: 'Commercial Building' },
      { value: 'UNT', label: 'Condominium' },
      { value: 'PROJ', label: 'Project' },
      { value: 'OFC', label: 'Office' },
      { value: 'HTL', label: 'Hotel' },
      { value: 'DPS', label: 'Department Store' },
      { value: 'FAC', label: 'Factory' },
      { value: 'WH', label: 'Warehouse' },
      { value: 'APT', label: 'Apartment' },
      { value: 'RSB', label: 'Residential Building' },
      { value: 'L', label: 'Land' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Building Type Other',
    name: 'buildingDetail.buidingTypeOther',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'number-input',
    label: 'Total Floor',
    name: 'buildingDetail.totalFloor',
    wrapperClassName: 'col-span-2',
  },
];

const decorationField: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingDetail.decoration',
    orientation: 'horizontal',
    options: [
      { value: 'RDTM', label: 'Ready to move in' },
      { value: 'PRT', label: 'Partially' },
      { value: 'NONE', label: 'None' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Decoration Other',
    name: 'buildingDetail.decorationOther',
    wrapperClassName: 'col-span-12',
  },
];

const encroachmentField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: '',
    name: 'buildingDetail.isEncroached',
    options: ['Is Encroached', 'Is not Encroached'],
    wrapperClassName: 'col-span-4 flex items-center',
  },
  {
    type: 'number-input',
    label: 'Encroachment Area',
    name: 'buildingDetail.encroachArea',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Encroachment Remark',
    name: 'buildingDetail.isEncroachedRemark',
    wrapperClassName: 'col-span-12',
  },
];

const buildingMaterialField: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingDetail.buildingMaterial',
    orientation: 'horizontal',
    options: [
      { value: 'VERYGOOD', label: 'Very Good' },
      { value: 'GOOD', label: 'Good' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'FE', label: 'Fair Enough' },
    ],
    wrapperClassName: 'col-span-12',
  },
];

const buildingStyleField: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingDetail.buildingStyle',
    orientation: 'horizontal',
    options: [
      { value: 'VERYGOOD', label: 'Very Good' },
      { value: 'GOOD', label: 'Good' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'FE', label: 'Fair Enough' },
    ],
    wrapperClassName: 'col-span-12',
  },
];

const isResidentialField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: '',
    name: 'buildingDetail.isResidential',
    options: ['Can', 'Can not'],
    wrapperClassName: 'col-span-10 flex items-center',
  },
  {
    type: 'number-input',
    label: 'Building Age',
    name: 'buildingDetail.buildingAge',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'textarea',
    label: 'Due To',
    name: 'buildingDetail.dueTo',
    wrapperClassName: 'col-span-12',
  },
];
const constructionStyleField: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingDetail.constStyle',
    orientation: 'horizontal',
    options: [
      { value: 'BUILDING', label: 'Building' },
      { value: 'HTB', label: 'Half-Timbered Building' },
      { value: 'WOOD', label: 'Wood' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'textarea',
    label: 'Remark',
    name: 'buildingDetail.constStyleRemark',
    wrapperClassName: 'col-span-12',
  },
];

const generalStructureField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'buildingDetail.generalStructure',
    orientation: 'horizontal',
    options: [
      { value: 'RFC', label: 'Reinforced Concrete' },
      { value: 'STEEL', label: 'Steel' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'CANTCHECK', label: "Can't Check" },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'buildingDetail.generalStructureOther',
    wrapperClassName: 'col-span-12',
  },
];

const roofFrameField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'buildingDetail.roofFrame',
    orientation: 'horizontal',
    options: [
      { value: 'RFC', label: 'Reinforced Concrete' },
      { value: 'STEEL', label: 'Steel' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'CANTCHECK', label: "Can't Check" },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'buildingDetail.roofFrameOther',
    wrapperClassName: 'col-span-12',
  },
];

const roofField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'buildingDetail.roof',
    orientation: 'horizontal',
    options: [
      { value: 'RFC', label: 'Reinforced Concrete' },
      { value: 'STEEL', label: 'Steel' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'CANTCHECK', label: "Can't Check" },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'buildingDetail.roofOther',
    wrapperClassName: 'col-span-12',
  },
];

const ceilingField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'buildingDetail.ceiling',
    orientation: 'horizontal',
    options: [
      { value: 'SG', label: 'Smooth Gypsum' },
      { value: 'TBAR', label: 'T-Bar' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'RFC', label: 'Reinforced Concrete' },
      { value: 'SB', label: 'Smartboard' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'buildingDetail.ceilingOther',
    wrapperClassName: 'col-span-12',
  },
];

const wallField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Interior',
    name: 'buildingDetail.interiorWall',
    orientation: 'horizontal',
    options: [
      { value: 'WOOD', label: 'Wood' },
      { value: 'SPBPAINT', label: 'Smooth plastered brickwork and painted' },
      { value: 'WALLPAPER', label: 'Wallpaper' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'buildingDetail.interiorWallOther',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'checkbox-group',
    label: 'Exterior',
    name: 'buildingDetail.exteriorWall',
    orientation: 'horizontal',
    options: [
      { value: 'WOOD', label: 'Wood' },
      { value: 'SPBPAINT', label: 'Smooth plastered brickwork and painted' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'buildingDetail.exteriorWallOther',
    wrapperClassName: 'col-span-12',
  },
];

const surfaceTableHeader = [
  {
    name: 'fromFloorNumber',
    label: 'From Floor No.',
    inputType: 'number',
  },
  { name: 'toFloorNumber', label: 'To Floor No.', inputType: 'number' },
  {
    name: 'floorType',
    label: 'Floor Type',
    inputType: 'dropdown',
    options: [
      { value: 'CB', label: 'Cement Block' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'IRON', label: 'Iron' },
    ],
  },
  {
    name: 'floorStructure',
    label: 'Floor Structure',
    inputType: 'dropdown',
    options: [
      { value: 'CB', label: 'Cement Block' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'IRON', label: 'Iron' },
    ],
  },
  {
    name: 'floorSurface',
    label: 'Floor Surface',
    inputType: 'dropdown',
    options: [
      { value: 'CB', label: 'Cement Block' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'IRON', label: 'Iron' },
    ],
  },
];

const fenceField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'buildingDetail.fence',
    orientation: 'horizontal',
    options: [
      { value: 'CB', label: 'Cement Block' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'IRON', label: 'Iron' },
      { value: 'BRICK', label: 'Brick' },
      { value: 'SS', label: 'Stainless Steel' },
      { value: 'NF', label: 'No Fence' },
      { value: 'WM', label: 'Wire Mesh' },
      { value: 'BW', label: 'Barbed Wire' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other',
    name: 'buildingDetail.fenceOther',
    wrapperClassName: 'col-span-12',
  },
];

const constTypeFeild: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingDetail.constType',
    orientation: 'horizontal',
    options: [
      { value: 'HES', label: 'House Estate' },
      { value: 'BIY', label: 'Build it yourself' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'textarea',
    label: 'Other',
    name: 'buildingDetail.constTypeOther',
    wrapperClassName: 'col-span-12',
  },
];

const utilizationFeild: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingDetail.utilization',
    orientation: 'horizontal',
    options: [
      { value: 'HES', label: 'House Estate' },
      { value: 'BIY', label: 'Build it yourself' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'textarea',
    label: 'Other',
    name: 'buildingDetail.useForOtherPurpose',
    wrapperClassName: 'col-span-12',
  },
];

const remarkField: FormField[] = [
  {
    type: 'textarea',
    label: 'Remark',
    name: 'buildingDetail.remark',
    wrapperClassName: 'col-span-12',
  },
];

export default BuildingDetailForm;
