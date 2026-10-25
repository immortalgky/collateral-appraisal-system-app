import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, within } from '@testing-library/react';
import { FormProvider, useForm, type FieldValues } from 'react-hook-form';
import { useParameterStore } from '@/shared/store';
import { requestTitleDefault } from '../../schemas/form';
import { TitleTable, TitleTableGroup } from './TitleTable';

vi.mock('../documentCard/usePaneLayout', () => ({
  useCardIsWide: () => [{ current: null }, true] as const,
}));
vi.mock('./titleHooks', () => ({ useMissingFieldLabel: () => (path: string) => path }));

const param = (group: string, code: string, description: string) => ({
  parId: Math.abs([...code].reduce((n, c) => n + c.charCodeAt(0), 0)),
  group,
  country: 'TH',
  language: 'en',
  code,
  description,
  isActive: true,
  seqNo: 1,
});

const title = (over: Record<string, unknown>) => ({
  ...structuredClone(requestTitleDefault),
  ...over,
});

function Harness({ titles }: { titles: Record<string, unknown>[] }) {
  const form = useForm<FieldValues>({ defaultValues: { titles } });
  return (
    <FormProvider {...form}>
      <TitleTableGroup hasEstate>
        {collapsed => (
          <TitleTable
            titles={titles as never}
            sigs={titles.map((_, i) => String(i))}
            missing={titles.map(() => [])}
            readOnly={false}
            canOrder
            dragOff={false}
            orderLocked={false}
            actions={{
              open: vi.fn(),
              duplicate: vi.fn(),
              remove: vi.fn(),
              moveTo: vi.fn(),
              moveToEdge: vi.fn(),
            }}
            onReorder={vi.fn()}
            kind="estate"
            heading="Estate"
            rows={titles.map((_, i) => i)}
            groupRows={titles.map((_, i) => i)}
            collapsed={collapsed}
          />
        )}
      </TitleTableGroup>
    </FormProvider>
  );
}

/** The deed cell (second column) of each body row. */
const deedCells = () =>
  Array.from(document.querySelectorAll('tbody tr')).map(row => row.children[2] as HTMLElement);

describe('TitleTable deed column', () => {
  beforeEach(async () => {
    await i18n.loadNamespaces('request');
    await i18n.changeLanguage('th');
    // What the DeedType master holds: DEED's caption covers the condominium unit deed as well.
    useParameterStore
      .getState()
      .setParameters([
        param('DeedType', 'DEED', 'โฉนดที่ดิน / อ.ช.2'),
        param('DeedType', 'NS3K', 'น.ส.3 ก.'),
      ]);
  });
  afterEach(async () => {
    useParameterStore.getState().setParameters([]);
    await i18n.changeLanguage('en');
  });

  it('names a land โฉนด on its own, never joined with the condominium caption', () => {
    render(
      <Harness
        titles={[
          title({ collateralType: '01', titleType: 'DEED', titleNumber: '12345', bookNumber: '2' }),
        ]}
      />,
    );
    const [cell] = deedCells();
    expect(cell).toHaveTextContent('โฉนดที่ดิน');
    expect(cell).not.toHaveTextContent('อ.ช.2');
  });

  it('shows another deed type under its own label', () => {
    render(
      <Harness
        titles={[title({ collateralType: '01', titleType: 'NS3K', titleNumber: '4421' })]}
      />,
    );
    expect(deedCells()[0]).toHaveTextContent('น.ส.3 ก.');
  });

  it('names a condominium by its unit, with floor and building under it', () => {
    render(
      <Harness
        titles={[
          title({
            collateralType: '08',
            titleType: 'DEED',
            roomNumber: '88/12',
            floorNumber: '8',
            buildingNumber: 'B',
          }),
        ]}
      />,
    );
    const [cell] = deedCells();
    expect(cell).toHaveTextContent('ห้องชุดเลขที่ 88/12');
    expect(cell).toHaveTextContent('ชั้น 8 · อาคาร B');
    expect(cell).not.toHaveTextContent('โฉนดที่ดิน');
  });

  it('a condominium with no unit number reads ห้องชุด alone', () => {
    render(<Harness titles={[title({ collateralType: '08', titleType: 'DEED' })]} />);
    const [cell] = deedCells();
    expect(cell).toHaveTextContent(/^ห้องชุด/);
    expect(cell).not.toHaveTextContent('เลขที่');
    // no floor or building: a muted dash under it
    expect(within(cell).getByText('—')).toBeInTheDocument();
  });

  it('leaves out the empty parts of the sub-line', () => {
    render(
      <Harness
        titles={[
          title({
            collateralType: '01',
            titleType: 'DEED',
            titleNumber: '12345',
            pageNumber: '45',
          }),
          title({ collateralType: '01', titleType: 'DEED', titleNumber: '', bookNumber: '2' }),
        ]}
      />,
    );
    const [first, second] = deedCells();
    expect(first).toHaveTextContent('12345 · หน้า 45');
    expect(first).not.toHaveTextContent('เล่ม');
    expect(second).toHaveTextContent('เล่ม 2');
    expect(second).not.toHaveTextContent('หน้า');
    expect(second.textContent).not.toMatch(/^[^·]*·/);
  });

  it('has no coloured dot', () => {
    render(
      <Harness
        titles={[
          title({ collateralType: '01', titleType: 'DEED', titleNumber: '1' }),
          title({ collateralType: '08', titleType: 'DEED', roomNumber: '1' }),
        ]}
      />,
    );
    for (const cell of deedCells()) expect(cell.querySelector('i')).toBeNull();
  });
});

const cellAt = (column: number) =>
  Array.from(document.querySelectorAll('tbody tr')).map(row => row.children[column] as HTMLElement);

describe('TitleTable details and area columns', () => {
  beforeEach(async () => {
    await i18n.loadNamespaces('request');
    await i18n.changeLanguage('th');
  });
  afterEach(() => i18n.changeLanguage('en'));

  it('writes the land position as plain text joined by " · ", with no chips', () => {
    render(
      <Harness
        titles={[
          title({
            collateralType: '01',
            titleType: 'DEED',
            rawang: '1234 || 1232-3',
            landParcelNumber: '123',
            surveyNumber: '123',
          }),
          title({ collateralType: '01', titleType: 'DEED' }),
        ]}
      />,
    );
    const [filled, empty] = cellAt(3);
    expect(filled).toHaveTextContent('ระวาง 1234 || 1232-3 · เลขที่ดิน 123 · หน้าสำรวจ 123');
    expect(filled.querySelector('.rounded-md, .bg-\\(--palette-surface-3\\)')).toBeNull();
    expect(within(filled).getByTitle(/ระวาง 1234 \|\| 1232-3 · เลขที่ดิน 123/)).toBeInTheDocument();
    // nothing to say: a dash
    expect(empty).toHaveTextContent('—');
  });

  it('shows a value that already carries its label once, not twice', () => {
    render(
      <Harness
        titles={[
          title({
            collateralType: '01',
            titleType: 'DEED',
            rawang: 'ระวาง 5003',
            landParcelNumber: '123',
          }),
        ]}
      />,
    );
    const [cell] = cellAt(3);
    expect(cell).toHaveTextContent('ระวาง 5003 · เลขที่ดิน 123');
    expect(cell).not.toHaveTextContent('ระวาง ระวาง');
    expect(within(cell).getByTitle('ระวาง 5003 · เลขที่ดิน 123')).toBeInTheDocument();
  });

  it('a land-with-building row shows its land area only, not the building area', () => {
    render(
      <Harness
        titles={[
          title({
            collateralType: '02',
            titleType: 'DEED',
            areaRai: 2,
            areaNgan: 1,
            areaSquareWa: 1,
            usableArea: 33,
          }),
        ]}
      />,
    );
    const [area] = cellAt(4);
    expect(area).toHaveTextContent('2-1-1 ไร่');
    expect(area).toHaveTextContent('ตร.ว.');
    expect(area).not.toHaveTextContent('อาคาร');
    expect(area).not.toHaveTextContent('33');
  });

  it('a condo row shows its usable area only, with no rai or square-wa line', () => {
    render(
      <Harness
        titles={[title({ collateralType: '08', titleType: 'DEED', usableArea: 32.5, areaRai: 5 })]}
      />,
    );
    const [area] = cellAt(4);
    expect(area).toHaveTextContent('32.5 ตร.ม.');
    expect(area).not.toHaveTextContent('ไร่');
    expect(area).not.toHaveTextContent('ตร.ว.');
  });
});
