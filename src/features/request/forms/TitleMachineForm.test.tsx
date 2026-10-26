import { describe, expect, it } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '@/test/test-utils';
import { requestTitleDefault } from '../schemas/form';
import TitleMachineForm from './TitleMachineForm';

function Harness() {
  const methods = useForm({
    defaultValues: { titles: [{ ...structuredClone(requestTitleDefault), collateralType: '11' }] },
  });
  return (
    <FormProvider {...methods}>
      <TitleMachineForm index={0} />
    </FormProvider>
  );
}

describe('TitleMachineForm', () => {
  it('shows the number of machines as an empty box with a grey 0 placeholder', () => {
    const { container } = render(<Harness />);
    const input = container.querySelector<HTMLInputElement>('input[name="numberOfMachine"]');
    expect(input).not.toBeNull();
    expect(input!.value).toBe('');
    expect(input!.placeholder).toBe('0');
  });
});
