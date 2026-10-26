import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { HeroModel } from '../scene3d/heroModel';
import type { SummaryItem } from '../scene3d/summaryItems';
import CollateralSummary from './CollateralSummary';

const hero: HeroModel = {
  title: 'บ้านเดี่ยว',
  subtitle: '',
  tiles: [{ icon: 'floors', label: 'ชั้น', value: '3 ชั้น' }],
  figure: {
    label: 'เนื้อที่ตามโฉนด',
    value: '8-3-9',
    unit: 'ไร่',
    caption: 'ราคาประเมินราชการ ตารางวาละ 25,000.00 บาท',
  },
  bars: [{ label: 'ขายแล้ว', percent: 33, note: '1 จาก 3 แปลง' }],
};

const machineItem: SummaryItem = {
  id: 'machine',
  kind: 'machine',
  title: 'เครื่องจักร',
  key: '7 เครื่อง',
  figure: null,
  lines: [],
  dev: [],
  devLabel: '',
  machines: [
    { head: 'ได้จดทะเบียน จำนวน 4 เครื่อง', lines: ['a', 'b', 'c', 'd'] },
    { head: 'ยังไม่จดทะเบียน จำนวน 3 เครื่อง', lines: ['e', 'f', 'g'] },
  ],
  kv: [],
};

const translations = vi.hoisted(() => vi.fn());
vi.mock('react-i18next', async importOriginal => {
  const real = await importOriginal<typeof import('react-i18next')>();
  return {
    ...real,
    useTranslation: (...args: Parameters<typeof real.useTranslation>) => {
      translations();
      return real.useTranslation(...args);
    },
  };
});

describe('CollateralSummary', () => {
  it('shows the overview tiles, the one big figure with its caption, and a real percentage bar', () => {
    const { container } = render(<CollateralSummary nf={String} hero={hero} items={[]} />);
    expect(container.querySelector('.cs3d-ov-v')!.textContent).toBe('3 ชั้น');
    expect(container.querySelector('.cs3d-hi-v')!.textContent).toBe('8-3-9 ไร่');
    expect(container.querySelector('.cs3d-hi-c')!.textContent).toContain('ราคาประเมินราชการ');
    const bar = screen.getByRole('progressbar', { name: 'ขายแล้ว' });
    expect(bar).toHaveAttribute('aria-valuenow', '33');
  });

  it('prints a bar to two decimals while the bar itself carries the exact value', () => {
    const withProgress: HeroModel = {
      ...hero,
      bars: [{ label: 'ความคืบหน้า', percent: 47.07, note: null }],
    };
    const nf = (n: number, digits = 0) =>
      n.toLocaleString('en-US', { maximumFractionDigits: digits });
    const { container } = render(<CollateralSummary nf={nf} hero={withProgress} items={[]} />);
    expect(container.querySelector('.cs3d-bar-t b')!.textContent).toBe('47.07%');
    expect(screen.getByRole('progressbar', { name: 'ความคืบหน้า' })).toHaveAttribute(
      'aria-valuenow',
      '47.07',
    );
  });

  it('shows a warning under a tile value it flags, and none under the others', () => {
    const flagged: HeroModel = {
      ...hero,
      tiles: [
        { icon: 'floors', label: 'ชั้น', value: '120 ชั้น', note: 'เกินที่วาดได้' },
        { icon: 'area', label: 'เนื้อที่', value: '1-0-0 ไร่' },
      ],
    };
    const { container } = render(<CollateralSummary nf={String} hero={flagged} items={[]} />);
    expect([...container.querySelectorAll('.cs3d-ov-w')].map(e => e.textContent)).toEqual([
      'เกินที่วาดได้',
    ]);
  });

  it('leaves out the cards that have nothing to say', () => {
    const { container } = render(
      <CollateralSummary
        nf={String}
        hero={{ ...hero, tiles: [], figure: null, bars: [] }}
        items={[]}
      />,
    );
    expect(container.querySelector('.cs3d-ov')).toBeNull();
    expect(container.querySelector('.cs3d-hi')).toBeNull();
    expect(container.querySelector('.cs3d-ins')).toBeNull();
    expect(container.querySelector('.cs3d-listcard')).not.toBeNull();
  });

  it('lists the first five machines, numbered per section, and opens the rest on request', () => {
    const { container } = render(
      <CollateralSummary nf={String} hero={hero} items={[machineItem]} />,
    );
    const lines = [...container.querySelectorAll('.cs3d-mach p')];
    expect(lines.map(p => p.textContent)).toEqual([
      '1. a',
      '2. b',
      '3. c',
      '4. d',
      '1. e',
      '2. f',
      '3. g',
    ]);
    // the fifth on is held back until the toggle opens the list
    expect(lines.map(p => p.classList.contains('more'))).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
    const toggle = container.querySelector<HTMLButtonElement>('.cs3d-tog')!;
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(container.querySelector('.cs3d-mach')!.classList.contains('open')).toBe(true);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('prints the report sentence, the development items under their label, and project rows with "-" for a blank', () => {
    const item: SummaryItem = {
      id: 'building',
      kind: 'building',
      title: 'สิ่งปลูกสร้าง',
      key: null,
      figure: { value: '630', unit: 'ตร.ว.' },
      lines: ['บ้านเดี่ยว 3 ชั้น'],
      dev: ['รั้ว พื้นที่ 144 ตารางเมตร'],
      devLabel: 'ส่วนพัฒนา',
      machines: [],
      kv: [{ label: 'เจ้าของโครงการ', value: null }],
    };
    const { container } = render(<CollateralSummary nf={String} hero={hero} items={[item]} />);
    expect(container.querySelector('.cs3d-sent')!.textContent).toBe('บ้านเดี่ยว 3 ชั้น');
    expect(container.querySelector('.cs3d-plain-l')!.textContent).toBe('ส่วนพัฒนา');
    expect(container.querySelector('.cs3d-fig')!.textContent).toBe('630 ตร.ว.');
    expect(container.querySelector('.cs3d-kvs dd')!.textContent).toBe('-');
  });

  it('does not render again when its parent renders with the same props', () => {
    const items: SummaryItem[] = [];
    const Parent = ({ n }: { n: number }) => (
      <div data-n={n}>
        <CollateralSummary nf={String} hero={hero} items={items} />
      </div>
    );
    translations.mockClear();
    const { rerender } = render(<Parent n={1} />);
    const first = translations.mock.calls.length;
    expect(first).toBeGreaterThan(0);
    rerender(<Parent n={2} />);
    expect(translations.mock.calls.length).toBe(first);
  });

  it("starts collapsed again when another appraisal's list takes the place of this one", () => {
    const many = (prefix: string): SummaryItem => ({
      ...machineItem,
      machines: [
        {
          head: `${prefix} head`,
          lines: Array.from({ length: 7 }, (_, i) => `${prefix}${i}`),
        },
      ],
    });
    const { rerender } = render(<CollateralSummary nf={String} hero={hero} items={[many('a')]} />);
    const toggle = () => screen.getByRole('button', { expanded: false })!;
    fireEvent.click(toggle());
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
    rerender(<CollateralSummary nf={String} hero={hero} items={[many('b')]} />);
    expect(screen.queryByRole('button', { expanded: true })).toBeNull();
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });
});
