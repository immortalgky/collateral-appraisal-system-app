import { describe, expect, it, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionBar from '@/shared/components/ActionBar';
import { FormFieldShell } from '@/shared/components/form/FormFieldShell';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { FormSection } from '@/shared/components/form/FormSheet';
import { withReason } from '../utils/withReason';
import { PropertyTabs } from './PropertyTabs';

const tr = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}${JSON.stringify(options)}` : key,
}));
vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: tr.t }),
}));

// The property forms are not what is under test: two stand-ins that draw one field each, the way
// FormFields does (a `data-field` wrapper around a label), each in its own titled section.
vi.mock('@/features/appraisal/forms/LandDetailForm', () => ({
  default: () => (
    <section id="land-stub" aria-labelledby="land-stub-title">
      <h3 id="land-stub-title">Land</h3>
      <div data-field="landName">
        <label htmlFor="land-name">Land name</label>
        <input id="land-name" />
      </div>
    </section>
  ),
}));
vi.mock('@/features/appraisal/forms/BuildingDetailForm', () => ({
  default: () => (
    <section id="building-stub" aria-labelledby="building-stub-title">
      <h3 id="building-stub-title">Building</h3>
      <div data-field="buildingName">
        <label htmlFor="building-name">Building name</label>
        <input id="building-name" />
      </div>
    </section>
  ),
}));
vi.mock('@/features/appraisal/forms/TitleDeedForm', () => ({ default: () => null }));
vi.mock('@/features/appraisal/forms/CondoDetailForm', () => ({ default: () => null }));
vi.mock('@/features/appraisal/forms/LeaseAgreementForm', () => ({ default: () => null }));
vi.mock('@/features/appraisal/forms/MachineryDetailForm', () => ({ default: () => null }));
vi.mock('@/features/appraisal/forms/RentalInfoForm', () => ({ default: () => null }));
vi.mock('@/features/appraisal/components/construction/ConstructionEditorSection', () => ({
  ConstructionEditorSection: () => null,
}));

const schema = withReason(
  z.object({
    landName: z.string().min(1, 'Land name is required'),
    buildingName: z.string().min(1, 'Building name is required'),
  }),
  'Reason is required',
);

function Harness() {
  const methods = useForm({
    defaultValues: { landName: '', buildingName: '', reason: '' },
    resolver: zodResolver(schema),
  });
  return (
    <FormProvider methods={methods} schema={schema}>
      <form onSubmit={methods.handleSubmit(() => {})}>
        <PropertyTabs
          layout={{ panels: ['land', 'building'] }}
          context={{
            propertyId: 'p1',
            ciMode: false,
            onSelectProperty: () => {},
            trail: (
              <FormSection id="reason" title="Reason section">
                <FormFieldShell name="reason" label="Reason" labelFor="reason-input" required>
                  <textarea id="reason-input" {...methods.register('reason')} />
                </FormFieldShell>
              </FormSection>
            ),
          }}
        />
        <ActionBar>
          <ActionBar.Right>
            <button type="submit">Submit</button>
          </ActionBar.Right>
        </ActionBar>
      </form>
    </FormProvider>
  );
}

describe('Data Correction missing-fields chip', () => {
  it('lists the reason with the other missing fields, under its own section', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const chip = await screen.findByRole('button', { name: /missing\.chip/ });
    expect(chip).toHaveTextContent('missing.chip{"count":3}');

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Reason section')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Reason/ })).toBeInTheDocument();
  });

  it('counts the reason once it is typed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByRole('button', { name: /missing\.chip/ });

    await user.type(document.getElementById('reason-input') as HTMLTextAreaElement, 'typo');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /missing\.chip/ })).toHaveTextContent(
        'missing.chip{"count":2}',
      ),
    );
  });

  it('opens the tab a missing field sits on before jumping to it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const buildingTab = await screen.findByRole('tab', { name: /createPage\.navBuilding/ });
    expect(buildingTab).toHaveAttribute('aria-selected', 'false');

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Building name/ }));

    await waitFor(() => expect(buildingTab).toHaveAttribute('aria-selected', 'true'));
  });

  it('does not switch tabs on its own after a failed submit', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const landTab = await screen.findByRole('tab', { name: /createPage\.navLand/ });

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByRole('dialog');

    expect(landTab).toHaveAttribute('aria-selected', 'true');
  });
});
