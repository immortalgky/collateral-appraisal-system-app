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
import { FieldLabels } from '../components/FieldLabels';

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
    {!isLast && <div className="cas-section-rule h-px bg-gray-200 col-span-full xl:col-span-5" />}
  </>
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

  // The property-name and owner fields carry trigger icons that depend on the property type.
  const { identity, legal } = useMemo(() => {
    const withIcons = (fields: FormField[]) =>
      fields.map(field => {
        if (field.name === 'propertyName' && fillIcon) return { ...field, rightIcon: fillIcon };
        if (field.name === 'ownerNameBuilding' && ownerIcon)
          return { ...field, rightIcon: ownerIcon };
        return field;
      });
    return { identity: withIcons(identityFields), legal: withIcons(legalFields) };
  }, [fillIcon, ownerIcon]);

  return (
    <FieldLabels scope="building">
      <div className="cas-section-grid cas-sheet grid grid-cols-1 xl:grid-cols-5 gap-6">
        <SectionRow title="Identification" icon="building">
          <FormFields fields={identity} />
        </SectionRow>

        <SectionRow title="Ownership & Legal" icon="scale-balanced">
          <FormFields fields={legal} />
        </SectionRow>

        <SectionRow title="Type & Use" icon="list">
          <FormFields fields={typeAndUseFields} />
        </SectionRow>

        <SectionRow title="Condition & Quality" icon="gauge">
          <FormFields fields={conditionFields} />
        </SectionRow>

        <SectionRow title="Structure" icon="warehouse">
          <FormFields fields={structureFields} />
        </SectionRow>

        <SectionRow title="Finishes & Enclosure" icon="paint-roller">
          <FormFields fields={finishesFields} />
        </SectionRow>

        <SectionRow title="Floors" icon="layer-group">
          <FormFields fields={floorFields} />
          <SurfaceTable headers={surfaceTableHeader} name={'surfaces'} />
        </SectionRow>

        <SectionRow title="Area & Cost" icon="table">
          <FormFields fields={areaFields} />
          <div className="col-span-12">
            <BuildingDetail
              name={prefix != null ? `${prefix}.depreciationDetails` : 'depreciationDetails'}
              showCostSummary
            />
          </div>
        </SectionRow>

        <SectionRow title="Limitations" icon="triangle-exclamation">
          <FormFields fields={encroachmentField} />
        </SectionRow>

        <SectionRow title="Remark" icon="comment" isLast>
          <FormFields fields={remarkBuildingField} />
        </SectionRow>
      </div>
    </FieldLabels>
  );
};

/*
 * The screen's field order, grouped the way an appraiser collects it on site. The field configs in
 * configs/fields.ts stay as they are — the Block model form and the schema read them too — and are
 * picked by name here. A span given here replaces the config's own col-span for this screen only.
 */
const byName = new Map(
  [
    ...buildingInfoField,
    ...buildingTypeField,
    ...decorationField,
    ...buildingMaterialField,
    ...buildingStyleField,
    ...isResidentialField,
    ...constructionStyleField,
    ...generalStructureField,
    ...roofFrameField,
    ...roofField,
    ...ceilingField,
    ...interiorWallFields,
    ...exteriorWallFields,
    ...fenceField,
    ...constTypeFeild,
    ...utilizationFeild,
    ...buildingArea,
  ].map(field => [field.name, field]),
);

const pick = (...entries: (string | [name: string, span: string])[]): FormField[] =>
  entries.map(entry => {
    const [name, span] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    // Fail loudly: a renamed config field would otherwise just vanish from the form.
    if (!field) throw new Error(`BuildingDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim() };
  });

const identityFields = pick(
  ['houseNumber', 'col-span-4'],
  ['noHouseNumber', 'col-span-8'],
  'propertyName',
  ['buildingNumber', 'col-span-3'],
  ['modelName', 'col-span-3'],
  ['builtOnTitleNumber', 'col-span-6'],
);

const legalFields = pick(
  ['isOwnerVerifiedBuilding', 'col-span-4'],
  ['ownerNameBuilding', 'col-span-8'],
  'hasObligation',
  'obligationDetails',
  'isAppraisable',
);

const typeAndUseFields = pick(
  'buildingType',
  'buildingTypeOther',
  'constructionType',
  'constructionTypeOther',
  'utilizationType',
  'utilizationTypeOther',
  ['isResidential', 'col-span-12'],
  'residentialRemark',
);

const conditionFields = pick(
  'buildingConditionType',
  'buildingConditionTypeOther',
  ['buildingAge', 'col-span-3'],
  ['isUnderConstruction', 'col-span-3'],
  ['constructionLicenseExpirationDate', 'col-span-6'],
  'buildingMaterialType',
  'buildingStyleType',
  'buildingStyleTypeOther',
  'decorationType',
  'decorationTypeOther',
);

const structureFields = pick(
  'constructionStyleType',
  'structureType',
  'structureTypeOther',
  'roofFrameType',
  'roofFrameTypeOther',
  'roofType',
  'roofTypeOther',
);

const finishesFields = pick(
  'ceilingType',
  'ceilingTypeOther',
  'interiorWallType',
  'interiorWallTypeOther',
  'exteriorWallType',
  'exteriorWallTypeOther',
  'fenceType',
  'fenceTypeOther',
);

const floorFields = pick(['numberOfFloors', 'col-span-3']);

const areaFields = pick(['totalBuildingArea', 'col-span-3']);

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
