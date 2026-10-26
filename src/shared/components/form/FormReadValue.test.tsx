import { describe, expect, it } from 'vitest';
import '@/i18n';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { render, screen } from '@/test/test-utils';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { useParameterStore } from '@/shared/store';
import { FormFields } from './FormFields';
import { FormLayoutProvider } from './FormLayoutProvider';
import { FormProvider } from './FormProvider';
import { FormSection, FormSheet } from './FormSheet';
import type { FormField } from './types';

const schema = z.object({}).passthrough();

function Harness({
  defaults,
  readOnly = true,
  children,
}: {
  defaults: Record<string, unknown>;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const methods = useForm({ defaultValues: defaults });
  return (
    <PageReadOnlyContext.Provider value={readOnly}>
      <FormProvider methods={methods} schema={schema}>
        {children}
      </FormProvider>
    </PageReadOnlyContext.Provider>
  );
}

const renderRead = (fields: FormField[], defaults: Record<string, unknown>, readOnly = true) =>
  render(
    <Harness defaults={defaults} readOnly={readOnly}>
      <FormFields fields={fields} showCharCount />
    </Harness>,
  );

describe('FormFields on a read page', () => {
  it('draws label and value, with no control, required mark or counter', () => {
    const { container } = renderRead(
      [
        { type: 'text-input', name: 'owner', label: 'Owner', required: true },
        { type: 'textarea', name: 'remark', label: 'Remark', maxLength: 100 },
      ],
      { owner: 'Somchai', remark: 'line 1\nline 2' },
    );
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Somchai')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText('*')).toBeNull();
    expect(screen.queryByText(/\/100/)).toBeNull();
    // line breaks of a textarea survive
    expect(screen.getByText(/line 1/)).toHaveClass('whitespace-pre-line');
    // the jump targets still find the field
    expect(container.querySelector('[data-field="owner"]')).not.toBeNull();
  });

  it('formats a number as its control does, with the unit', () => {
    renderRead(
      [
        { type: 'number-input', name: 'age', label: 'Age', decimalPlaces: 1, suffix: 'ปี' },
        { type: 'number-input', name: 'price', label: 'Price' },
        { type: 'number-input', name: 'plain', label: 'Plain', thousandSeparator: false },
      ],
      { age: 6, price: 1234567.5, plain: '12345' },
    );
    expect(screen.getByText('6.0 ปี')).toBeInTheDocument();
    expect(screen.getByText('1,234,567.50')).toBeInTheDocument();
    expect(screen.getByText('12345.00')).toBeInTheDocument();
  });

  it('formats dates as the date controls show them', () => {
    renderRead(
      [
        { type: 'date-input', name: 'on', label: 'On' },
        { type: 'datetime-input', name: 'at', label: 'At' },
      ],
      { on: '2026-10-25T00:00:00', at: '2026-10-25T14:05:00' },
    );
    expect(screen.getByText('25/10/2026')).toBeInTheDocument();
    expect(screen.getByText('25/10/2026 14:05')).toBeInTheDocument();
  });

  it('shows the label of a dropdown option, of a parameter group and of a parameter search, never the code', () => {
    useParameterStore.setState({
      parameters: {
        'roof.th.en': [
          {
            parId: 1,
            group: 'Roof',
            country: 'th',
            language: 'en',
            code: '07',
            description: 'Concrete',
            isActive: true,
            seqNo: 1,
          },
        ],
      },
    });
    renderRead(
      [
        {
          type: 'dropdown',
          name: 'cond',
          label: 'Condition',
          options: [{ value: '02', label: 'Good' }],
        },
        { type: 'dropdown', name: 'roof', label: 'Roof', group: 'Roof' },
        {
          type: 'parameter-search',
          name: 'office',
          label: 'Office',
          options: [{ value: 'A1', label: 'Bangkok' }],
        },
      ],
      { cond: '02', roof: '07', office: 'A1' },
    );
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Concrete')).toBeInTheDocument();
    expect(screen.getByText('Bangkok')).toBeInTheDocument();
    expect(screen.queryByText(/02|07|A1/)).toBeNull();
  });

  it('shows only the chosen options of a chip group, a radio group and a toggle', () => {
    renderRead(
      [
        {
          type: 'checkbox-group',
          name: 'utilities',
          label: 'Utilities',
          options: [
            { value: 'e', label: 'Electricity' },
            { value: 'w', label: 'Water' },
            { value: 'd', label: 'Drain' },
          ],
        },
        {
          type: 'radio-group',
          name: 'state',
          label: 'State',
          options: [
            { value: 'n', label: 'New' },
            { value: 'm', label: 'Medium' },
          ],
        },
        { type: 'boolean-toggle', name: 'built', label: 'Built', options: ['Off', 'On'] },
        {
          type: 'string-toggle',
          name: 'side',
          label: 'Side',
          options: [
            { name: 'l', label: 'Left' },
            { name: 'r', label: 'Right' },
          ],
        },
      ],
      { utilities: ['e', 'd'], state: 'm', built: true, side: 'l' },
    );
    expect(screen.getByText('Electricity · Drain')).toBeInTheDocument();
    expect(screen.queryByText(/Water/)).toBeNull();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.queryByText('New')).toBeNull();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.queryByText('Off')).toBeNull();
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.queryByText('Right')).toBeNull();
  });

  it('shows a dash for an empty value, and "missing" too when it is required', () => {
    renderRead(
      [
        { type: 'text-input', name: 'a', label: 'Optional' },
        { type: 'text-input', name: 'b', label: 'Needed', required: true },
        { type: 'number-input', name: 'c', label: 'Zero', required: true },
      ],
      { a: '', b: null, c: 0 },
    );
    expect(screen.getAllByText('—')).toHaveLength(3);
    // required: the text field and the zero a required number counts as empty
    expect(screen.getAllByText('missing')).toHaveLength(2);
  });

  it('draws a checkbox and a switch as label + yes / no, with no control', () => {
    renderRead(
      [
        { type: 'checkbox', name: 'a', label: 'Expropriated' },
        { type: 'switch', name: 'b', label: 'Active' },
      ],
      { a: true, b: false },
    );
    expect(screen.getByText('Expropriated')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('keeps a merely disabled field as a disabled control on an editable page', () => {
    renderRead(
      [{ type: 'text-input', name: 'owner', label: 'Owner', disabled: true }],
      { owner: 'Somchai' },
      false,
    );
    expect(screen.getByLabelText('Owner')).toBeDisabled();
  });

  it('gives a field its edit span, without a `flex` wrapper', () => {
    const { container } = renderRead(
      [
        { type: 'text-input', name: 'a', label: 'A', wrapperClassName: 'col-span-8' },
        {
          type: 'dropdown',
          name: 'b',
          label: 'B',
          options: [],
          wrapperClassName: 'col-span-12 flex items-center',
        },
        {
          type: 'checkbox-group',
          name: 'c',
          label: 'C',
          options: [],
          wrapperClassName: 'col-span-12',
        },
        { type: 'textarea', name: 'd', label: 'D', wrapperClassName: 'col-span-6' },
      ],
      {},
    );
    const cls = (name: string) =>
      (container.querySelector(`[data-field="${name}"]`) as HTMLElement).className;
    expect(cls('a')).toBe('col-span-8');
    expect(cls('b')).toBe('col-span-12');
    expect(cls('c')).toBe('col-span-12');
    expect(cls('d')).toBe('col-span-6');
  });

  it('is a label-left text row in Compact', () => {
    const { container } = render(
      <FormLayoutProvider layout="compact">
        <Harness defaults={{ owner: 'Somchai' }}>
          <FormSheet>
            <FormSection id="s" title="Info">
              <FormFields fields={[{ type: 'text-input', name: 'owner', label: 'Owner' }]} />
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );
    const pair = container.querySelector('[data-field="owner"]') as HTMLElement;
    expect(pair).toHaveClass('grid-cols-[10.8571rem_minmax(0,1fr)]');
    expect(pair.querySelector('.min-h-\\[2\\.3571rem\\]')).not.toBeNull();
    expect(screen.getByText('Somchai')).toBeInTheDocument();
  });

  it('lays out like the edit page in Compact: a field 12 wide or a textarea takes the row', () => {
    const { container } = render(
      <FormLayoutProvider layout="compact">
        <Harness defaults={{}}>
          <FormSheet>
            <FormSection id="s" title="Info">
              <FormFields
                fields={[
                  {
                    type: 'checkbox-group',
                    name: 'c',
                    label: 'C',
                    options: [],
                    wrapperClassName: 'col-span-12',
                  },
                  { type: 'textarea', name: 't', label: 'T' },
                ]}
              />
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );
    expect(container.querySelector('[data-field="c"]')).not.toHaveClass(
      '@[60rem]/sheet:col-span-6',
    );
    expect(container.querySelector('[data-field="t"]')).toHaveClass('col-span-12');
  });
});
