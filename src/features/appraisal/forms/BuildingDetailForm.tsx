import { FormFields, FormSection, FormSheet, type FormField } from '@/shared/components/form';
import SurfaceTable from '../components/tables/SurfaceTable';
import { BuildingDetail } from '../components/tables/BuildingDetail';
import { useMemo } from 'react';
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
      className="pointer-events-auto p-1 -m-1 text-(--palette-ink-2) hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary-500/50"
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
  const { t } = useTranslation('appraisal');
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
      <FormSheet>
        <FormSection title={t('forms.building.groups.identification')} icon="building">
          <FormFields fields={identity} />
        </FormSection>

        <FormSection title={t('forms.building.groups.ownership')} icon="scale-balanced">
          <FormFields fields={legal} />
        </FormSection>

        <FormSection title={t('forms.building.groups.typeUse')} icon="list">
          <FormFields fields={typeAndUseFields} />
        </FormSection>

        <FormSection title={t('forms.building.groups.condition')} icon="gauge">
          <FormFields fields={conditionFields} />
        </FormSection>

        <FormSection title={t('forms.building.groups.structure')} icon="warehouse">
          <FormFields fields={structureFields} />
        </FormSection>

        <FormSection title={t('forms.building.groups.finishes')} icon="paint-roller">
          <FormFields fields={finishesFields} />
        </FormSection>

        <FormSection title={t('forms.building.groups.floors')} icon="layer-group">
          {/* Alone in its section, so no second title under the section header. */}
          <SurfaceTable headers={surfaceTableHeader} name={'surfaces'} showTitle={false} />
        </FormSection>

        <FormSection title={t('forms.building.groups.areaCost')} icon="table">
          <div className="col-span-12">
            <BuildingDetail
              name={prefix != null ? `${prefix}.depreciationDetails` : 'depreciationDetails'}
              showCostSummary
            />
          </div>
        </FormSection>

        <FormSection title={t('forms.building.groups.limitations')} icon="triangle-exclamation">
          <FormFields fields={limitationFields} />
        </FormSection>

        <FormSection title={t('forms.building.groups.remark')} icon="comment">
          <FormFields fields={remarkBuildingField} />
        </FormSection>
      </FormSheet>
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
    ...encroachmentField,
  ].map(field => [field.name, field]),
);

const pick = (
  ...entries: (string | [name: string, span: string, narrowSpan?: 3 | 4 | 6 | 12])[]
): FormField[] =>
  entries.map(entry => {
    const [name, span, narrowSpan] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    // Fail loudly: a renamed config field would otherwise just vanish from the form.
    if (!field) throw new Error(`BuildingDetailForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim(), narrowSpan };
  });

const identityFields = pick(
  // Name, house number and its "none" chips make one row (4 + 4 + 4). Narrow: the name takes a row
  // and the house number keeps its chips beside it (6 + 6).
  ['propertyName', 'col-span-4', 12],
  ['houseNumber', 'col-span-4'],
  ['noHouseNumber', 'col-span-4'],
  ['buildingNumber', 'col-span-4'],
  ['modelName', 'col-span-4'],
  ['builtOnTitleNumber', 'col-span-4'],
  // The building's size at a glance: its age, floors and area close the identity section.
  ['buildingAge', 'col-span-4'],
  ['numberOfFloors', 'col-span-4'],
  ['totalBuildingArea', 'col-span-4'],
);

const legalFields = pick(
  ['isOwnerVerifiedBuilding', 'col-span-4'],
  ['ownerNameBuilding', 'col-span-8'],
  'hasObligation',
  'obligationDetails',
  // Required; a row of its own, after the obligation chips and their details.
  ['isAppraisable', 'col-span-3'],
);

const typeAndUseFields = pick(
  'buildingType',
  'buildingTypeOther',
  ['constructionType', 'col-span-4'],
  'constructionTypeOther',
  ['utilizationType', 'col-span-8'],
  'utilizationTypeOther',
  ['isResidential', 'col-span-4'],
  ['residentialRemark', 'col-span-8'],
);

const conditionFields = pick(
  'buildingConditionType',
  'buildingConditionTypeOther',
  // The construction toggle and its licence expiry share a row; narrow: the toggle first, the date under it.
  ['isUnderConstruction', 'col-span-4', 12],
  ['constructionLicenseExpirationDate', 'col-span-4'],
  ['buildingMaterialType', 'col-span-6'],
  ['buildingStyleType', 'col-span-6'],
  'buildingStyleTypeOther',
  'decorationType',
  'decorationTypeOther',
);

const structureFields = pick(
  ['constructionStyleType', 'col-span-4'],
  ['structureType', 'col-span-8'],
  'structureTypeOther',
  ['roofFrameType', 'col-span-6'],
  'roofFrameTypeOther',
  ['roofType', 'col-span-6'],
  'roofTypeOther',
);

const finishesFields = pick(
  ['ceilingType', 'col-span-6'],
  'ceilingTypeOther',
  ['interiorWallType', 'col-span-6'],
  'interiorWallTypeOther',
  ['exteriorWallType', 'col-span-6'],
  'exteriorWallTypeOther',
  ['fenceType', 'col-span-6'],
  'fenceTypeOther',
);

const limitationFields = pick(
  ['isEncroachingOthers', 'col-span-4'],
  ['encroachingOthersArea', 'col-span-4'],
  'encroachingOthersRemark',
);

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
