import { describe, expect, it } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import { act, render } from '@/test/test-utils';
import { MissingFieldsProvider } from '@/shared/components/form/missing/MissingFieldsProvider';
import {
  useMissingReveal,
  type RevealApi,
} from '@/shared/components/form/missing/missingFieldsContext';
import { TemplatePopover } from './TemplatePopover';

// The template picker holds two required fields (collateral type, template) in a popover that is
// closed when a Save fails: the chip's "go to field" has to open it.
const capture: { api: RevealApi | null } = { api: null };

function GrabReveal() {
  capture.api = useMissingReveal();
  return null;
}

function Harness({ withCollateralType = true }: { withCollateralType?: boolean }) {
  const methods = useForm({ defaultValues: { collateralType: null, pricingTemplateCode: null } });
  return (
    <FormProvider {...methods}>
      <MissingFieldsProvider summary={null}>
        <GrabReveal />
        <TemplatePopover
          valueLabel=""
          onSelectCollateralType={withCollateralType ? () => {} : undefined}
          templateOptions={[]}
          onSelectTemplate={() => {}}
          onGenerate={() => {}}
          isReadOnly={false}
        />
      </MissingFieldsProvider>
    </FormProvider>
  );
}

const field = (path: string) => document.querySelector(`[data-field="${path}"]`);

describe('TemplatePopover and the missing-fields chip', () => {
  it('stands for both fields while closed', () => {
    const { container } = render(<Harness />);
    expect(
      container.querySelector('[data-field-aliases="collateralType pricingTemplateCode"]'),
    ).not.toBeNull();
    expect(field('collateralType')).toBeNull();
  });

  it.each(['collateralType', 'pricingTemplateCode'])('opens for %s', path => {
    render(<Harness />);
    act(() => capture.api?.reveal(path));
    expect(field('collateralType')).not.toBeNull();
    expect(field('pricingTemplateCode')).not.toBeNull();
  });

  it('ignores a path that is not its own', () => {
    render(<Harness />);
    act(() => capture.api?.reveal('somethingElse'));
    expect(field('pricingTemplateCode')).toBeNull();
  });

  it('owns only the template field when it has no collateral type select', () => {
    const { container } = render(<Harness withCollateralType={false} />);
    expect(container.querySelector('[data-field-aliases="pricingTemplateCode"]')).not.toBeNull();
    act(() => capture.api?.reveal('collateralType'));
    expect(field('pricingTemplateCode')).toBeNull();
  });
});
