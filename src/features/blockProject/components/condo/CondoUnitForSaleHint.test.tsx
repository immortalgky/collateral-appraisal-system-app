import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { CondoUnitForSaleHint } from './CondoUnitForSaleHint';

vi.mock('./useCondoRollup', () => ({ useCondoRollup: () => ({ units: 1414 }) }));

/** A form whose saved Unit For Sale is `saved`, plus a button that stands in for typing 1000. */
const Harness = ({ saved, readOnly = false }: { saved: number; readOnly?: boolean }) => {
  const methods = useForm({ defaultValues: { unitForSaleCount: saved } });
  const { isDirty, dirtyFields } = methods.formState;
  return (
    <PageReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        <button
          type="button"
          onClick={() => methods.setValue('unitForSaleCount', 1000, { shouldDirty: true })}
        >
          type 1000
        </button>
        <output data-testid="dirty">
          {isDirty ? 'dirty' : 'clean'}:{Object.keys(dirtyFields).join(',')}
        </output>
        <CondoUnitForSaleHint />
      </FormProvider>
    </PageReadOnlyContext.Provider>
  );
};

describe('CondoUnitForSaleHint', () => {
  it('"Use this value" back to the saved figure leaves the form clean', async () => {
    const { user } = render(<Harness saved={1414} />);
    expect(screen.queryByRole('button', { name: 'Use this value' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'type 1000' }));
    expect(screen.getByTestId('dirty')).toHaveTextContent('dirty:unitForSaleCount');

    await user.click(screen.getByRole('button', { name: 'Use this value' }));
    expect(screen.getByTestId('dirty')).toHaveTextContent(/^clean:$/);
  });

  it('"Use this value" with a count that differs from the saved figure is a real edit', async () => {
    const { user } = render(<Harness saved={1404} />);
    await user.click(screen.getByRole('button', { name: 'Use this value' }));
    expect(screen.getByTestId('dirty')).toHaveTextContent('dirty:unitForSaleCount');
  });

  it('offers no button on a read-only page', () => {
    render(<Harness saved={1404} readOnly />);
    expect(screen.queryByRole('button', { name: 'Use this value' })).toBeNull();
  });
});
