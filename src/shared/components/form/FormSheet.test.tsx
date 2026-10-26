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
      expect(name).toHaveClass('grid-cols-[10.8571rem_minmax(0,1fr)]', '@[60rem]/sheet:col-span-6');
      expect(name).not.toHaveClass('col-span-6');
      expect(remark).toHaveClass('col-span-12');
      expect(remark).not.toHaveClass('@[60rem]/sheet:col-span-6');
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
    expect(name).not.toHaveClass('grid-cols-[10.8571rem_minmax(0,1fr)]');
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

  it('Standard: a chip group takes the whole row whatever its span; Compact keeps its own', () => {
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
    expect(document.querySelector('[data-field="b"]')).toHaveClass('@[60rem]/sheet:col-span-6');
  });

  it('Compact: the first pair of a run starts a row; the pairs keep their own spans', () => {
    renderPair('compact');
    const [first, second] = Array.from(document.querySelectorAll('[data-field]'));
    expect(first).toHaveClass('@[60rem]/sheet:col-start-1');
    expect(second).not.toHaveClass('@[60rem]/sheet:col-start-1');
    expect(first).not.toHaveAttribute('data-keep-row');
    expect(first).toHaveClass('@[60rem]/sheet:col-span-6');
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
  const half = '@[60rem]/sheet:col-span-6';

  it('puts a group of up to four options in a half pair and a longer one on a row of its own', () => {
    const { container } = render(
      <FormLayoutProvider layout="compact">
        <Harness>
          <FormSheet>
            <FormSection id="c" title="Choices">
              <FormFields fields={[choice(4, 'short'), choice(5, 'long')]} />
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );
    expect(container.querySelector('[data-field="short"]')).toHaveClass(half);
    expect(container.querySelector('[data-field="long"]')).not.toHaveClass(half);
    expect(container.querySelector('[data-field="long"]')).toHaveClass('col-span-12');
  });
});
