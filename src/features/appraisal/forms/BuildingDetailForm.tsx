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
  wallField,
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
