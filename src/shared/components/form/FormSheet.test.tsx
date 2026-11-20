import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { act, render, screen, within } from '@/test/test-utils';
import { FormFields } from './FormFields';
import { FormLayoutProvider } from './FormLayoutProvider';
import { FormProvider } from './FormProvider';
import { FormSectionsProvider } from './FormSectionsProvider';
import { FormSection, FormSheet } from './FormSheet';
import { FormSubheading } from './FormSubheading';
import { FormSectionStatusContext, useFormSections } from './formSheetContext';
import { MissingFieldsProvider } from './missing';
import type { FormField } from './types';

const fields: FormField[] = [
  {
    type: 'text-input',
    name: 'name',
    label: 'Name',
    required: true,
    wrapperClassName: 'col-span-6',
  },
  { type: 'textarea', name: 'remark', label: 'Remark', wrapperClassName: 'col-span-12' },
];

const schema = z.object({ name: z.string().nullable(), remark: z.string().nullable() });

function Harness({ children }: { children: ReactNode }) {
  const methods = useForm<z.infer<typeof schema>>({ defaultValues: { name: '', remark: '' } });
  return (
    <FormProvider methods={methods} schema={schema}>
      {children}
    </FormProvider>
  );
}

describe.each(['standard', 'compact'] as const)('FormSheet / FormSection (%s)', layout => {
  const renderSheet = (extra?: ReactNode) =>
    render(
      <FormLayoutProvider layout={layout}>
        <Harness>
          <FormSheet>
            <FormSection
              id="info"
              title="Information"
              icon="building"
              hint="Optional hint"
              actions={<button type="button">+ Add</button>}
            >
              <FormFields fields={fields} />
              <FormSubheading>Address</FormSubheading>
            </FormSection>
            <FormSection title="Remark">{extra}</FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );

  it('names each section by its title, with the anchor id', () => {
    renderSheet();
    const section = screen.getByRole('region', { name: 'Information' });
    expect(section).toHaveAttribute('id', 'info');
    expect(within(section).getByRole('heading', { name: 'Information' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Remark' })).toBeInTheDocument();
  });

  it('shows the hint and the actions in the head', () => {
    renderSheet();
    const section = screen.getByRole('region', { name: 'Information' });
    expect(within(section).getByText('Optional hint')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: '+ Add' })).toBeInTheDocument();
  });

  it("keeps the quarter and third spans down to 56rem of the form shell, not the rail's 84.2857rem", () => {
    renderSheet();
    const body = screen.getByRole('region', { name: 'Information' })
      .lastElementChild as HTMLElement;
    if (layout === 'standard') {
      expect(body.className).toContain('@max-[56rem]/form-shell:');
      expect(body.className).not.toContain('84.2857rem');
    }
  });

  it('draws a toggle and its field as one auto | 1fr row in Standard only', () => {
    const pair: FormField[] = [
      {
        type: 'boolean-toggle',
        name: 'ok',
        label: 'Checked',
        options: ['No', 'Yes'],
        wrapperClassName: 'col-span-3',
      },
      { type: 'text-input', name: 'name', label: 'Name', wrapperClassName: 'col-span-9' },
    ];
    render(
      <FormLayoutProvider layout={layout}>
        <Harness>
          <FormSheet>
            <FormSection title="Pair">
              <FormFields fields={pair} />
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );
    const row = document.querySelector<HTMLElement>('[data-field="ok"]')!.parentElement!;
    if (layout === 'standard') {
      expect(row).toHaveClass('grid-cols-[auto_minmax(0,1fr)]', 'col-span-12');
      expect(row).toContainElement(document.querySelector('[data-field="name"]'));
      // The pair's own grid sizes the two, so neither keeps a span of its own.
      expect(document.querySelector('[data-field="ok"]')!.className).not.toMatch(/col-span/);
    } else {
      expect(row).not.toHaveClass('grid-cols-[auto_minmax(0,1fr)]');
    }
  });

  it('shares one toggle column between consecutive toggle + field rows, so the fields line up', () => {
    const rows: FormField[] = [
      {
        type: 'boolean-toggle',
        name: 'a',
        label: 'A',
        options: ['No', 'Yes'],
        wrapperClassName: 'col-span-3',
      },
      { type: 'text-input', name: 'aText', label: 'A text', wrapperClassName: 'col-span-9' },
      {
        type: 'boolean-toggle',
        name: 'b',
        label: 'B',
        options: ['No', 'Yes'],
        wrapperClassName: 'col-span-3',
      },
      { type: 'text-input', name: 'bText', label: 'B text', wrapperClassName: 'col-span-9' },
      { type: 'text-input', name: 'between', label: 'Between', wrapperClassName: 'col-span-12' },
      {
        type: 'boolean-toggle',
        name: 'c',
        label: 'C',
        options: ['No', 'Yes'],
        wrapperClassName: 'col-span-3',
      },
      { type: 'text-input', name: 'cText', label: 'C text', wrapperClassName: 'col-span-9' },
    ];
    render(
      <FormLayoutProvider layout={layout}>
        <Harness>
          <FormSheet>
            <FormSection title="Rows">
              <FormFields fields={rows} />
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );
    const rowOf = (f: string) =>
      document.querySelector<HTMLElement>(`[data-field="${f}"]`)!.parentElement!;
    if (layout === 'standard') {
      // Rows one and two are one grid (one `auto` column); a field between them starts a new one.
      expect(rowOf('a')).toBe(rowOf('b'));
      expect(rowOf('a')).toBe(rowOf('aText'));
      expect(rowOf('a')).toBe(rowOf('bText'));
      expect(rowOf('c')).not.toBe(rowOf('a'));
      expect(rowOf('c')).toBe(rowOf('cText'));
    } else {
      expect(rowOf('a')).not.toHaveClass('grid-cols-[auto_minmax(0,1fr)]');
    }
  });

  it('draws the icon in Standard only; Compact has the band alone', () => {
    const { container } = renderSheet();
    const icon = container.querySelector('section#info header svg');
    if (layout === 'standard') expect(icon).not.toBeNull();
    else expect(icon).toBeNull();
  });

  it('is one card per section in Standard and one sheet in Compact', () => {
    renderSheet();
    const section = screen.getByRole('region', { name: 'Information' });
    const sheet = section.parentElement!;
    if (layout === 'standard') {
      expect(section).toHaveClass('rounded-section', 'border');
      expect(sheet).toHaveClass('flex-col');
    } else {
      expect(section).not.toHaveClass('border');
      expect(sheet).toHaveClass('@container/sheet', 'overflow-hidden', 'border');
    }
  });

  it('labels a field by its label and marks it required', () => {
    renderSheet();
    const name = screen.getByLabelText(/^Name/);
    expect(name.tagName).toBe('INPUT');
    expect(screen.getByText('*')).toBeInTheDocument();
    // The "Remark" section is a labelled region too, so ask for the textbox.
    expect(screen.getByRole('textbox', { name: 'Remark' }).tagName).toBe('TEXTAREA');
  });

  it('wraps a field the way its layout says (data-field kept)', () => {
    const { container } = renderSheet();
    const name = container.querySelector('[data-field="name"]') as HTMLElement;
    const remark = container.querySelector('[data-field="remark"]') as HTMLElement;
    expect(name).not.toBeNull();
    if (layout === 'standard') {
      // The field keeps its own span in the 12-column grid; the label sits above the control.
      expect(name).toHaveClass('col-span-6');
      expect(name.firstElementChild!.tagName).toBe('DIV');
      expect(name.firstElementChild).toContainElement(screen.getByText('*'));
    } else {
      // A pair: the config's span is dropped, a short field takes half of a wide row, a textarea a row.
      expect(name).toHaveClass('grid-cols-[13.1429rem_minmax(0,1fr)]', '@[60rem]/sheet:basis-1/2');
      expect(name).toHaveAttribute('data-half');
      expect(name).not.toHaveClass('col-span-6');
      expect(remark).toHaveClass('basis-full');
      expect(remark).not.toHaveAttribute('data-half');
    }
  });
});

describe('FormFields outside a FormSection', () => {
  it('keeps the Standard wrapper even in a Compact layout (a modal opened from the page)', () => {
    const { container } = render(
      <FormLayoutProvider layout="compact">
        <Harness>
          <FormFields fields={fields} />
        </Harness>
      </FormLayoutProvider>,
    );
    const name = container.querySelector('[data-field="name"]') as HTMLElement;
    expect(name).toHaveClass('col-span-6');
    expect(name).not.toHaveClass('grid-cols-[13.1429rem_minmax(0,1fr)]');
  });
});

describe('FormSectionsProvider', () => {
  const Toc = () => (
    <ol>
      {useFormSections().map(s => (
        <li key={s.id}>{s.title}</li>
      ))}
    </ol>
  );

  it('lists the mounted sections in page order, whenever they mounted', () => {
    const Page = ({ withMiddle }: { withMiddle: boolean }) => (
      <FormSectionsProvider>
        <Toc />
        <FormSheet>
          <FormSection id="a" title="First">
            <span />
          </FormSection>
          {withMiddle && (
            <FormSection id="b" title="Second">
              <span />
            </FormSection>
          )}
          <FormSection id="c" title="Third">
            <span />
          </FormSection>
        </FormSheet>
      </FormSectionsProvider>
    );
    const { rerender } = render(<Page withMiddle={false} />);
    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual(['First', 'Third']);

    // Mounted last, listed in the middle.
    rerender(<Page withMiddle />);
    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual([
      'First',
      'Second',
      'Third',
    ]);

    rerender(<Page withMiddle={false} />);
    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual(['First', 'Third']);
  });
});

describe('FormFields row groups', () => {
  const pair: FormField[] = [
    { type: 'text-input', name: 'name', label: 'Latitude', wrapperClassName: 'col-span-6' },
    { type: 'text-input', name: 'remark', label: 'Longitude', wrapperClassName: 'col-span-6' },
  ];
  const renderPair = (layout: 'standard' | 'compact') =>
    render(
      <FormLayoutProvider layout={layout}>
        <Harness>
          <FormSheet>
            <FormSection id="geo" title="Geo">
              <FormFields fields={pair} />
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );

  it('Standard: a pair that fills a row starts a row and keeps its spans', () => {
    renderPair('standard');
    const [first, second] = Array.from(document.querySelectorAll('[data-field]'));
    expect(first).toHaveAttribute('data-keep-row');
    expect(first).toHaveClass('col-start-1', 'col-span-6');
    expect(second).toHaveAttribute('data-keep-row');
    expect(second).not.toHaveClass('col-start-1');
  });

  it('Standard and Compact: a chip group takes the whole row whatever its span', () => {
    const chips: FormField[] = [
      { type: 'text-input', name: 'a', label: 'A', wrapperClassName: 'col-span-6' },
      {
        type: 'radio-group',
        name: 'b',
        label: 'B',
        options: [],
        wrapperClassName: 'col-span-6 md:col-span-4',
      },
      { type: 'text-input', name: 'c', label: 'C', wrapperClassName: 'col-span-6' },
    ];
    const renderChips = (layout: 'standard' | 'compact') =>
      render(
        <FormLayoutProvider layout={layout}>
          <Harness>
            <FormSheet>
              <FormSection id="x" title="X">
                <FormFields fields={chips} />
              </FormSection>
            </FormSheet>
          </Harness>
        </FormLayoutProvider>,
      );
    const std = renderChips('standard');
    const [a, b, c] = Array.from(std.container.querySelectorAll('[data-field]'));
    expect(b.className).toBe('col-span-12');
    expect(a).toHaveClass('col-span-6');
    expect(a).not.toHaveAttribute('data-keep-row');
    expect(c).not.toHaveAttribute('data-keep-row');
    std.unmount();
    renderChips('compact');
    // Compact: a choice group is a row of its own too
    expect(document.querySelector('[data-field="b"]')).not.toHaveAttribute('data-half');
  });

  it('Compact: the first pair of a run starts a row; the pairs keep their own spans', () => {
    renderPair('compact');
    const [first, second] = Array.from(document.querySelectorAll('[data-field]'));
    // A line break before the first pair (a flex row has no col-start-1), none before the second.
    expect(first.previousElementSibling).toHaveAttribute('aria-hidden');
    expect(second.previousElementSibling).toBe(first);
    expect(first).not.toHaveAttribute('data-keep-row');
    expect(first).toHaveAttribute('data-half');
  });
});

describe('FormSection status (a shell without the TOC rail)', () => {
  const summary = {
    total: 2,
    sections: [
      { id: 'a', title: 'First', items: [{ key: 'name', label: 'Name', path: 'name', count: 2 }] },
    ],
  };
  const renderSections = (statusInHeader: boolean, value: typeof summary | null = summary) =>
    render(
      <MissingFieldsProvider summary={value}>
        <FormSectionStatusContext.Provider value={statusInHeader}>
          <div data-field="name" />
          <FormSheet>
            <FormSection id="a" title="First">
              <span />
            </FormSection>
            <FormSection id="b" title="Second">
              <span />
            </FormSection>
          </FormSheet>
        </FormSectionStatusContext.Provider>
      </MissingFieldsProvider>,
    );

  it('says how many are missing, or that the section is complete', () => {
    renderSections(true);
    const first = screen.getByRole('region', { name: 'First' });
    expect(within(first).getByRole('button', { name: '2 missing' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Second' })).getByText('Complete'),
    ).toBeInTheDocument();
  });

  it('jumps to the first missing field when the pill is pressed', async () => {
    const { user, container } = renderSections(true);
    const toField = vi.fn();
    (container.querySelector('[data-field="name"]') as HTMLElement).scrollIntoView = toField;
    await user.click(screen.getByRole('button', { name: '2 missing' }));
    await act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    expect(toField).toHaveBeenCalledTimes(1);
  });

  it('shows nothing in a section that opts out with status={false} (photos)', () => {
    render(
      <MissingFieldsProvider summary={summary}>
        <FormSectionStatusContext.Provider value>
          <FormSheet>
            <FormSection id="p" title="Photos" status={false}>
              <span />
            </FormSection>
          </FormSheet>
        </FormSectionStatusContext.Provider>
      </MissingFieldsProvider>,
    );
    expect(screen.queryByText(/missing|Complete/)).toBeNull();
  });

  it('shows nothing when the TOC carries it, outside a shell, or without a summary', () => {
    const { unmount } = renderSections(false);
    expect(screen.queryByText(/missing|Complete/)).toBeNull();
    unmount();
    renderSections(true, null);
    expect(screen.queryByText(/missing|Complete/)).toBeNull();
  });
});

describe('FormFields choice groups in Compact', () => {
  const choice = (n: number, name: string): FormField => ({
    type: 'radio-group',
    name,
    label: name,
    options: Array.from({ length: n }, (_, i) => ({ value: String(i), label: `Option ${i}` })),
    wrapperClassName: 'col-span-6',
  });

  it('puts every choice group on a row of its own, whatever its size, unless the form keeps its span', () => {
    const kept = { ...choice(3, 'kept'), keepSpan: true } as FormField;
    const { container } = render(
      <FormLayoutProvider layout="compact">
        <Harness>
          <FormSheet>
            <FormSection id="c" title="Choices">
              <FormFields fields={[choice(2, 'two'), choice(4, 'four'), choice(5, 'five'), kept]} />
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );
    for (const name of ['two', 'four', 'five']) {
      const el = container.querySelector(`[data-field="${name}"]`);
      expect(el).not.toHaveAttribute('data-half');
      expect(el).toHaveClass('basis-full');
    }
    // kept: declared by the form, a half beside its neighbour
    expect(container.querySelector('[data-field="kept"]')).toHaveAttribute('data-half');
  });
});
