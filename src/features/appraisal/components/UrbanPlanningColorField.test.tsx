import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { act } from '@testing-library/react';
import { render, screen } from '@/test/test-utils';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import { FormLayoutProvider } from '@/shared/components/form/FormLayoutProvider';
import { FormSection, FormSheet } from '@/shared/components/form/FormSheet';
import UrbanPlanningColorField from './UrbanPlanningColorField';

vi.mock('@/shared/utils/parameterUtils', () => ({
  useParametersByGroup: () => [
    { code: '01', description: 'Red' },
    { code: '02', description: 'Brown' },
    { code: '07', description: 'White with a green frame and diagonal lines' },
    { code: '99', description: 'Other' },
  ],
}));

type Values = {
  urbanPlanningType: string;
  urbanPlanningColor: string;
  urbanPlanningColorOther: string;
};

let methods: ReturnType<typeof useForm<Values>>;

const Harness = ({
  defaults,
  readOnly = false,
  compact = false,
}: {
  defaults?: Partial<Values>;
  readOnly?: boolean;
  compact?: boolean;
}) => {
  methods = useForm<Values>({
    defaultValues: {
      urbanPlanningType: '',
      urbanPlanningColor: '',
      urbanPlanningColorOther: '',
      ...defaults,
    },
  });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        {/* Stands in for the planning-type field: an edit by the user goes through field.onChange. */}
        <Controller
          control={methods.control}
          name="urbanPlanningType"
          render={({ field }) => (
            <select aria-label="type" value={field.value} onChange={field.onChange}>
              {['', '01', '05', '07'].map(v => (
                <option key={v} value={v}>
                  {v || 'none'}
                </option>
              ))}
            </select>
          )}
        />
        {compact ? (
          <FormLayoutProvider layout="compact">
            <FormSheet>
              <FormSection title="Zoning">
                <UrbanPlanningColorField />
              </FormSection>
            </FormSheet>
          </FormLayoutProvider>
        ) : (
          <UrbanPlanningColorField />
        )}
        <output data-testid="colour">{methods.watch('urbanPlanningColor')}</output>
        <output data-testid="other">{methods.watch('urbanPlanningColorOther')}</output>
        <output data-testid="dirty">{String(methods.formState.isDirty)}</output>
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
};

describe('UrbanPlanningColorField', () => {
  it('fills in the usual colour when the user picks a planning type and no colour is chosen', async () => {
    const { user } = render(<Harness />);
    await user.selectOptions(screen.getByLabelText('type'), '01');
    expect(screen.getByTestId('colour')).toHaveTextContent('01');
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
    expect(screen.getByRole('radio', { name: /Red/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Suggested')).toBeInTheDocument();
  });

  it('replaces a colour picked earlier whenever the planning type changes', async () => {
    const { user } = render(<Harness defaults={{ urbanPlanningColor: '02' }} />);
    await user.selectOptions(screen.getByLabelText('type'), '01');
    expect(screen.getByTestId('colour')).toHaveTextContent('01');
    await user.selectOptions(screen.getByLabelText('type'), '07');
    expect(screen.getByTestId('colour')).toHaveTextContent('07');
  });

  it('keeps a colour the user picks after changing the type', async () => {
    const { user } = render(<Harness />);
    await user.selectOptions(screen.getByLabelText('type'), '01');
    await user.click(screen.getByRole('radio', { name: /Brown/ }));
    expect(screen.getByTestId('colour')).toHaveTextContent('02');
  });

  it('clears the colour, and its other text, for a type with no usual colour', async () => {
    const { user } = render(
      <Harness defaults={{ urbanPlanningColor: '99', urbanPlanningColorOther: 'Pink' }} />,
    );
    await user.selectOptions(screen.getByLabelText('type'), '05');
    expect(screen.getByTestId('colour')).toBeEmptyDOMElement();
    expect(screen.getByTestId('other')).toBeEmptyDOMElement();
    expect(screen.queryByText('Suggested colour')).toBeNull();
  });

  it('does not change the colour or dirty anything when a saved record loads', async () => {
    render(<Harness />);
    act(() =>
      methods.reset({
        urbanPlanningType: '01',
        urbanPlanningColor: '02',
        urbanPlanningColorOther: '',
      }),
    );
    expect(screen.getByTestId('colour')).toHaveTextContent('02');
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
  });

  it('asks for the colour in words on "other", and drops that text when another colour is picked', async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('radio', { name: /Other/ }));
    const input = screen.getByRole('textbox', { name: 'Specify other colour' });
    expect(input).toHaveAttribute('maxlength', '100');
    await user.type(input, 'Pink');
    expect(screen.getByTestId('other')).toHaveTextContent('Pink');
    await user.click(screen.getByRole('radio', { name: /Red/ }));
    expect(screen.getByTestId('other')).toBeEmptyDOMElement();
    expect(screen.queryByRole('textbox', { name: 'Specify other colour' })).toBeNull();
  });

  it('types the other colour inside the selected card, focused on pick, with no separate row', async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('radio', { name: /Other/ }));
    const input = screen.getByRole('textbox', { name: 'Specify other colour' });
    expect(input).toHaveFocus();
    expect(input.closest('[data-field="urbanPlanningColorOther"]')).toContainElement(
      screen.getByRole('radio', { name: /Other/ }),
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    await user.type(input, 'Pink');
    expect(screen.getByTestId('other')).toHaveTextContent('Pink');
    await user.click(screen.getByRole('radio', { name: /Other/ }));
    expect(screen.getByTestId('colour')).toBeEmptyDOMElement();
  });

  it('opens a saved other colour as the typed card, without taking focus, and edits on click', async () => {
    const { user } = render(
      <Harness defaults={{ urbanPlanningColor: '99', urbanPlanningColorOther: 'Pink' }} />,
    );
    expect(screen.queryByRole('textbox', { name: 'Specify other colour' })).toBeNull();
    const card = screen.getByRole('radio', { name: 'Other: Pink, edit' });
    expect(card).not.toHaveFocus();
    await user.click(card);
    expect(screen.getByRole('textbox', { name: 'Specify other colour' })).toHaveFocus();
  });

  it('has an × on the typing card that clears the choice, in the card and in the compact chip', async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('radio', { name: /Other/ }));
    await user.type(screen.getByRole('textbox', { name: 'Specify other colour' }), 'Pink');
    await user.click(screen.getByRole('button', { name: 'Remove other' }));
    expect(screen.getByTestId('colour')).toBeEmptyDOMElement();
    expect(screen.getByTestId('other')).toBeEmptyDOMElement();
  });

  it('shows the colour typed in "other" as the card once the user leaves the input', async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('radio', { name: /Other/ }));
    await user.type(screen.getByRole('textbox', { name: 'Specify other colour' }), 'Pink');
    // The × sits inside the card, so it takes the second Tab to leave it.
    await user.tab();
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Other: Pink, edit' })).toBeInTheDocument();
    expect(screen.getByTestId('colour')).toHaveTextContent('99');
  });

  it('uses the short name for the white-and-green colour and clears on a second click', async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('radio', { name: /White, green stripes/ }));
    expect(screen.getByTestId('colour')).toHaveTextContent('07');
    await user.click(screen.getByRole('radio', { name: /White, green stripes/ }));
    expect(screen.getByTestId('colour')).toBeEmptyDOMElement();
  });

  it('shows the swatch and name as text on a read page', () => {
    render(<Harness readOnly defaults={{ urbanPlanningColor: '01' }} />);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText('Red')).toBeInTheDocument();
  });

  describe('compact layout', () => {
    it('is a label-left row of chips with a swatch dot each, and no big card grid or header pill', () => {
      const { container } = render(<Harness compact defaults={{ urbanPlanningType: '01' }} />);
      const row = container.querySelector('[data-field="urbanPlanningColor"]')!;
      expect(row).toHaveTextContent('Zoning colour');
      expect(screen.queryByText('Zoning colour on the official plan')).toBeNull();
      expect(screen.queryByText('Suggested colour')).toBeNull();
      const chips = screen.getAllByRole('radio');
      expect(chips).toHaveLength(4);
      expect(chips[0].className).toContain('rounded-full');
      expect(chips[0].querySelector('span[aria-hidden]')).not.toBeNull();
      expect(screen.getByText('Suggested')).toBeInTheDocument();
    });

    it('picks a colour, then types the other colour inside its chip, focused on pick', async () => {
      const { user } = render(<Harness compact />);
      await user.click(screen.getByRole('radio', { name: /Red/ }));
      expect(screen.getByTestId('colour')).toHaveTextContent('01');
      await user.click(screen.getByRole('radio', { name: /Other/ }));
      const input = await screen.findByRole('textbox', { name: 'Specify other colour' });
      await vi.waitFor(() => expect(input).toHaveFocus());
      await user.type(input, 'Pink');
      expect(screen.getByTestId('other')).toHaveTextContent('Pink');
      expect(screen.getByTestId('colour')).toHaveTextContent('99');
    });

    it('shows swatch and name on a read page row', () => {
      render(<Harness compact readOnly defaults={{ urbanPlanningColor: '01' }} />);
      expect(screen.queryByRole('radio')).toBeNull();
      expect(screen.getByText('Red')).toBeInTheDocument();
    });
  });
});
