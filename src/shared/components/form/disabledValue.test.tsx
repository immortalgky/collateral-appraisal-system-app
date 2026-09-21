/**
 * Locks two things the appraisal forms depend on:
 *
 * - the `disabledValue` lifecycle — a field clamped to a stand-in while disabled must let go of it
 *   when it becomes editable again, handing back whatever it was holding before the clamp, and
 *   must not touch a saved record that holds the same text;
 * - that editing a value and putting it back leaves the form clean. react-hook-form compares
 *   against `defaultValues` literally, so a text field seeded `null` never matches the `''` its
 *   input emits and the "unsaved changes" indicator stays lit forever.
 */
import { describe, it, expect } from 'vitest';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { FormProvider } from './FormProvider';
import { FormFields } from './FormFields';
import type { FormField } from './types';
import { machinerySummaryGeneralFields } from '@/features/appraisal/configs/fields';

const NOT_VERIFIABLE = 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้';

const fields: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'isOwnerVerified',
    options: ['Can not', 'Can'],
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    disableWhen: { field: 'isOwnerVerified', is: false },
    disabledValue: NOT_VERIFIABLE,
  },
];

const schema = z.object({
  isOwnerVerified: z.boolean(),
  ownerName: z.string().nullable(),
});

function Harness({ defaults }: { defaults: Record<string, unknown> }) {
  const methods = useForm<z.infer<typeof schema>>({
    defaultValues: defaults as z.infer<typeof schema>,
  });
  return (
    <FormProvider methods={methods} schema={schema}>
      <FormFields fields={fields} />
    </FormProvider>
  );
}

const owner = () => screen.getByLabelText('Owner') as HTMLInputElement;

describe('disabledValue', () => {
  it('clamps to the stand-in while disabled, and hands the text back when enabled again', async () => {
    const user = userEvent.setup();
    render(<Harness defaults={{ isOwnerVerified: true, ownerName: 'บริษัท ก จำกัด' }} />);

    await user.click(screen.getByRole('radio', { name: 'Can not' }));
    expect(owner()).toHaveValue(NOT_VERIFIABLE);
    expect(owner()).toBeDisabled();

    // A toggle flipped by mistake must not cost the appraiser what they had written — and must
    // not leave the stand-in sitting there to be saved as if it were their answer.
    await user.click(screen.getByRole('radio', { name: 'Can' }));
    expect(owner()).toBeEnabled();
    expect(owner()).toHaveValue('บริษัท ก จำกัด');
  });

  it('releases to empty when there was nothing to hand back', async () => {
    const user = userEvent.setup();
    render(<Harness defaults={{ isOwnerVerified: true, ownerName: '' }} />);

    await user.click(screen.getByRole('radio', { name: 'Can not' }));
    expect(owner()).toHaveValue(NOT_VERIFIABLE);

    await user.click(screen.getByRole('radio', { name: 'Can' }));
    expect(owner()).toHaveValue('');
  });

  it('reports the clearing as a change, so Data Correction actually sends it', async () => {
    // The correction form PATCHes only the fields react-hook-form marks dirty. A clamp that
    // cleared the field quietly left the old number in the database while the screen showed it
    // gone — the report then printed a registration number under "ยังไม่ได้รับการจดทะเบียน".
    const user = userEvent.setup();

    function DirtyFieldsHarness() {
      const methods = useForm<z.infer<typeof schema>>({
        defaultValues: { isOwnerVerified: true, ownerName: 'บริษัท ก จำกัด' },
      });
      return (
        <FormProvider methods={methods} schema={schema}>
          <FormFields fields={fields} />
          <output data-testid="dirty-fields">
            {Object.keys(methods.formState.dirtyFields).join(',')}
          </output>
        </FormProvider>
      );
    }

    render(<DirtyFieldsHarness />);
    await user.click(screen.getByRole('radio', { name: 'Can not' }));

    expect(owner()).toHaveValue(NOT_VERIFIABLE);
    expect(screen.getByTestId('dirty-fields').textContent).toContain('ownerName');
  });

  it('leaves a toggle alone when it opts out with clearOnEnable', async () => {
    const user = userEvent.setup();
    const toggleFields: FormField[] = [
      {
        type: 'boolean-toggle',
        label: 'Registration Status',
        name: 'registrationStatus',
        options: ['Unregistered', 'Registered'],
      },
      {
        type: 'boolean-toggle',
        label: 'Price Certified',
        name: 'isPriceCertified',
        options: ['Not Certified', 'Certified'],
        disableWhen: { field: 'registrationStatus', is: false },
        disabledValue: false,
        clearOnEnable: false,
      },
    ];
    const toggleSchema = z.object({
      registrationStatus: z.boolean(),
      isPriceCertified: z.boolean(),
    });

    function ToggleHarness() {
      const methods = useForm<z.infer<typeof toggleSchema>>({
        defaultValues: { registrationStatus: true, isPriceCertified: true },
      });
      return (
        <FormProvider methods={methods} schema={toggleSchema}>
          <FormFields fields={toggleFields} />
        </FormProvider>
      );
    }

    render(<ToggleHarness />);
    const certified = () => screen.getByRole('radio', { name: 'Certified' });

    await user.click(screen.getByRole('radio', { name: 'Unregistered' }));
    expect(certified()).toHaveAttribute('aria-checked', 'false');

    // Back to eligible: the toggle keeps a real boolean rather than being emptied to null,
    // which would leave neither option chosen and fail z.boolean() on save.
    await user.click(screen.getByRole('radio', { name: 'Registered' }));
    expect(screen.getByRole('radio', { name: 'Not Certified' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('leaves the form clean when the governing toggle is flipped and flipped back', async () => {
    const user = userEvent.setup();

    function DirtyOwnerHarness() {
      const methods = useForm<z.infer<typeof schema>>({
        defaultValues: { isOwnerVerified: true, ownerName: '' },
      });
      return (
        <FormProvider methods={methods} schema={schema}>
          <FormFields fields={fields} />
          <output data-testid="dirty">{String(methods.formState.isDirty)}</output>
        </FormProvider>
      );
    }

    render(<DirtyOwnerHarness />);

    await user.click(screen.getByRole('radio', { name: 'Can not' }));
    await user.click(screen.getByRole('radio', { name: 'Can' }));

    // The stand-in went in and came back out, and both ends of the round trip are '' — so nothing
    // is left for the "unsaved changes" indicator to report.
    expect(screen.getByTestId('dirty').textContent).toBe('false');
    expect(owner()).toHaveValue('');
  });

  it('keeps a stored value that contradicts the rule instead of blanking it', async () => {
    // A machine saved as unregistered but carrying a registration number, or any legacy row the
    // rule now disagrees with. Opening it must not clamp: the clamp posts '' on the next save and
    // the API reads '' as "clear this", so the number would be destroyed by merely looking at it.
    render(<Harness defaults={{ isOwnerVerified: false, ownerName: 'บริษัท ก จำกัด' }} />);

    expect(owner()).toBeDisabled();
    expect(owner()).toHaveValue('บริษัท ก จำกัด');
  });

  it('keeps a stored value that arrives through reset(), the way every page loads one', async () => {
    // The path that matters: pages mount on module defaults and apply the record in an effect,
    // so the governing toggle flips to "disabled" and the value lands in the same commit. That is
    // a record being opened, not the appraiser saying the field does not apply.
    function LoadHarness() {
      const methods = useForm<z.infer<typeof schema>>({
        defaultValues: { isOwnerVerified: true, ownerName: '' },
      });
      useEffect(() => {
        methods.reset({ isOwnerVerified: false, ownerName: 'บริษัท ก จำกัด' });
      }, [methods]);
      return (
        <FormProvider methods={methods} schema={schema}>
          <FormFields fields={fields} />
          <output data-testid="dirty">{String(methods.formState.isDirty)}</output>
        </FormProvider>
      );
    }

    render(<LoadHarness />);
    await waitFor(() => expect(owner()).toBeDisabled());

    expect(owner()).toHaveValue('บริษัท ก จำกัด');
    expect(screen.getByTestId('dirty').textContent).toBe('false');
  });

  it('fills a blank disabled field with the stand-in', () => {
    render(<Harness defaults={{ isOwnerVerified: false, ownerName: '' }} />);

    expect(owner()).toHaveValue(NOT_VERIFIABLE);
  });

  it('leaves every field alone while the whole page is read-only', async () => {
    // usePageReadOnly starts true and flips to false once the menu tree loads, so `globalDisabled`
    // genuinely goes true → false under a form that has already been reset with saved data.
    // Neither effect may treat that as the appraiser changing anything.
    function ReadOnlyHarness() {
      const [readOnly, setReadOnly] = useState(true);
      const methods = useForm<z.infer<typeof schema>>({
        defaultValues: { isOwnerVerified: true, ownerName: NOT_VERIFIABLE },
      });
      return (
        <FormProvider methods={methods} schema={schema}>
          <FormFields fields={fields} disabled={readOnly} />
          <output data-testid="dirty">{String(methods.formState.isDirty)}</output>
          <button type="button" onClick={() => setReadOnly(false)}>
            unlock
          </button>
        </FormProvider>
      );
    }

    const user = userEvent.setup();
    render(<ReadOnlyHarness />);
    await user.click(screen.getByRole('button', { name: 'unlock' }));

    expect(owner()).toHaveValue(NOT_VERIFIABLE);
    expect(screen.getByTestId('dirty').textContent).toBe('false');
  });

  it('leaves a saved record alone that already holds the stand-in', () => {
    render(<Harness defaults={{ isOwnerVerified: true, ownerName: NOT_VERIFIABLE }} />);

    // Never disabled in this session, so there is no transition and nothing to release.
    expect(owner()).toHaveValue(NOT_VERIFIABLE);
  });
});

describe('a stand-in of null', () => {
  // What the invoice-number field uses: the box has to clear on screen when the machine is no
  // longer under procurement, but the quotation it was priced from must stay in the database —
  // and the API reads null, not '', as "leave this column alone".
  const nullFields: FormField[] = [
    {
      type: 'boolean-toggle',
      label: 'Installed',
      name: 'installed',
      options: ['Under procurement', 'Installed'],
    },
    {
      type: 'text-input',
      label: 'Invoice',
      name: 'invoiceNumber',
      disableWhen: { field: 'installed', is: true },
      disabledValue: null,
    },
  ];
  const nullSchema = z.object({
    installed: z.boolean(),
    invoiceNumber: z.string().nullable(),
  });

  function NullHarness() {
    const methods = useForm<z.infer<typeof nullSchema>>({
      defaultValues: { installed: false, invoiceNumber: 'INV-9' },
    });
    return (
      <FormProvider methods={methods} schema={nullSchema}>
        <FormFields fields={nullFields} />
        <output data-testid="invoice">{JSON.stringify(methods.watch('invoiceNumber'))}</output>
      </FormProvider>
    );
  }

  it('clears the box on screen while telling the API to keep what it has', async () => {
    const user = userEvent.setup();
    render(<NullHarness />);
    const invoice = () => screen.getByLabelText('Invoice') as HTMLInputElement;

    expect(invoice()).toHaveValue('INV-9');

    await user.click(screen.getByRole('radio', { name: 'Installed' }));

    // Empty on screen and still a controlled input — a null value that reached the DOM would
    // leave the old text sitting there — but null in the payload, so the column is untouched.
    expect(invoice()).toBeDisabled();
    expect(invoice()).toHaveValue('');
    expect(screen.getByTestId('invoice').textContent).toBe('null');
  });
});

describe('isDirty round-trip', () => {
  const dirtyFields: FormField[] = [
    { type: 'text-input', label: 'Brand', name: 'brand' },
    {
      type: 'radio-group',
      label: 'Condition Use',
      name: 'conditionUse',
      options: [
        { value: '01', label: 'In Used' },
        { value: '02', label: 'Not In Used' },
      ],
    },
  ];
  const dirtySchema = z.object({
    brand: z.string().nullable(),
    conditionUse: z.string().nullable(),
  });

  function DirtyHarness({ defaults }: { defaults: { brand: unknown; conditionUse: unknown } }) {
    const methods = useForm<z.infer<typeof dirtySchema>>({
      defaultValues: defaults as z.infer<typeof dirtySchema>,
    });
    return (
      <FormProvider methods={methods} schema={dirtySchema}>
        <FormFields fields={dirtyFields} />
        <output data-testid="dirty">{String(methods.formState.isDirty)}</output>
      </FormProvider>
    );
  }

  const dirty = () => screen.getByTestId('dirty').textContent;

  it('goes clean again when a text field is typed into and cleared', async () => {
    const user = userEvent.setup();
    render(<DirtyHarness defaults={{ brand: '', conditionUse: '' }} />);

    await user.type(screen.getByLabelText('Brand'), 'HAITIAN');
    expect(dirty()).toBe('true');

    await user.clear(screen.getByLabelText('Brand'));
    expect(dirty()).toBe('false');
  });

  it('goes clean again when a text field is overwritten and typed back', async () => {
    const user = userEvent.setup();
    render(<DirtyHarness defaults={{ brand: 'HAITIAN', conditionUse: '' }} />);

    await user.clear(screen.getByLabelText('Brand'));
    await user.type(screen.getByLabelText('Brand'), 'SHINI');
    expect(dirty()).toBe('true');

    await user.clear(screen.getByLabelText('Brand'));
    await user.type(screen.getByLabelText('Brand'), 'HAITIAN');
    expect(dirty()).toBe('false');
  });

  it('goes clean again when a radio option is chosen and deselected', async () => {
    const user = userEvent.setup();
    render(<DirtyHarness defaults={{ brand: '', conditionUse: '' }} />);

    await user.click(screen.getByRole('radio', { name: 'In Used' }));
    expect(dirty()).toBe('true');

    // RadioGroup deselects by emitting '', which only matches a '' default.
    await user.click(screen.getByRole('radio', { name: 'In Used' }));
    expect(dirty()).toBe('false');
  });

  it('stays dirty for a null-seeded text field — the shape this guards against', async () => {
    const user = userEvent.setup();
    render(<DirtyHarness defaults={{ brand: null, conditionUse: '' }} />);

    await user.type(screen.getByLabelText('Brand'), 'X');
    await user.clear(screen.getByLabelText('Brand'));

    // '' !== null, so the form cannot tell it is back where it started. Documented rather than
    // fixed in the engine: the forms seed '' for string controls instead.
    expect(dirty()).toBe('true');
  });
});

describe('a governing toggle flipped and flipped back', () => {
  // The real machinery-summary config, not a replica: this pair is what lost an appraiser's
  // "ความต้องการของตลาด" text — clamped to '' by the No side of the toggle, then saved as ''.
  const fields = machinerySummaryGeneralFields.filter(f =>
    ['marketDemandAvailable', 'marketDemand'].includes(f.name),
  );
  const demandSchema = z.object({
    marketDemandAvailable: z.boolean().nullable(),
    marketDemand: z.string().nullable(),
  });

  function DemandHarness({ defaults }: { defaults: z.infer<typeof demandSchema> }) {
    const methods = useForm<z.infer<typeof demandSchema>>({ defaultValues: defaults });
    return (
      <FormProvider methods={methods} schema={demandSchema}>
        <FormFields fields={fields} />
        <output data-testid="demand">{JSON.stringify(methods.watch('marketDemand'))}</output>
      </FormProvider>
    );
  }
  const demand = () => screen.getByTestId('demand').textContent;

  it('keeps text typed after switching the toggle to Yes', async () => {
    const user = userEvent.setup();
    render(<DemandHarness defaults={{ marketDemandAvailable: null, marketDemand: null }} />);

    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    await user.type(screen.getByLabelText('Market Demand'), 'มีความต้องการสูง');
    expect(demand()).toBe(JSON.stringify('มีความต้องการสูง'));
  });

  it('keeps a saved description through a No → Yes round trip', async () => {
    const user = userEvent.setup();
    render(
      <DemandHarness
        defaults={{ marketDemandAvailable: true, marketDemand: 'ความต้องการสูงมาก' }}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'No' }));
    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    expect(demand()).toBe(JSON.stringify('ความต้องการสูงมาก'));
  });
});
