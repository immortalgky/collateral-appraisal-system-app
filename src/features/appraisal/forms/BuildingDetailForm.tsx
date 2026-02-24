import { FormFields, type FormField } from '@/shared/components/form';
import SurfaceTable from '../components/tables/SurfaceTable';
import { BuildingDetail } from '../components/tables/BuildingDetail';
import Icon from '@/shared/components/Icon';
import type { ReactNode } from 'react';

interface BuildingDetailFormProps {
  prefix?: string;
}

// SectionRow component for consistent section styling with icons
interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
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
    {!isLast && <div className="h-px bg-gray-200 col-span-5" />}
  </>
);

const BuildingDetailForm = ({ prefix }: BuildingDetailFormProps) => {
  return (
    <div className="grid grid-cols-5 gap-6">
      <SectionRow title="Building Information" icon="building">
        <FormFields fields={buildingInfoField} />
      </SectionRow>

      <SectionRow title="Building Type" icon="list">
        <FormFields fields={buildingTypeField} />
      </SectionRow>

      <SectionRow title="Decoration" icon="paint-roller">
        <FormFields fields={decorationField} />
      </SectionRow>

      <SectionRow title="Encroachment" icon="arrows-left-right">
        <FormFields fields={encroachmentField} />
      </SectionRow>

      <SectionRow title="Building Material" icon="cubes">
        <FormFields fields={buildingMaterialField} />
      </SectionRow>

      <SectionRow title="Building Style" icon="ruler-combined">
        <FormFields fields={buildingStyleField} />
      </SectionRow>

      <SectionRow title="Is Residential" icon="house">
        <FormFields fields={isResidentialField} />
      </SectionRow>

      <SectionRow title="Construction Style" icon="hammer">
        <FormFields fields={constructionStyleField} />
      </SectionRow>

      <SectionRow title="General Structure" icon="warehouse">
        <FormFields fields={generalStructureField} />
      </SectionRow>

      <SectionRow title="Roof Frame" icon="house-chimney">
        <FormFields fields={roofFrameField} />
      </SectionRow>

      <SectionRow title="Roof" icon="tent">
        <FormFields fields={roofField} />
      </SectionRow>

      <SectionRow title="Ceiling" icon="border-top-left">
        <FormFields fields={ceilingField} />
      </SectionRow>

      <SectionRow title="Wall" icon="square">
        <FormFields fields={wallField} />
      </SectionRow>

      <SectionRow title="Surface" icon="layer-group">
        <SurfaceTable headers={surfaceTableHeader} name={'surfaces'} />
      </SectionRow>

      <SectionRow title="Fence" icon="fence">
        <FormFields fields={fenceField} />
      </SectionRow>

      <SectionRow title="Construction Type" icon="gears">
        <FormFields fields={constTypeFeild} />
      </SectionRow>

      <SectionRow title="Utilization" icon="hand-holding">
        <FormFields fields={utilizationFeild} />
      </SectionRow>

      <SectionRow title="Building Detail" icon="table">
        <FormFields fields={buildingArea} />
        <div className="col-span-12">
          <BuildingDetail
            name={
              prefix != null
                ? `${prefix}.depreciationDetails`
                : 'depreciationDetails'
            }
          />
        </div>
      </SectionRow>

      <SectionRow title="Remark" icon="comment" isLast>
        <FormFields fields={remarkField} />
      </SectionRow>
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
    name: 'isOwnerVerified',
    required: true,
    options: ['Can not', 'Can'],
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
    type: 'text-input',
    label: 'Construction on Title Deed No.',
    name: 'builtOnTitleNumber',
    wrapperClassName: 'col-span-5',
    required: true,
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
    name: 'buildingConditionType',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'boolean-toggle',
    label: 'Under Construction',
    name: 'isUnderConstruction',
    wrapperClassName: 'col-span-3',
    options: ['No', 'Yes'],
  },
  {
    type: 'number-input',
    label: 'Construction Completion (%)',
    name: 'constructionCompletionPercent',
    wrapperClassName: 'col-span-3',
    disableWhen: { field: 'isUnderConstruction', is: true },
  },
  {
    type: 'datetime-input',
    label: 'License Expiration Date',
    name: 'constructionLicenseExpirationDate',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'boolean-toggle',
    label: 'Is Appraise',
    name: 'isAppraisable',
    required: true,
    options: ['Not Appraise', 'Appraise'],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'boolean-toggle',
    label: 'Is Obligation',
    name: 'hasObligation',
    options: ['No Obligation', 'Mortgage as Security'],
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

const buildingTypeField: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingType',
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
    name: 'buildingTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'buildingType', is: '99', operator: 'equals' },
  },
  {
    type: 'number-input',
    label: 'Total Floor',
    name: 'numberOfFloors',
    wrapperClassName: 'col-span-2',
    required: true,
  },
];

const decorationField: FormField[] = [
  {
    type: 'radio-group',
    name: 'decorationType',
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
    name: 'decorationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'decorationType', is: '99', operator: 'equals' },
  },
];

const encroachmentField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: '',
    name: 'isEncroachingOthers',
    options: ['Is not Encroaching', 'Is Encroaching'],
    wrapperClassName: 'col-span-4 flex items-center',
  },
  {
    type: 'number-input',
    label: 'Encroaching Area',
    name: 'encroachingOthersArea',
    wrapperClassName: 'col-span-2',
    disableWhen: { field: 'isEncroachingOthers', is: false },
  },
  {
    type: 'text-input',
    label: 'Encroachment Remark',
    name: 'encroachingOthersRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isEncroachingOthers', is: true },
  },
];

const buildingMaterialField: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingMaterialType',
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
    name: 'buildingStyleType',
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
    name: 'isResidential',
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-10 flex items-center',
  },
  {
    type: 'number-input',
    label: 'Building Age',
    name: 'buildingAge',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'textarea',
    label: 'Due To',
    name: 'residentialRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isResidential', is: false },
  },
];
const constructionStyleField: FormField[] = [
  {
    type: 'radio-group',
    name: 'constructionStyleType',
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
    name: 'constructionStyleRemark',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

const generalStructureField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'structureType',
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
    name: 'structureTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'structureType', is: '99', operator: 'in' },
  },
];

const roofFrameField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'roofFrameType',
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
    name: 'roofFrameTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofFrameType', is: '99', operator: 'in' },
  },
];

const roofField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'roofType',
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
    name: 'roofTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofType', is: '99', operator: 'in' },
  },
];

const ceilingField: FormField[] = [
  {
    type: 'checkbox-group',
    name: 'ceilingType',
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
    name: 'ceilingTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'ceilingType', is: '99', operator: 'in' },
  },
];

const wallField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Interior',
    name: 'interiorWallType',
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
    name: 'interiorWallTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'interiorWallType', is: '99', operator: 'in' },
  },
  {
    type: 'checkbox-group',
    label: 'Exterior',
    name: 'exteriorWallType',
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
    name: 'exteriorWallTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'exteriorWallType', is: '99', operator: 'in' },
  },
];

const surfaceTableHeader = [
  {
    name: 'fromFloorNumber',
    label: 'From Floor No.',
    inputType: 'number' as const,
  },
  { name: 'toFloorNumber', label: 'To Floor No.', inputType: 'number' as const },
  {
    name: 'floorType',
    label: 'Floor Type',
    inputType: 'dropdown' as const,
    options: [
      { value: 'CB', label: 'Cement Block' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'IRON', label: 'Iron' },
    ],
  },
  {
    name: 'floorStructureType',
    label: 'Floor Structure',
    inputType: 'dropdown' as const,
    options: [
      { value: 'CB', label: 'Cement Block' },
      { value: 'WOOD', label: 'Wood' },
      { value: 'IRON', label: 'Iron' },
    ],
  },
  {
    name: 'floorSurfaceType',
    label: 'Floor Surface',
    inputType: 'dropdown' as const,
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
    name: 'fenceType',
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
    name: 'fenceTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'fenchType', is: '99', operator: 'in' },
  },
];

const constTypeFeild: FormField[] = [
  {
    type: 'radio-group',
    name: 'constructionType',
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
    name: 'constructionTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'constructionType', is: '99', operator: 'equals' },
  },
];

const buildingArea: FormField[] = [
  {
    type: 'number-input',
    name: 'totalBuildingArea',
    label: 'Total Building Area (sq.m.)',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'textarea',
    label: 'Other',
    name: 'constructionTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'constructionType', is: '99', operator: 'equals' },
  },
];

const utilizationFeild: FormField[] = [
  {
    type: 'radio-group',
    name: 'utilizationType',
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
    name: 'utilizationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'utilizationType', is: '99', operator: 'equals' },
  },
];

const remarkField: FormField[] = [
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default BuildingDetailForm;
