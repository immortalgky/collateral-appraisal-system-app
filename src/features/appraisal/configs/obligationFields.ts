import type { FieldConditions, FormField } from '@/shared/components/form';

/** The Obligation parameter codes that need free text beyond the mortgage: lease, usufruct, superficies, easement (06), other. */
const OTHER_OBLIGATION_CODES = ['03', '04', '05', '06', '99'];

const hasOtherObligation: FieldConditions = {
  match: 'any',
  conditions: OTHER_OBLIGATION_CODES.map(is => ({
    field: 'obligationType',
    is,
    operator: 'contains' as const,
  })),
};

/**
 * Encumbrances on a property: the picked kinds (several allowed, "no obligation" alone), then the
 * mortgage details when mortgaged and the free-text details for any other kind. Shared by the
 * land, building, condo, project land and tower forms.
 */
export const obligationFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Obligation',
    name: 'obligationType',
    orientation: 'horizontal',
    group: 'Obligation',
    exclusiveValues: ['01'],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'textarea',
    label: 'Mortgage Details',
    name: 'mortgageDetails',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'obligationType', is: '02', operator: 'contains' },
    requiredWhen: { field: 'obligationType', is: '02', operator: 'contains' },
    maxLength: 500,
  },
  {
    type: 'textarea',
    label: 'Other Obligation Details',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    showWhen: hasOtherObligation,
    requiredWhen: hasOtherObligation,
    maxLength: 500,
  },
];
