import { FormFields, type FormField } from '@/shared/components/form';
import SurfaceTable from '../components/tables/SurfaceTable';
import { BuildingDetail } from '../components/tables/BuildingDetail';
import Icon from '@/shared/components/Icon';
import { useMemo, type ReactNode } from 'react';
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
import { PropertyNameTriggerIcon, type PropertyType } from '../components/PropertyNameTriggerIcon';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface BuildingDetailFormProps {
  prefix?: string;
  propertyType?: PropertyType;
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
    <div className="cas-section-head col-span-full xl:col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-full xl:col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="h-px bg-gray-200 col-span-full xl:col-span-5" />}
  </>
);

const Card = ({ children }: { children: ReactNode }) => (
  <div className="col-span-12">
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
);

// copy owner from land
const OwnerFromLandTriggerIcon = () => {
  const { getValues, setValue } = useFormContext();
  const { t } = useTranslation('appraisal');
  const label = t('forms.owner.autoFillLabel');

  const handleClick = () => {
    const landOwner = (getValues('ownerNameLand') ?? '').toString().trim();
    const isOwnerVerified = getValues('isOwnerVerifiedLand') ?? true;
    if (landOwner) {
      setValue('isOwnerVerifiedBuilding', isOwnerVerified, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('ownerNameBuilding', landOwner, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={e => e.preventDefault()}
      title={label}
      aria-label={label}
      className="pointer-events-auto p-1 -m-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary-500/50"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
        />
      </svg>
    </button>
  );
};

const BuildingDetailForm = ({ prefix, propertyType = 'B' }: BuildingDetailFormProps) => {
  const fillIcon = useMemo(() => <PropertyNameTriggerIcon propertyType={propertyType} />, []);
  const displayOwnerIcon = propertyType === 'LB' || propertyType === 'LS';
  const ownerIcon = useMemo(
    () => (displayOwnerIcon ? <OwnerFromLandTriggerIcon /> : null),
    [displayOwnerIcon],
  );

  const buildingFields = useMemo<FormField[]>(
    () =>
      buildingInfoField.map(field => {
        if (field.name === 'propertyName' && fillIcon) return { ...field, rightIcon: fillIcon };
        if (field.name === 'ownerNameBuilding' && ownerIcon)
          return { ...field, rightIcon: ownerIcon };
        return field;
      }),
    [fillIcon, ownerIcon],
  );
  return (
    <div className="cas-section-grid grid grid-cols-1 xl:grid-cols-5 gap-6">
      <SectionRow title="Building Information" icon="building">
        <FormFields fields={buildingFields} />
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
