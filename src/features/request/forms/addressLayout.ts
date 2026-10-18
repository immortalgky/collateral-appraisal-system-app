import type { FormField } from '@/shared/components/form';

/**
 * The configs lay an address out across a full row of six columns. Beside the other address in the
 * editor each one has half the width, so its fields take wider shares of the same six columns.
 * Keyed by the last part of the name; a field not listed keeps its own span.
 */
const SPAN: Record<string, string> = {
  houseNumber: 'col-span-3',
  projectName: 'col-span-3',
  moo: 'col-span-2',
  soi: 'col-span-4',
  road: 'col-span-6',
  subDistrict: 'col-span-6',
  districtName: 'col-span-3',
  provinceName: 'col-span-3',
};

export const halfWidthAddressFields = (fields: FormField[]): FormField[] =>
  fields.map(field => ({
    ...field,
    wrapperClassName: SPAN[field.name.split('.').pop() ?? ''] ?? field.wrapperClassName,
  }));
