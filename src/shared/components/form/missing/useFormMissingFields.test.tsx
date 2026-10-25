import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormProvider as RHFFormProvider, useForm } from 'react-hook-form';
import { z, type ZodIssue } from 'zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormFieldShell } from '../FormFieldShell';
import { FormSection } from '../FormSheet';
import type { FormField } from '../types';
import { buildFormMissingSummary, useFormMissingFields } from './useFormMissingFields';

// A stable t: the hook re-subscribes whenever it changes. It echoes the key and options so the
// assertions show which message was picked.
const tr = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}${JSON.stringify(options)}` : key,
}));
vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: tr.t }),
}));

const issue = (...path: (string | number)[]) =>
  ({ path, message: 'x', code: 'custom' }) as ZodIssue;

const build = (issues: ZodIssue[], configLabels?: Map<string, string>) =>
  buildFormMissingSummary(issues, { t: tr.t, configLabels });

const section = (id: string, title: string, inner: string) =>
  `<section id="${id}" aria-labelledby="${id}-title"><h3 id="${id}-title">${title}</h3>${inner}</section>`;

describe('buildFormMissingSummary', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('labels a field with the text its <label> draws, without the required mark', () => {
    document.body.innerHTML = section(
      'a',
      'Section A',
      '<div data-field="name"><label>ชื่อ<span class="req">*</span></label></div>',
    );
    const [{ items }] = build([issue('name')]).sections;
    expect(items).toEqual([{ key: 'name', label: 'ชื่อ', path: 'name' }]);
  });

  it('labels a group of controls by the element that names the group', () => {
    document.body.innerHTML = section(
      'a',
      'Section A',
      '<div data-field="kind"><span id="kind-l">ประเภท<span>*</span></span><div role="group" aria-labelledby="kind-l"></div></div>',
    );
    expect(build([issue('kind')]).sections[0].items[0].label).toBe('ประเภท');
  });

  it('falls back to the field config label, then to the humanised key', () => {
    const summary = build(
      [issue('note'), issue('someOtherField')],
      new Map([['note', 'Note (config)']]),
    );
    expect(summary.sections).toHaveLength(1);
    expect(summary.sections[0].items.map(i => i.label)).toEqual([
      'Note (config)',
      'Some Other Field',
    ]);
  });

  it('puts a field outside every titled section under "other", last', () => {
    document.body.innerHTML =
      '<div data-field="free"><label>Free</label></div>' +
      section('a', 'Section A', '<div data-field="name"><label>Name</label></div>');
    const summary = build([issue('free'), issue('name')]);
    expect(summary.sections.map(s => s.title)).toEqual(['Section A', 'missing.otherSection']);
    expect(summary.sections[1].items[0].label).toBe('Free');
  });

  it('orders the sections as the page does, not as the issues arrive', () => {
    document.body.innerHTML =
      section('a', 'Section A', '<div data-field="first"><label>First</label></div>') +
      section('b', 'Section B', '<div data-field="second"><label>Second</label></div>');
    const summary = build([issue('second'), issue('first')]);
    expect(summary.sections.map(s => s.id)).toEqual(['a', 'b']);
  });

  it('skips an untitled <section id> and uses the titled one around the field', () => {
    document.body.innerHTML = `<section id="outer" aria-labelledby="outer-title"><h3 id="outer-title">Outer</h3>
      <section id="anchor"><div data-field="name"><label>Name</label></div></section></section>`;
    expect(build([issue('name')]).sections[0]).toMatchObject({ id: 'outer', title: 'Outer' });
  });

  it('reads a row as "{label} #n", taking the label from any row when its own cell has none', () => {
    document.body.innerHTML = section(
      'b',
      'Section B',
      '<div data-field="rows.0.qty"><label>Qty</label></div><div data-field="rows.1.qty"></div>',
    );
    const [{ items }] = build([issue('rows', 0, 'qty'), issue('rows', 1, 'qty')]).sections;
    expect(items).toEqual([
      { key: 'rows.0.qty', label: 'missing.rowField{"label":"Qty","n":1}', path: 'rows.0.qty' },
      { key: 'rows.1.qty', label: 'missing.rowField{"label":"Qty","n":2}', path: 'rows.1.qty' },
    ]);
  });

  it('leaves out "row n" when every row draws a label of its own (a template factor per row)', () => {
    document.body.innerHTML = section(
      'f',
      'Factors',
      '<div data-field="factorData.0.value"><label>Land shape</label></div>' +
        '<div data-field="factorData.1.value"><label>Road width</label></div>',
    );
    const [{ items }] = build([issue('factorData', 1, 'value')]).sections;
    expect(items).toEqual([
      { key: 'factorData.1.value', label: 'Road width', path: 'factorData.1.value' },
    ]);
  });

  describe('a bare grid control (no wrapper)', () => {
    const grid = section(
      'calc',
      'Calculation',
      `<table>
        <thead>
          <tr><th rowspan="2">Factor</th><th rowspan="2">Weight</th><th colspan="2"><div>Market A</div><div>sub line</div></th></tr>
          <tr><th>Score</th><th>Weighted</th></tr>
        </thead>
        <tbody>
          <tr><td>Location</td><td><input data-field="rows.0.weight" data-grid-cell /></td>
              <td><input data-field="rows.0.surveys.0.score" data-grid-cell /></td><td>-</td></tr>
          <tr><td>Road</td><td><input name="rows.1.weight" /></td><td>-</td><td>-</td></tr>
        </tbody>
      </table>`,
    );

    it('is named by its row and its column headers, rowSpan and colSpan aware', () => {
      document.body.innerHTML = grid;
      const [{ items }] = build([
        issue('rows', 0, 'weight'),
        issue('rows', 0, 'surveys', 0, 'score'),
      ]).sections;
      expect(items.map(i => i.label)).toEqual(['Location · Weight', 'Location · Market A · Score']);
    });

    it('is found by its name when it has no data-field, and sits in its tab section', () => {
      document.body.innerHTML = grid;
      const [{ id, items }] = build([issue('rows', 1, 'weight')]).sections;
      expect(id).toBe('calc');
      expect(items[0].label).toBe('Road · Weight');
    });

    it('prefers data-field-label, then aria-label', () => {
      document.body.innerHTML = section(
        'a',
        'Section A',
        '<input data-field="x" data-field-label="Given" aria-label="Aria" />' +
          '<input data-field="y" aria-label="Aria only" />',
      );
      expect(build([issue('x'), issue('y')]).sections[0].items.map(i => i.label)).toEqual([
        'Given',
        'Aria only',
      ]);
    });

    it('reads a data-label-row row by its first element', () => {
      document.body.innerHTML = section(
        'a',
        'Section A',
        '<div data-label-row><label>Discount rate *</label><div><input data-field="discountRate" data-grid-cell /></div></div>',
      );
      expect(build([issue('discountRate')]).sections[0].items[0].label).toBe('Discount rate');
    });
  });

  describe('a control that stands for several paths (data-field-aliases)', () => {
    const picker =
      '<button type="button" data-field-aliases="collateralType pricingTemplateCode">Template</button>';
    const labels = new Map([
      ['collateralType', 'Collateral type'],
      ['pricingTemplateCode', 'Template'],
    ]);

    it('finds the one control for each path and labels each from the config', () => {
      document.body.innerHTML = picker;
      const summary = build([issue('collateralType'), issue('pricingTemplateCode')], labels);
      expect(summary.sections.flatMap(s => s.items.map(i => i.label))).toEqual([
        'Collateral type',
        'Template',
      ]);
    });

    it('keeps them under renderedOnly, since the control is on the page', () => {
      document.body.innerHTML = picker;
      const summary = buildFormMissingSummary(
        [issue('collateralType'), issue('pricingTemplateCode')],
        { t: tr.t, configLabels: labels, renderedOnly: true },
      );
      expect(summary.total).toBe(2);
    });

    it('prefers the real field once the popover that holds it is open', () => {
      document.body.innerHTML =
        picker + '<div data-field="collateralType"><label>Collateral type (open)</label></div>';
      const [{ items }] = build([issue('collateralType')], labels).sections;
      expect(items[0].label).toBe('Collateral type (open)');
    });
  });

  it('labels an array-level issue by the array, not by the first cell inside it', () => {
    document.body.innerHTML = section(
      'a',
      'Section A',
      '<div data-field="titles"><div data-field="titles.0.no"><label>No</label></div></div>',
    );
    const [{ id, items }] = build([issue('titles')]).sections;
    expect(id).toBe('a');
    expect(items[0]).toMatchObject({ label: 'Titles', path: 'titles' });
  });

  it('keeps one item per path and sums them into the total', () => {
    document.body.innerHTML = section(
      'a',
      'Section A',
      '<div data-field="name"><label>Name</label></div>',
    );
    const summary = build([issue('name'), issue('name'), issue('age')]);
    expect(summary.total).toBe(2);
    expect(summary.sections.flatMap(s => s.items).map(i => i.key)).toEqual(['name', 'age']);
  });

  it('lists the items of a section in page order, not schema order', () => {
    document.body.innerHTML = section(
      'loc',
      'Location',
      '<div data-field="subDistrict"><label>ตำบล</label></div>' +
        '<div data-field="latitude"><label>ละติจูด</label></div>' +
        '<div data-field="longitude"><label>ลองจิจูด</label></div>',
    );
    const [{ items }] = build([
      issue('latitude'),
      issue('longitude'),
      issue('subDistrict'),
    ]).sections;
    expect(items.map(i => i.label)).toEqual(['ตำบล', 'ละติจูด', 'ลองจิจูด']);
  });

  it('puts an item the page does not render last, in the order it came', () => {
    document.body.innerHTML =
      '<div data-field="free"><label>Free</label></div>' +
      '<div data-field="other"><label>Other</label></div>';
    const summary = build([issue('ghostB'), issue('other'), issue('ghostA'), issue('free')]);
    expect(summary.sections).toHaveLength(1);
    expect(summary.sections[0].items.map(i => i.key)).toEqual([
      'free',
      'other',
      'ghostB',
      'ghostA',
    ]);
  });

  describe('two items of a section with the same label', () => {
    const deed = '<h4 data-subheading>ที่อยู่ตามเอกสารสิทธิ์</h4>';
    const dopa = '<h4 data-subheading>ที่อยู่ตามทะเบียน</h4>';
    const field = (name: string) => `<div data-field="${name}"><label>ตำบล / แขวง</label></div>`;
    const issues = [issue('subDistrict'), issue('dopaSubDistrict')];

    it('get the sub-heading above each appended', () => {
      document.body.innerHTML = section(
        'loc',
        'Location',
        deed + field('subDistrict') + dopa + field('dopaSubDistrict'),
      );
      expect(build(issues).sections[0].items.map(i => i.label)).toEqual([
        'ตำบล / แขวง (ที่อยู่ตามเอกสารสิทธิ์)',
        'ตำบล / แขวง (ที่อยู่ตามทะเบียน)',
      ]);
    });

    it('fall back to the config label when no sub-heading tells them apart', () => {
      document.body.innerHTML = section(
        'loc',
        'Location',
        deed + field('subDistrict') + field('dopaSubDistrict'),
      );
      const labels = new Map([
        ['subDistrict', 'Sub District'],
        ['dopaSubDistrict', 'DOPA Sub District'],
      ]);
      expect(build(issues, labels).sections[0].items.map(i => i.label)).toEqual([
        'Sub District',
        'DOPA Sub District',
      ]);
    });

    it('stay as they are when nothing tells them apart', () => {
      document.body.innerHTML = section(
        'loc',
        'Location',
        field('subDistrict') + field('dopaSubDistrict'),
      );
      expect(build(issues).sections[0].items.map(i => i.label)).toEqual([
        'ตำบล / แขวง',
        'ตำบล / แขวง',
      ]);
    });

    it('are left alone when they sit in different sections', () => {
      document.body.innerHTML =
        section('a', 'A', deed + field('subDistrict')) +
        section('b', 'B', dopa + field('dopaSubDistrict'));
      expect(build(issues).sections.flatMap(s => s.items.map(i => i.label))).toEqual([
        'ตำบล / แขวง',
        'ตำบล / แขวง',
      ]);
    });
  });

  it('ignores an issue with no path and returns an empty summary for none', () => {
    expect(build([issue()])).toEqual({ total: 0, sections: [] });
    expect(build([])).toEqual({ total: 0, sections: [] });
  });
});

describe('useFormMissingFields', () => {
  const schema = z.object({ name: z.string().min(1), age: z.string().min(1) });
  // Conditional rule: `note` is required once `age` is 30. Zod's own schema has no rule for it, so
  // it can only come from `fields`.
  const fields = [
    { type: 'text-input', name: 'note', label: 'Note', requiredWhen: { field: 'age', is: '30' } },
  ] as unknown as FormField[];

  function Probe({ withFields }: { withFields?: boolean }) {
    const { summary } = useFormMissingFields({ schema, fields: withFields ? fields : undefined });
    return (
      <output data-testid="summary" data-total={summary?.total ?? 'none'}>
        {summary?.sections.map(s => `${s.title}:${s.items.map(i => i.label).join('|')}`).join(';')}
      </output>
    );
  }

  function Harness({ withFields }: { withFields?: boolean }) {
    const methods = useForm({ defaultValues: { name: '', age: '', note: '' } });
    return (
      <RHFFormProvider {...methods}>
        <FormSection id="a" title="Section A">
          <FormFieldShell name="name" label="ชื่อ" labelFor="name-input" required>
            <input id="name-input" {...methods.register('name')} />
          </FormFieldShell>
          <FormFieldShell name="age" label="อายุ" labelFor="age-input">
            <input id="age-input" {...methods.register('age')} />
          </FormFieldShell>
        </FormSection>
        <Probe withFields={withFields} />
      </RHFFormProvider>
    );
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const total = () => screen.getByTestId('summary').dataset.total;

  it('reads the labels and sections the page draws, on mount', () => {
    render(<Harness />);
    expect(total()).toBe('2');
    expect(screen.getByTestId('summary')).toHaveTextContent('Section A:ชื่อ|อายุ');
  });

  it('re-checks 300 ms after the last edit, not on every keystroke', () => {
    render(<Harness />);
    const input = document.getElementById('name-input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'x' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(total()).toBe('2');

    // another edit restarts the wait
    fireEvent.change(input, { target: { value: 'xy' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(total()).toBe('2');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(total()).toBe('1');
    expect(screen.getByTestId('summary')).toHaveTextContent('Section A:อายุ');
  });

  it('counts a conditional required field early only when given the configs', () => {
    const { unmount } = render(<Harness />);
    const age = document.getElementById('age-input') as HTMLInputElement;
    fireEvent.change(age, { target: { value: '30' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // only `name` is missing as far as the schema knows
    expect(total()).toBe('1');
    unmount();

    render(<Harness withFields />);
    const age2 = document.getElementById('age-input') as HTMLInputElement;
    fireEvent.change(age2, { target: { value: '30' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(total()).toBe('2');
    expect(screen.getByTestId('summary')).toHaveTextContent('missing.otherSection:Note');
  });
});
