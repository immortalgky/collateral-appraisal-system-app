import { describe, expect, it } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { render, screen, userEvent } from '@/test/test-utils';
import { FormReadOnlyContext } from '../form/context';
import CheckboxGroup from './CheckboxGroup';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
];

function Harness({ readOnly = false }: { readOnly?: boolean }) {
  const methods = useForm({ defaultValues: { picks: [] as string[] } });
  return (
    <FormProvider {...methods}>
      <FormReadOnlyContext.Provider value={readOnly}>
        <CheckboxGroup name="picks" label="Picks" options={options} />
      </FormReadOnlyContext.Provider>
    </FormProvider>
  );
}

const clearButton = () => screen.queryByRole('button', { name: /\(\d+\)$/ });

describe('CheckboxGroup clear button', () => {
  it('is hidden until two options are selected', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(clearButton()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(clearButton()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Bravo' }));
    expect(clearButton()).toBeInTheDocument();
  });

  it('closes the chip row as its last item, with a short visible label', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    await user.click(screen.getByRole('button', { name: 'Bravo' }));
    const clear = clearButton()!;
    const row = screen.getByRole('group');
    expect(row.lastElementChild).toBe(clear);
    expect(clear).toHaveTextContent(/\(2\)/);
    expect(clear.getAttribute('aria-label')).toMatch(/clearAll/i);
    // Not chip-shaped: no border, no fill.
    expect(clear.className).not.toMatch(/\bborder\b|\bbg-/);
  });

  it('clears every selection when clicked', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    await user.click(screen.getByRole('button', { name: 'Bravo' }));
    await user.click(clearButton()!);
    expect(clearButton()).toBeNull();
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-pressed', 'false');
  });
});
