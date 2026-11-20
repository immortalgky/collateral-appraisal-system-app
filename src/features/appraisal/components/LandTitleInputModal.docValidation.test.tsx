import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, within } from '@/test/test-utils';
import { landtitlesFields } from '../configs/fields';
import LandTitleModal from './LandTitleInputModal';

/** The land title's "document validation result" is the same two-sided toggle as the condo form's. */

// The dialog renders inside the property page's own form, whose title address it shows on the paper.
const Page = ({ values }: { values?: Record<string, unknown> }) => {
  const methods = useForm();
  return (
    <FormProvider {...methods}>
      <LandTitleModal
        fields={landtitlesFields}
        defaultValues={values && { titleType: 'DEED', ...values }}
        onCancel={() => {}}
        onSave={vi.fn()}
      />
    </FormProvider>
  );
};
const open = (values: Record<string, unknown>) => render(<Page values={values} />);

const toggle = () =>
  document.querySelector<HTMLElement>('[data-field="documentValidationResultType"]')!;

describe('land title: document validation result', () => {
  it('is a two-sided toggle, inconsistent on the left and consistent on the right', () => {
    open({ documentValidationResultType: '01' });
    const options = within(toggle()).getAllByRole('radio');
    expect(options.map(o => o.textContent)).toEqual(['Inconsistent', 'Consistent']);
    expect(options[1]).toHaveAttribute('aria-checked', 'true');
  });

  it('shows a stored 02 on the left, and a click writes the parameter codes', async () => {
    const { user } = open({ documentValidationResultType: '02' });
    const [left, right] = within(toggle()).getAllByRole('radio');
    expect(left).toHaveAttribute('aria-checked', 'true');
    await user.click(right);
    expect(right).toHaveAttribute('aria-checked', 'true');
  });

  it('opens a new title with consistent (01) checked on the right, as the condo form does', () => {
    render(<Page />);
    const options = within(toggle()).getAllByRole('radio');
    expect(options[1]).toHaveTextContent('Consistent');
    expect(options[1]).toHaveAttribute('aria-checked', 'true');
    expect(options[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('leaves a saved title with its own value', () => {
    open({ documentValidationResultType: '02' });
    const options = within(toggle()).getAllByRole('radio');
    expect(options[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('is still required', () => {
    open({});
    expect(within(toggle()).getByText('*')).toBeInTheDocument();
  });
});
