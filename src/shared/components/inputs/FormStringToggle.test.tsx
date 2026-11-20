import { describe, expect, it } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import FormStringToggle from './FormStringToggle';

const options: [{ name: string; label: string }, { name: string; label: string }] = [
  { name: '02', label: 'Inconsistent' },
  { name: '01', label: 'Consistent' },
];

let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
const Harness = ({ value, showUnset }: { value: unknown; showUnset?: boolean }) => {
  methods = useForm<Record<string, unknown>>({ defaultValues: { result: value } });
  return (
    <FormProvider {...methods}>
      <FormStringToggle name="result" options={options} showUnset={showUnset} />
    </FormProvider>
  );
};
const radios = () => screen.getAllByRole('radio');

describe('string toggle', () => {
  it('chooses neither side while the value is null, and either click sets it', async () => {
    const { user } = render(<Harness value={null} showUnset />);
    expect(radios().map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'false']);
    await user.click(screen.getByRole('radio', { name: 'Inconsistent' }));
    expect(methods.getValues('result')).toBe('02');
    await user.click(screen.getByRole('radio', { name: 'Consistent' }));
    expect(methods.getValues('result')).toBe('01');
  });

  it('chooses neither side for a code it does not know', async () => {
    const { user } = render(<Harness value="77" showUnset />);
    expect(radios().map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'false']);
    await user.click(screen.getByRole('radio', { name: 'Consistent' }));
    expect(methods.getValues('result')).toBe('01');
  });

  it('does not clear the chosen side on a second click', async () => {
    const { user } = render(<Harness value="01" showUnset />);
    await user.click(screen.getByRole('radio', { name: 'Consistent' }));
    expect(methods.getValues('result')).toBe('01');
  });

  it('chooses nothing while a parameter group is not loaded, and a click writes nothing', async () => {
    const Params = () => {
      methods = useForm<Record<string, unknown>>({ defaultValues: { result: '' } });
      return (
        <FormProvider {...methods}>
          <FormStringToggle name="result" group="NoSuchGroup" showUnset />
        </FormProvider>
      );
    };
    const { user } = render(<Params />);
    expect(radios().map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'false']);
    // A click has nothing to write yet: the value stays as it was, never a blank code.
    await user.click(radios()[0]);
    await user.click(radios()[1]);
    expect(methods.getValues('result')).toBe('');
  });

  it('renders as it always did without showUnset: an unset value shows the first side', () => {
    render(<Harness value={null} />);
    expect(radios().map(r => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });
});
