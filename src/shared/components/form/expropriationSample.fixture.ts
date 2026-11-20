import type { FormField } from './types';

/**
 * Two toggles, a decree opened by either of them (an OR) and a remark for each: the shape the land
 * form's expropriation fields once had. The forms no longer ask the first toggle, but these tests
 * (`FlowGroup`, `BooleanChips`) cover the generic mechanisms the shape exercises, so they keep their
 * own copy instead of reading the product configs.
 */
export const expropriateField: FormField[] = [
  {
    type: 'boolean-toggle',
    name: 'isExpropriated',
    label: 'Is Expropriate',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
  },
  {
    type: 'textarea',
    label: 'Is Expropriated',
    name: 'expropriationRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isExpropriated', is: true },
    requiredWhen: { field: 'isExpropriated', is: true },
    maxLength: 4000,
    showCharCount: true,
  },
  {
    type: 'boolean-toggle',
    name: 'isInExpropriationLine',
    label: 'In Line Expropriate',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
  },
  {
    type: 'textarea',
    label: 'Is In Line Expropriate',
    name: 'expropriationLineRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isInExpropriationLine', is: true },
    requiredWhen: { field: 'isInExpropriationLine', is: true },
    maxLength: 4000,
    showCharCount: true,
  },
  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-12',
    showWhen: {
      match: 'any',
      conditions: [
        { field: 'isExpropriated', is: true },
        { field: 'isInExpropriationLine', is: true },
      ],
    },
    maxLength: 200,
  },
];
