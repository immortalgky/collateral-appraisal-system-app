import { FormFields } from '@/shared/components/form';
import SurfaceTable from '../components/tables/SurfaceTable';
import { BuildingDetail } from '../components/tables/BuildingDetail';
import Icon from '@/shared/components/Icon';
import type { ReactNode } from 'react';
import {
  buildingInfoField,
  buildingTypeField,
  decorationField,
  encroachmentField,
  buildingMaterialField,
  buildingStyleField,
  isResidentialField,
  constructionStyleField,
  generalStructureField,
  roofFrameField,
  roofField,
  ceilingField,
  interiorWallFields,
  exteriorWallFields,
  fenceField,
  constTypeFeild,
  utilizationFeild,
  buildingArea,
  remarkBuildingField,
} from '../configs/fields';

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

const Card = ({ children }: { children: ReactNode }) => (
  <div className="col-span-12 bg-gray-50 rounded-lg p-3">
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
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

      <SectionRow title="Material & Style" icon="cubes">
        <Card>
          <FormFields fields={buildingMaterialField} />
        </Card>
        <Card>
          <FormFields fields={buildingStyleField} />
        </Card>
        <Card>
          <FormFields fields={constructionStyleField} />
        </Card>
      </SectionRow>

      <SectionRow title="Is Residential" icon="house">
        <FormFields fields={isResidentialField} />
      </SectionRow>

      <SectionRow title="General Structure" icon="warehouse">
        <FormFields fields={generalStructureField} />
      </SectionRow>

      <SectionRow title="Roof & Ceiling" icon="house-chimney">
        <Card>
          <FormFields fields={roofFrameField} />
        </Card>
        <Card>
          <FormFields fields={roofField} />
        </Card>
        <Card>
          <FormFields fields={ceilingField} />
        </Card>
      </SectionRow>

      <SectionRow title="Wall" icon="square">
        <Card>
          <FormFields fields={interiorWallFields} />
        </Card>
        <Card>
          <FormFields fields={exteriorWallFields} />
        </Card>
      </SectionRow>

      <SectionRow title="Surface" icon="layer-group">
        <SurfaceTable headers={surfaceTableHeader} name={'surfaces'} />
      </SectionRow>

      <SectionRow title="Construction & Use" icon="gears">
        <Card>
          <FormFields fields={fenceField} />
        </Card>
        <Card>
          <FormFields fields={constTypeFeild} />
        </Card>
        <Card>
          <FormFields fields={utilizationFeild} />
        </Card>
      </SectionRow>

      <SectionRow title="Building Detail" icon="table">
        <FormFields fields={buildingArea} />
        <div className="col-span-12">
          <BuildingDetail
            name={prefix != null ? `${prefix}.depreciationDetails` : 'depreciationDetails'}
          />
        </div>
      </SectionRow>

      <SectionRow title="Remark" icon="comment" isLast>
        <FormFields fields={remarkBuildingField} />
      </SectionRow>
    </div>
  );
};

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
    group: 'FloorType',
  },
  {
    name: 'floorStructureType',
    label: 'Floor Structure',
    inputType: 'dropdown' as const,
    group: 'FloorStructure',
  },
  {
    name: 'floorSurfaceType',
    label: 'Floor Surface',
    inputType: 'dropdown' as const,
    group: 'FloorSurface',
  },
];

export default BuildingDetailForm;
