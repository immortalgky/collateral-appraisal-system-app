import type { TFunction } from 'i18next';
import type { FormTableColumn, FormTableRegularColumn } from '../components/tables/FormTable';
import { mapBuildingType, NO_BUILDING_PROPERTY_TYPES } from '../data/mapCollateral';

/**
 * The columns of the customers and properties tables, in one place: the forms draw them, and the
 * schema, the payload and the submit counts read the same names to tell an untouched row from a filled
 * one. A column is added or renamed here and nowhere else.
 */
type ColumnSpec = Omit<FormTableRegularColumn, 'label'>;

const CUSTOMER_SPECS: ColumnSpec[] = [
  { name: 'name', maxLength: 260 },
  { name: 'contactNumber', maxLength: 20, width: '13.5714rem' },
];

const PROPERTY_SPECS: ColumnSpec[] = [
  { name: 'propertyType', inputType: 'dropdown', group: 'PropertyType', width: 'minmax(0,1.2fr)' },
  {
    name: 'buildingType',
    inputType: 'dropdown',
    group: 'BuildingType',
    otherField: true,
    otherFieldName: 'buildingTypeOther',
    otherTriggerValue: '99',
    maxLength: 100,
    width: 'minmax(0,1.2fr)',
    filterOptions: { type: 'dynamic', field: 'propertyType', map: mapBuildingType },
    disableWhen: { field: 'propertyType', is: NO_BUILDING_PROPERTY_TYPES, operator: 'in' },
  },
  {
    name: 'sellingPrice',
    inputType: 'number',
    width: '12.8571rem',
    align: 'right',
    maxIntegerDigits: 15,
    decimalPlaces: 2,
  },
];

/** The columns by name only (labels are for display): what `isBlankRow` reads. */
const named = (specs: ColumnSpec[]): FormTableColumn[] =>
  specs.map(spec => ({ ...spec, label: spec.name }));
export const CUSTOMER_COLUMNS = named(CUSTOMER_SPECS);
export const PROPERTY_COLUMNS = named(PROPERTY_SPECS);

type Text = Record<string, { label: string; placeholder?: string }>;
const withText = (specs: ColumnSpec[], text: Text): FormTableColumn[] =>
  specs.map(spec => ({ ...spec, ...text[spec.name] }) as FormTableRegularColumn);

export const makeCustomerColumns = (t: TFunction<'request'>): FormTableColumn[] =>
  withText(CUSTOMER_SPECS, {
    name: {
      label: t('fields.customerName'),
      placeholder: t('requestForm.customerNamePlaceholder'),
    },
    contactNumber: {
      label: t('fields.contactNumber'),
      placeholder: t('requestForm.customerPhonePlaceholder'),
    },
  });

export const makePropertyColumns = (t: TFunction<'request'>): FormTableColumn[] =>
  withText(PROPERTY_SPECS, {
    propertyType: { label: t('fields.propertyType') },
    buildingType: { label: t('fields.buildingType') },
    sellingPrice: { label: t('fields.sellingPrice') },
  });
