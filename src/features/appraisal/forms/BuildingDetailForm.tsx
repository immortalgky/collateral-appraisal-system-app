import {
  flowGroup,
  PART_WIDTH,
  FormFields,
  FormSection,
  FormSheet,
  type FormField,
  type FormFieldItem,
} from '@/shared/components/form';
import SurfaceTable from '../components/tables/SurfaceTable';
import { BuildingDetail } from '../components/tables/BuildingDetail';
import BuildingSizeField from '../components/BuildingSizeField';
import { useContext, useMemo } from 'react';
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
  buildingSizeField,
  buildingMaintenanceField,
  doorWindowField,
  buildingServicesField,
  remarkBuildingField,
} from '../configs/fields';
import { PropertyNameTriggerIcon, type PropertyType } from '../components/PropertyNameTriggerIcon';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FieldLabels } from '../components/FieldLabels';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';

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

  // The name is drawn in the page header when the shell has one (see PropertyNameInHeaderContext).
  const nameInHeader = useContext(PropertyNameInHeaderContext);

  // The property-name and owner fields carry trigger icons that depend on the property type.
  const { identity, legal } = useMemo(() => {
    const withIcons = (fields: FormField[]) =>
      fields.map(field => {
        if (field.name === 'propertyName' && fillIcon) return { ...field, rightIcon: fillIcon };
        if (field.name === 'ownerNameBuilding' && ownerIcon)
          return { ...field, rightIcon: ownerIcon };
        return field;
      });
    return {
      identity: withIcons(
        nameInHeader ? identityFields.filter(f => f.name !== 'propertyName') : identityFields,
      ),
      legal: withIcons(legalFields),
    };
  }, [fillIcon, ownerIcon, nameInHeader]);

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
          <FormFields fields={typeFields} />
          {/* The size (width × length) sits beside the floors, as the report prints them. */}
          <BuildingSizeField />
          <FormFields fields={useFields} />
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
          <FormFields fields={areaCostFields} />
        </FormSection>

        <FormSection title={t('forms.building.groups.limitations')} icon="triangle-exclamation">
          <FormFields fields={encroachmentItems} />
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
    ...buildingSizeField,
    ...buildingMaintenanceField,
    ...doorWindowField,
    ...buildingServicesField,
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
  // The name (only drawn when the page header has none, e.g. Data Correction) takes the first row.
  ['propertyName', 'col-span-12'],
  // The building's own identity first: the building number and the model, a row of two (6 + 6).
  ['buildingNumber', 'col-span-6'],
  ['modelName', 'col-span-6'],
  // The house number, with the chips for its status (none, unclear…): one row split in half (6 + 6),
  // so the chips stay beside the number they qualify.
  ['houseNumber', 'col-span-6'],
  ['houseNumberStatus', 'col-span-6'],
  // The title deed it stands on, alone on the last row at full width.
  ['builtOnTitleNumber', 'col-span-12'],
);

// Encroachment on others' land: the toggle with its area beside it (a number-field width, not the
// rest of the row; the area shows only for "Yes"), then the remark on the row below.
const encroachmentItems: FormFieldItem[] = [
  flowGroup(pick('isEncroachingOthers', 'encroachingOthersArea'), [], {
    encroachingOthersArea: PART_WIDTH.quarter,
  }),
  ...pick('encroachingOthersRemark'),
];

// Whether the building is valued (required): the last row of the area and cost section, under its
// table and cost summary. The toggle keeps its width; while it is Exclude, the reason is asked right
// under it. It drives no calculation here.
const areaCostFields = pick(['isAppraisable', 'col-span-4', 4], 'notAppraisableReason');

const legalFields = pick(
  ['isOwnerVerifiedBuilding', 'col-span-3'],
  ['ownerNameBuilding', 'col-span-9'],
  // The construction licence number and its expiry date, after the owner they are held by: a row
  // of their own (8 + 4), half and half when narrow.
  ['constructionLicenseNumber', 'col-span-8', 6],
  ['constructionLicenseExpirationDate', 'col-span-4', 6],
  'obligationType',
  'mortgageDetails',
  'obligationDetails',
);

// The type, then one row of floors (3), the usable area (4) and, drawn right after this list, the
// size (BuildingSizeField, 5). The floors and the area are in one list, so Compact can pair them.
const typeFields = pick(
  'buildingType',
  'buildingTypeOther',
  ['numberOfFloors', 'col-span-3'],
  ['totalBuildingArea', 'col-span-4'],
);

// After the size: how the area is divided (moved here from the identity group, as the report prints
// them together), then how it is built and used, each a row of its own.
const useFields = pick(
  'spaceDivision',
  ['constructionType', 'col-span-12'],
  'constructionTypeOther',
  ['utilizationType', 'col-span-12'],
  'utilizationTypeOther',
  // Whether it can be lived in (3) and, beside it, the reason (9).
  ['isResidential', 'col-span-3'],
  ['residentialRemark', 'col-span-9'],
);

const conditionFields = pick(
  // Whether it is under construction opens the group, on a row of its own with the toggle at its own
  // width (a full-row cell, so the age cannot join it). Picking the condition "under construction"
  // turns it on (`defaultWhen`). The age follows on its own row: a small number, a quarter of the
  // row, as on the condo form; the condition chips below keep their own row.
  ['isUnderConstruction', 'col-span-12'],
  ['buildingAge', 'col-span-3'],
  'buildingConditionType',
  'buildingConditionTypeOther',
  'maintenanceType',
  'maintenanceTypeOther',
  ['buildingMaterialType', 'col-span-12'],
  ['buildingStyleType', 'col-span-12'],
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
  // The ceiling follows the roof, as in the report (moved from the finishes).
  ['ceilingType', 'col-span-6'],
  'ceilingTypeOther',
);

const finishesFields = pick(
  ['interiorWallType', 'col-span-6'],
  'interiorWallTypeOther',
  ['exteriorWallType', 'col-span-6'],
  'exteriorWallTypeOther',
  ['doorType', 'col-span-6'],
  'doorTypeOther',
  ['windowType', 'col-span-6'],
  'windowTypeOther',
  'sanitaryType',
  'sanitaryTypeOther',
  'buildingSystemType',
  'buildingSystemTypeOther',
  ['fenceType', 'col-span-6'],
  'fenceTypeOther',
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
