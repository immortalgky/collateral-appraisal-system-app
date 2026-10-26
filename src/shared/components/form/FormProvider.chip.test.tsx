import { describe, expect, it, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionBar from '@/shared/components/ActionBar';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { FormFieldShell } from './FormFieldShell';
import { FormProvider } from './FormProvider';
import { FormSection } from './FormSheet';

const tr = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}${JSON.stringify(options)}` : key,
}));
vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: tr.t }),
}));

const schema = z.object({ name: z.string().min(1, 'Name is required') });
type Values = z.infer<typeof schema>;

function Harness({
  missingSummary,
  onSubmit = () => {},
}: {
  missingSummary?: boolean;
  onSubmit?: (values: Values) => void;
}) {
  const methods = useForm<Values>({ defaultValues: { name: '' }, resolver: zodResolver(schema) });
  return (
    <FormProvider methods={methods} schema={schema} missingSummary={missingSummary}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <FormSection id="info" title="Information">
          <FormFieldShell name="name" label="ชื่อ" labelFor="name-input" required>
            <input id="name-input" {...methods.register('name')} />
          </FormFieldShell>
        </FormSection>
        <ActionBar>
          <ActionBar.Left>
            <span>left</span>
          </ActionBar.Left>
          <ActionBar.Right>
            <button type="submit">Save</button>
          </ActionBar.Right>
        </ActionBar>
      </form>
    </FormProvider>
  );
}

describe('FormProvider missing-fields chip', () => {
  it('puts the chip first in the action bar, left of Save', async () => {
    render(<Harness />);
    const bar = screen.getByRole('toolbar');
    const chip = await within(bar).findByRole('button', { name: /missing\.chip/ });
    expect(chip).toHaveTextContent('missing.chip{"count":1}');
    expect(
      within(bar)
        .getAllByRole('button')
        .map(b => b.textContent),
    ).toEqual([chip.textContent, 'Save']);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the popover on a failed Save, with no banner above the form', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByRole('button', { name: /missing\.chip/ });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Information');
    expect(dialog).toHaveTextContent('ชื่อ');
    expect(screen.queryByText(/Please fix the following errors/)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('stays closed when Save goes through', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(document.getElementById('name-input') as HTMLInputElement, 'x');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
    // and the chip turns into the complete pill once the 300 ms check has run
    expect(await screen.findByText('missing.complete')).toBeInTheDocument();
  });

  it('has no chip on a read-only form', () => {
    render(
      <PageReadOnlyContext.Provider value>
        <Harness />
      </PageReadOnlyContext.Provider>,
    );
    expect(screen.queryByText(/missing\./)).toBeNull();
  });

  it('runs no summary of its own when the page supplies one', async () => {
    const user = userEvent.setup();
    render(<Harness missingSummary={false} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByText(/missing\./)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
