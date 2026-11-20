import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { PropertyNameHeaderField } from './PropertyNameHeaderField';

const Harness = () => {
  const methods = useForm({
    defaultValues: { propertyName: 'Old name', titles: [{ titleNumber: '12345' }] },
  });
  return (
    <FormProvider {...methods}>
      <PropertyNameHeaderField propertyType="L" />
      <button
        type="button"
        onClick={() => methods.setError('propertyName', { message: 'Too long' })}
      >
        fail
      </button>
      <output data-testid="dirty">{String(methods.formState.isDirty)}</output>
      <output data-testid="value">{methods.watch('propertyName')}</output>
    </FormProvider>
  );
};

describe('PropertyNameHeaderField', () => {
  it('edits the propertyName form value and marks the form dirty', async () => {
    const { user } = render(<Harness />);
    const input = screen.getByLabelText('Property Name');
    expect(input).toHaveValue('Old name');
    await user.clear(input);
    await user.type(input, 'New name');
    expect(screen.getByTestId('value')).toHaveTextContent('New name');
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
  });

  it('keeps the fill icon, which derives the name from the titles', async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('button', { name: /fill/i }));
    expect(screen.getByTestId('value')).toHaveTextContent('12345');
  });

  it('shows a validation error under the input', async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'fail' }));
    expect(await screen.findByText('Too long')).toBeInTheDocument();
  });

  it('takes its length and label from the name field config of the property type', () => {
    const Building = () => {
      const methods = useForm({ defaultValues: { propertyName: 'B1' } });
      return (
        <FormProvider {...methods}>
          <PropertyNameHeaderField propertyType="B" />
        </FormProvider>
      );
    };
    render(<Building />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '150');
    expect(screen.getByLabelText(/Name/)).toBe(input);
  });
});
