import { describe, expect, it } from 'vitest';
import type { FormField } from '@/shared/components/form';
import { documentValidationToggle } from './documentValidationToggle';

const source = {
  type: 'dropdown',
  label: 'Document check',
  name: 'documentValidationResultType',
  group: 'DocumentValidation',
  required: true,
  wrapperClassName: 'col-span-12',
  showWhen: { field: 'other', is: true },
  requiredWhen: { field: 'other', is: true },
  orientation: 'horizontal',
  variant: 'button',
  help: { title: 'Why', body: 'Because' },
} as unknown as FormField;

describe('documentValidationToggle', () => {
  const toggle = documentValidationToggle(source, key => key) as unknown as Record<string, unknown>;

  it('is a two-sided toggle on the parameter codes, inconsistent first, with no default value', () => {
    expect(toggle.type).toBe('string-toggle');
    expect(toggle.options).toEqual([
      { name: '02', label: 'toggle.Inconsistent' },
      { name: '01', label: 'toggle.Consistent' },
    ]);
    // Required, so not clearable: a click on the chosen side must not empty the answer.
    expect(toggle.nullable).toBeUndefined();
    expect(toggle.showUnset).toBe(true);
    expect(toggle).not.toHaveProperty('defaultValue');
  });

  it('keeps everything else the field already says', () => {
    expect(toggle).toMatchObject({
      label: 'Document check',
      name: 'documentValidationResultType',
      required: true,
      wrapperClassName: 'col-span-12',
      showWhen: { field: 'other', is: true },
      requiredWhen: { field: 'other', is: true },
      help: { title: 'Why', body: 'Because' },
    });
  });

  it('drops the dropdown-only group, orientation and variant, so no parameter query runs', () => {
    expect(toggle).not.toHaveProperty('group');
    expect(toggle).not.toHaveProperty('orientation');
    expect(toggle).not.toHaveProperty('variant');
  });
});
