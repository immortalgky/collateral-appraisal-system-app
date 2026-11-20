import { describe, expect, it } from 'vitest';
import '@/i18n';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { render, screen } from '@/test/test-utils';
import NumberInput from '../inputs/NumberInput';
import { compactJoins } from './compactPairs';
import { FormFields } from './FormFields';
import { FormLayoutProvider } from './FormLayoutProvider';
import { FormProvider } from './FormProvider';
import { FormSection, FormSheet } from './FormSheet';
import { FormTable, FormTableBlock } from './table';
import { PART_WIDTH } from './partWidth';
import { useParameterStore } from '@/shared/store';
import { landFillField } from '@/features/appraisal/configs/fields';
import type { FormField } from './types';

const schema = z.object({}).passthrough();

function Harness({ children }: { children: ReactNode }) {
  const methods = useForm({ defaultValues: {} });
  return (
    <FormProvider methods={methods} schema={schema}>
      {children}
    </FormProvider>
  );
}

const num = (name: string, label: string, extra: Partial<FormField> = {}): FormField =>
  ({ type: 'number-input', name, label, ...extra }) as FormField;
const text = (name: string, label: string): FormField => ({ type: 'text-input', name, label });

const renderFields = (layout: 'standard' | 'compact', fields: FormField[]) =>
  render(
    <FormLayoutProvider layout={layout}>
      <Harness>
        <FormSheet>
          <FormSection id="s" title="S">
            <FormFields fields={fields} />
          </FormSection>
        </FormSheet>
      </Harness>
    </FormLayoutProvider>,
  );

describe('compactJoins', () => {
  it('joins the declared names only when they are next to each other, in order', () => {
    const f = (name: string) => ({ name });
    expect([...compactJoins([f('a'), f('latitude'), f('longitude'), f('b')]).keys()]).toEqual([
      'latitude',
    ]);
    expect(compactJoins([f('latitude'), f('a'), f('longitude')]).size).toBe(0);
    // any order in the list, drawn in the declared one
    const reversed = compactJoins([f('numberOfSidesFacingRoad'), f('roadFrontage')]);
    expect([...reversed.keys()]).toEqual(['numberOfSidesFacingRoad']);
    expect(
      compactJoins([f('roadFrontage'), f('numberOfSidesFacingRoad')]).get('roadFrontage')?.fields,
    ).toEqual([f('numberOfSidesFacingRoad'), f('roadFrontage')]);
    expect(compactJoins([f('width'), f('length')]).size).toBe(0);
    expect(compactJoins([f('width'), f('length'), f('height')]).get('width')?.separator).toBe('×');
  });

  it('does not join a field that can hide', () => {
    const joins = compactJoins([
      { name: 'soi' },
      { name: 'distanceFromMainRoad', showWhen: { field: 'x', is: 1 } },
    ]);
    expect(joins.size).toBe(0);
  });
});

describe('Compact joined rows', () => {
  const coords = [num('latitude', 'Latitude'), num('longitude', 'Longitude')];

  it('draws coordinates as one pair: one label, both controls', () => {
    const { container } = renderFields('compact', coords);
    expect(container.querySelectorAll('[data-half]')).toHaveLength(1);
    const pair = container.querySelector('[data-field="latitude"]') as HTMLElement;
    expect(pair).toHaveTextContent('Latitude / Longitude');
    // each control keeps a name of its own, and a form error on the second still finds its field
    expect(screen.getByRole('textbox', { name: 'Latitude' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Longitude' })).toBeInTheDocument();
    expect(pair.querySelector('[data-field="longitude"]')).not.toBeNull();
  });

  it('Standard keeps two separate fields', () => {
    const { container } = renderFields('standard', coords);
    expect(container.querySelectorAll('[data-field]')).toHaveLength(2);
    expect(container.querySelector('[data-half]')).toBeNull();
  });

  it('joins width x length x height with separators, each control keeping its own unit', () => {
    const { container } = renderFields('compact', [
      num('width', 'Width', { suffix: 'unit-x' }),
      num('length', 'Length', { suffix: 'unit-x' }),
      num('height', 'Height', { suffix: 'unit-x' }),
    ]);
    expect(container.querySelector('[data-field="width"]')).toHaveTextContent(
      'Width × Length × Height',
    );
    expect(screen.getAllByText('×')).toHaveLength(2); // between the controls
    expect(screen.getAllByText('unit-x')).toHaveLength(3);
  });

  it('shows a required mark when any of the fields is required', () => {
    renderFields('compact', [
      num('soi', 'Soi'),
      num('distanceFromMainRoad', 'Distance', { required: true }),
    ]);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('leaves the fields apart when something sits between them', () => {
    const { container } = renderFields('compact', [
      num('latitude', 'Latitude'),
      text('x', 'X'),
      num('longitude', 'Longitude'),
    ]);
    expect(container.querySelectorAll('[data-half]')).toHaveLength(3);
  });
});

describe('Compact row fill and label', () => {
  it('a half grows, so one with no partner fills the row; a whole-row field does not grow', () => {
    const { container } = renderFields('compact', [
      text('a', 'A'),
      { type: 'textarea', name: 't', label: 'T' },
    ]);
    const a = container.querySelector('[data-field="a"]') as HTMLElement;
    expect(a).toHaveClass('grow', '@[60rem]/sheet:basis-1/2');
    expect(container.querySelector('[data-field="t"]')).toHaveClass('basis-full');
    // the section body wraps its pairs and gives anything else the whole row
    expect(a.parentElement).toHaveClass('flex', 'flex-wrap');
  });

  it('aligns the label to the top for a tall control and keeps it centred for a single line', () => {
    const { container } = renderFields('compact', [
      text('a', 'A'),
      { type: 'textarea', name: 't', label: 'T' },
      { type: 'radio-group', name: 'r', label: 'R', options: [] },
    ]);
    const label = (name: string) =>
      container.querySelector(`[data-field="${name}"] > div`) as HTMLElement;
    expect(label('a')).toHaveClass('items-center');
    expect(label('t')).toHaveClass('items-start');
    expect(label('r')).toHaveClass('items-start');
    expect(container.querySelector('[data-field="a"]')).toHaveClass(
      'grid-cols-[13.1429rem_minmax(0,1fr)]',
    );
  });

  it('a decimal table cell input is at least 96px wide in Compact only', () => {
    const cell = (layout: 'standard' | 'compact', decimalPlaces: number) =>
      render(
        <FormLayoutProvider layout={layout}>
          <NumberInput cell decimalPlaces={decimalPlaces} aria-label="amount" />
        </FormLayoutProvider>,
      ).container.querySelector('input')!.parentElement as HTMLElement;
    const min = 'min-w-[6.8571rem]';
    expect(cell('compact', 2)).toHaveClass(min);
    expect(cell('compact', 0)).not.toHaveClass(min);
    expect(cell('standard', 2)).not.toHaveClass(min);
  });
});

describe('Compact full-row fields', () => {
  it('the road in front takes a row; the two widths after it share the next one', () => {
    const fields = [
      text('roadPassInFrontOfLand', 'Road'),
      num('carriagewayWidth', 'Carriageway'),
      num('rightOfWayWidth', 'Right of way'),
    ];
    const compact = renderFields('compact', fields);
    const road = compact.container.querySelector('[data-field="roadPassInFrontOfLand"]');
    expect(road).toHaveClass('basis-full');
    expect(road).not.toHaveAttribute('data-half');
    for (const n of ['carriagewayWidth', 'rightOfWayWidth']) {
      const w = compact.container.querySelector(`[data-field="${n}"]`);
      expect(w).toHaveAttribute('data-half');
      expect(w).toHaveClass('@[60rem]/sheet:basis-1/2');
    }
    compact.unmount();
    // Standard keeps the field's own span
    const std = renderFields('standard', [
      { ...fields[0], wrapperClassName: 'col-span-6' } as FormField,
    ]);
    expect(std.container.querySelector('[data-field="roadPassInFrontOfLand"]')).toHaveClass(
      'col-span-6',
    );
  });
});

describe('Compact road block', () => {
  const road = [
    text('roadPassInFrontOfLand', 'Road'),
    num('carriagewayWidth', 'Carriageway', { suffix: 'unit-x' }),
    num('rightOfWayWidth', 'Right of way'),
    num('numberOfLanes', 'Lanes'),
    num('roadFrontage', 'Frontage'),
    num('numberOfSidesFacingRoad', 'Sides'),
  ];

  it('is the road on a row, then two joined halves; the right one in declared order', () => {
    const { container } = renderFields('compact', road);
    const rows = Array.from(container.querySelectorAll('[data-field]')).filter(
      el => el.parentElement === container.querySelector('section > div'),
    );
    expect(rows.map(r => r.getAttribute('data-field'))).toEqual([
      'roadPassInFrontOfLand',
      'carriagewayWidth',
      'numberOfSidesFacingRoad',
    ]);
    const [, left, right] = rows;
    expect(left).toHaveTextContent('Carriageway / Right of way / Lanes');
    // the right half is drawn sides first, then the frontage, as declared
    expect(right).toHaveTextContent('Sides / Frontage');
    const names = Array.from(right.querySelectorAll('[data-field]')).map(e =>
      e.getAttribute('data-field'),
    );
    expect(names).toEqual(['numberOfSidesFacingRoad', 'roadFrontage']);
    // joined labels align to the top; three controls are a half only from a wider sheet
    expect(left.firstElementChild).toHaveClass('items-start');
    expect(left).toHaveClass('@[72rem]/sheet:basis-1/2');
    expect(right).toHaveClass('@[60rem]/sheet:basis-1/2');
    expect(screen.getAllByText('unit-x')).toHaveLength(1); // each keeps its own unit
  });
});

describe('Compact joined rows ignore the Standard span runs', () => {
  const rowOf = (name: string, fields: FormField[]) => {
    const { container, unmount } = renderFields('compact', fields);
    const el = container.querySelector(`[data-field="${name}"]`) as HTMLElement;
    const out = {
      className: el.className,
      broken: el.previousElementSibling?.getAttribute('aria-hidden') === 'true',
    };
    unmount();
    return out;
  };

  it('is the same whether the spans make the first field a run start or a member', () => {
    // 5 + 4 + 3: street starts the run, soi is a member. 12 + 4 + 4 + 4: the first joined field starts a run.
    const asMember = rowOf(
      'soi',
      [text('street', 'Street'), num('soi', 'Soi'), num('distanceFromMainRoad', 'Distance')].map(
        (f, i) => ({ ...f, wrapperClassName: ['col-span-5', 'col-span-4', 'col-span-3'][i] }),
      ),
    );
    const asStart = rowOf(
      'soi',
      [num('soi', 'Soi'), num('distanceFromMainRoad', 'Distance')].map(f => ({
        ...f,
        wrapperClassName: 'col-span-6',
      })),
    );
    expect(asMember).toEqual(asStart);
    expect(asStart.broken).toBe(false);
  });

  it('never starts a row of its own, so two joined halves sit side by side', () => {
    const road = (spans: string[]) =>
      [
        'carriagewayWidth',
        'rightOfWayWidth',
        'numberOfLanes',
        'roadFrontage',
        'numberOfSidesFacingRoad',
      ].map((n, i) => ({ ...num(n, n), wrapperClassName: spans[i] })) as FormField[];
    // road spans 4+4+4 then 6+6 (Standard): each run would start a row
    const { container } = renderFields(
      'compact',
      road(['col-span-4', 'col-span-4', 'col-span-4', 'col-span-6', 'col-span-6']),
    );
    expect(container.querySelectorAll('[aria-hidden="true"].h-0')).toHaveLength(0);
    expect(container.querySelectorAll('[data-half]')).toHaveLength(2);
  });
});

describe('Compact building floors and area', () => {
  it('joins floors and usable area; a following half shares the row (across a list boundary)', () => {
    const { container } = render(
      <FormLayoutProvider layout="compact">
        <Harness>
          <FormSheet>
            <FormSection id="s" title="S">
              <FormFields
                fields={[
                  { ...num('numberOfFloors', 'Floors'), wrapperClassName: 'col-span-3' },
                  { ...num('totalBuildingArea', 'Area'), wrapperClassName: 'col-span-4' },
                ]}
              />
              <FormFields fields={[text('next', 'Next')]} />
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );
    const joined = container.querySelector('[data-field="numberOfFloors"]') as HTMLElement;
    expect(joined).toHaveTextContent('Floors / Area');
    expect(container.querySelector('[data-field="totalBuildingArea"]')).toBe(
      joined.querySelector('[data-field="totalBuildingArea"]'),
    );
    // the next half sits right after it in the same row container: no break between
    expect(joined.nextElementSibling).toBe(container.querySelector('[data-field="next"]'));
    expect(joined).toHaveAttribute('data-half');
    expect(joined.nextElementSibling).toHaveAttribute('data-half');
  });
});

describe('Compact section body children', () => {
  it('gives an arbitrary custom child the whole row, and a pair in a grid of its own its columns', () => {
    const { container } = render(
      <FormLayoutProvider layout="compact">
        <Harness>
          <FormSheet>
            <FormSection id="s" title="S">
              <div id="custom">custom block</div>
              <span id="inline-custom">another</span>
              <div className="col-span-12 grid grid-cols-12 gap-4" id="nested">
                <FormFields fields={[text('a', 'A'), text('b', 'B')]} />
              </div>
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );
    const body = container.querySelector('section > div') as HTMLElement;
    expect(body).toHaveClass('flex', 'flex-wrap');
    // the body gives every child that is not a half pair the whole row, whatever it is
    expect(body.className).toContain('[&>:not([data-half])]:basis-full');
    expect(container.querySelector('#custom')!.parentElement).toBe(body);
    expect(container.querySelector('#inline-custom')!.parentElement).toBe(body);
    // a 12-column grid of a form's own around fields becomes the same wrapping rows, with no gaps
    expect(body.className).toContain('[&_.grid-cols-12:has(>[data-field])]:flex-wrap');
    expect(body.className).toContain('[&_.grid-cols-12:has(>[data-field])]:gap-0');
    // a pair inside a 12-column grid of a form's own still has its grid span
    const a = container.querySelector('#nested [data-field="a"]') as HTMLElement;
    expect(a).toHaveClass('col-span-12', '@[60rem]/sheet:col-span-6');
  });
});

describe('Compact lease parties', () => {
  it('draws the contract number alone, then lessor | lessee, then the dates in order', () => {
    const names = [
      'contractNo',
      'lessorName',
      'lesseeName',
      'leaseStartDate',
      'leaseEndDate',
      'leasePeriodAsContract',
      'remainingLeaseAsAppraisalDate',
    ];
    const spans = [4, 4, 4, 3, 3, 3, 3];
    const { container } = renderFields(
      'compact',
      names.map(
        (n, i) => ({ ...text(n, n), wrapperClassName: `col-span-${spans[i]}` }) as FormField,
      ),
    );
    const kids = Array.from(container.querySelector('section > div')!.children).filter(
      k => k.getAttribute('aria-hidden') !== 'true',
    );
    expect(kids.map(k => k.getAttribute('data-field'))).toEqual(names);
    expect(kids[0]).toHaveClass('basis-full');
    expect(kids[0]).not.toHaveAttribute('data-half');
    // lessor and lessee are two halves of one row: nothing breaks between them
    expect(kids[1]).toHaveAttribute('data-half');
    expect(kids[2]).toHaveAttribute('data-half');
    expect(kids[1].nextElementSibling).toBe(kids[2]);
    // the four dates are four halves, two rows
    expect(container.querySelectorAll('[data-half]')).toHaveLength(6);
  });
});

describe('Compact land physical rows', () => {
  const pond = [num('pondArea', 'Pond area'), num('pondDepth', 'Pond depth')];
  const withSpans = (spans: string[]) =>
    [...landFillField, ...pond].map((f, i) => ({ ...f, wrapperClassName: spans[i] }) as FormField);
  // five options: a long chip group, a row of its own in Compact
  const seed = () =>
    useParameterStore.getState().setParameters(
      ['01', '02', '03', '04', '99'].map((code, i) => ({
        parId: i,
        group: 'Landfill',
        country: 'th',
        language: 'en',
        code,
        description: `Option ${code}`,
        isActive: true,
        seqNo: i + 1,
      })) as never,
    );

  // The chips (6 in the form), the folded "other", percent, soil level, pond area and depth.
  // Standard spans differ between versions of the form; Compact must pair the same either way.
  it.each([
    [
      '6 + 6 rows',
      ['col-span-6', 'col-span-12', 'col-span-6', 'col-span-6', 'col-span-6', 'col-span-6'],
    ],
    [
      '3 + 3 rows',
      ['col-span-6', 'col-span-12', 'col-span-3', 'col-span-3', 'col-span-3', 'col-span-3'],
    ],
  ])('pairs percent | soil level and pond area | depth (%s)', (_name, spans) => {
    seed();
    const { container } = renderFields('compact', withSpans(spans));
    const kids = Array.from(container.querySelector('section > div')!.children);
    const at = (name: string) => kids.findIndex(k => k.getAttribute('data-field') === name);
    // the chips are a row of their own (five options), percent and soil sit next to each other,
    // and so do pond area and depth
    expect(kids[at('landFillType')]).not.toHaveAttribute('data-half');
    expect(at('landFillTypeOther')).toBe(-1);
    expect(at('soilLevel') - at('landFillPercent')).toBe(1);
    expect(at('pondDepth') - at('pondArea')).toBe(1);
    expect(container.querySelectorAll('[data-half]')).toHaveLength(4);
  });
});

describe('Compact table with a title', () => {
  const renderBlock = (layout: 'standard' | 'compact', title?: string, compactTitle?: string) =>
    render(
      <FormLayoutProvider layout={layout}>
        <Harness>
          <FormSheet>
            <FormSection id="s" title="S">
              <div className="col-span-12" id="wrap">
                <FormTableBlock title={title} compactTitle={compactTitle}>
                  <FormTable
                    columns={[{ key: 'a', header: 'A', cell: (r: number) => r }]}
                    rows={[1]}
                    rowKey={r => String(r)}
                    add={[{ label: '+ Add', onClick: () => {} }]}
                  />
                </FormTableBlock>
              </div>
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );

  it('puts the title in the label column and the table in the control column', () => {
    const { container } = renderBlock('compact', 'Boundary');
    const pair = container.querySelector('#wrap > div') as HTMLElement;
    expect(pair).toHaveClass('grid-cols-[13.1429rem_minmax(0,1fr)]');
    const [label, control] = Array.from(pair.children);
    expect(label).toHaveTextContent('Boundary');
    expect(label).toHaveClass('items-start');
    expect(control).toContainElement(screen.getByRole('table'));
    // the add link follows the title, in the label column
    expect(label).toContainElement(screen.getByRole('button', { name: /Add/ }));
  });

  it('keeps the whole row, with no label cell, when there is no title', () => {
    const { container } = renderBlock('compact');
    expect(container.querySelector('#wrap')!.firstElementChild).toBe(
      container.querySelector('#wrap > div'),
    );
    expect(container.querySelector('[class*="13.1429rem"]')).toBeNull();
  });

  it('a compact-only title gives a table with no heading the label column; Standard stays bare', () => {
    const compact = renderBlock('compact', undefined, 'Floors');
    const pair = compact.container.querySelector('#wrap > div') as HTMLElement;
    expect(pair).toHaveClass('grid-cols-[13.1429rem_minmax(0,1fr)]');
    expect(pair.firstElementChild).toHaveTextContent('Floors');
    compact.unmount();
    const standard = renderBlock('standard', undefined, 'Floors');
    expect(screen.queryByText('Floors')).toBeNull();
    expect(standard.container.querySelector('#wrap')!.firstElementChild!.tagName).not.toBe('H4');
    expect(standard.container.querySelector('[class*="13.1429rem"]')).toBeNull();
  });

  it('a wide table keeps the label column only from 66rem of sheet', () => {
    const { container } = render(
      <FormLayoutProvider layout="compact">
        <Harness>
          <FormSheet>
            <FormSection id="s" title="S">
              <div className="col-span-12" id="wrap">
                <FormTableBlock title="Floors" wide>
                  <p>table</p>
                </FormTableBlock>
              </div>
            </FormSection>
          </FormSheet>
        </Harness>
      </FormLayoutProvider>,
    );
    const pair = container.querySelector('#wrap > div') as HTMLElement;
    expect(pair).toHaveClass('grid-cols-1', '@[66rem]/sheet:grid-cols-[13.1429rem_minmax(0,1fr)]');
    expect(pair.firstElementChild).toHaveClass('border-b', '@[66rem]/sheet:border-r');
  });

  it('Standard keeps the heading above the table', () => {
    const { container } = renderBlock('standard', 'Boundary');
    expect(container.querySelector('[class*="13.1429rem"]')).toBeNull();
    const heading = screen.getByText('Boundary');
    expect(heading.className).toContain('border-b');
    expect(
      heading.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('part-width fields in Compact', () => {
  it('keeps the Standard part width and drops it for a Compact pair', () => {
    const field = (name: string, width: string) =>
      ({ ...text(name, name), wrapperClassName: `col-span-12 ${width}` }) as FormField;
    const fields = [field('half', PART_WIDTH.half), field('quarter', PART_WIDTH.quarter)];
    const standard = renderFields('standard', fields);
    expect(standard.container.querySelector('[data-field="half"]')).toHaveClass(
      'w-[calc(50%-0.5714rem)]',
    );
    standard.unmount();
    const { container } = renderFields('compact', fields);
    for (const n of ['half', 'quarter']) {
      const cls = container.querySelector(`[data-field="${n}"]`)!.className;
      expect(cls).not.toMatch(/\bw-\[calc|\bmin-w-\[|\bw-full/);
    }
  });
});
