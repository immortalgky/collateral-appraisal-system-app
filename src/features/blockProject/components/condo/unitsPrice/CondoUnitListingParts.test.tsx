import { describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import type { ProjectType, ProjectUnit } from '../../../types';
import { CondoUnitFilters, CondoUnitTable } from './CondoUnitListingParts';

// The typed `t` only takes known keys; this one is built from a runtime string
const col = (key: string) =>
  i18n.t(`blockProject:unitListing.cols.${key}` as never, undefined as never) as unknown as string;

const unit = (over: Partial<ProjectUnit>): ProjectUnit => ({
  id: 'u',
  projectId: 'p',
  uploadBatchId: 'b',
  sequenceNumber: 1,
  isSold: false,
  ...over,
});

const plots = [
  unit({
    id: 'u1',
    sequenceNumber: 1,
    plotNumber: 'A-01',
    houseNumber: '99/1',
    modelType: 'Monaco',
    numberOfFloors: 2,
    landArea: 50.5,
    usableArea: 120,
    sellingPrice: 5_000_000,
  }),
  unit({
    id: 'u2',
    sequenceNumber: 2,
    plotNumber: 'A-02',
    modelType: 'Monaco',
    numberOfFloors: 2,
    landArea: 40,
    usableArea: 100,
    sellingPrice: 4_000_000,
    isSold: true,
  }),
];

const renderTable = (projectType: ProjectType) =>
  render(
    <CondoUnitTable
      projectType={projectType}
      units={plots}
      filteredCount={plots.length}
      totalLand={90.5}
      totalArea={220}
      totalPrice={9_000_000}
      pageNumber={0}
      pageSize={50}
      totalPages={1}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
    />,
  );

const headers = () => screen.getAllByRole('columnheader').map(h => h.textContent);

describe('CondoUnitTable column sets', () => {
  it('Land and Building: plot, house, status, model, floors, land, usable area, price', () => {
    renderTable('LB');

    expect(headers()).toEqual([
      col('sqNo'),
      col('plotNo'),
      col('houseNo'),
      col('saleStatus'),
      col('modelName'),
      col('numFloors'),
      col('landAreaSqWa'),
      col('usableAreaSqm'),
      col('sellingPriceBaht'),
    ]);
    const row = screen.getByText('A-01').closest('tr') as HTMLElement;
    expect(within(row).getByText('99/1')).toBeInTheDocument();
    expect(within(row).getByText('Monaco')).toBeInTheDocument();
    // Areas and price carry two decimals.
    expect(within(row).getByText('50.50')).toBeInTheDocument();
    expect(within(row).getByText('120.00')).toBeInTheDocument();
    expect(within(row).getByText('5,000,000.00')).toBeInTheDocument();
  });

  it('Land and Building: the totals row sums land, usable area and price of the filtered set', () => {
    renderTable('LB');

    const footer = screen.getByText('Total 2 units (filtered)').closest('tr') as HTMLElement;
    expect(within(footer).getAllByRole('cell')).toHaveLength(4);
    expect(within(footer).getByText('90.50')).toBeInTheDocument();
    expect(within(footer).getByText('220.00')).toBeInTheDocument();
    expect(within(footer).getByText('9,000,000.00')).toBeInTheDocument();
  });

  it('L (land only): plot, house, status, land and price only', () => {
    renderTable('L');

    expect(headers()).toEqual([
      col('sqNo'),
      col('plotNo'),
      col('houseNo'),
      col('saleStatus'),
      col('landAreaSqWa'),
      col('sellingPriceBaht'),
    ]);
    const row = screen.getByText('A-02').closest('tr') as HTMLElement;
    expect(within(row).getByText('40.00')).toBeInTheDocument();
    expect(within(row).queryByText('Monaco')).toBeNull();
    // A plot with no house number shows a dash, not a blank.
    expect(within(row).getByText('—')).toBeInTheDocument();

    const footer = screen.getByText('Total 2 units (filtered)').closest('tr') as HTMLElement;
    expect(within(footer).getAllByRole('cell')).toHaveLength(3);
    expect(within(footer).queryByText('220.00')).toBeNull();
  });

  it('Condo keeps its tower and room columns', () => {
    renderTable('U');

    expect(headers()).toEqual([
      col('sqNo'),
      col('floor'),
      col('towerName'),
      i18n.t('blockProject:condoUnitsPrice.cols.roomNumber'),
      i18n.t('blockProject:condoUnitsPrice.cols.unitNo'),
      col('saleStatus'),
      col('modelType'),
      col('usableAreaSqm'),
      col('sellingPriceBaht'),
    ]);
  });
});

describe('CondoUnitFilters', () => {
  const renderFilters = (projectType: ProjectType) =>
    render(
      <CondoUnitFilters
        projectType={projectType}
        saleFilter="all"
        saleCounts={{ all: 3, available: 2, sold: 1 }}
        onSaleFilter={vi.fn()}
        towers={[
          { name: 'A', count: 2 },
          { name: 'B', count: 1 },
        ]}
        towerFilter=""
        towerAllCount={3}
        onTowerFilter={vi.fn()}
        modelOptions={['Monaco', 'Venice']}
        models={[
          { name: 'Monaco', count: 2 },
          { name: 'Venice', count: 1 },
        ]}
        modelAllCount={3}
        modelFilter=""
        onModelFilter={vi.fn()}
        floorOptions={[1, 2]}
        floorFilter=""
        onFloorFilter={vi.fn()}
        query=""
        onQuery={vi.fn()}
        shown={3}
        total={3}
      />,
    );

  it('Land and Building: status chips, then one chip per model; no tower chips, no floor filter', () => {
    renderFilters('LB');

    expect(screen.getByRole('group', { name: col('saleStatus') })).toBeInTheDocument();
    const models = screen.getByRole('group', { name: col('modelName') });
    expect(within(models).getByRole('button', { name: /^Monaco\s*2$/ })).toBeInTheDocument();
    expect(within(models).getByRole('button', { name: /^Venice\s*1$/ })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: col('towerName') })).toBeNull();
    expect(screen.queryByRole('button', { name: col('floor') })).toBeNull();
    // The model is a chip row here, not the Condo select.
    expect(screen.queryByRole('button', { name: col('modelType') })).toBeNull();
    expect(
      screen.getByRole('textbox', { name: i18n.t('blockProject:lbLists.units.searchPlaceholder') }),
    ).toBeInTheDocument();
  });

  it('L (land only): the status chips and search only', () => {
    renderFilters('L');

    expect(screen.getByRole('group', { name: col('saleStatus') })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: col('modelName') })).toBeNull();
    expect(screen.queryByRole('group', { name: col('towerName') })).toBeNull();
    expect(screen.queryByRole('button', { name: col('floor') })).toBeNull();
    expect(screen.queryByRole('button', { name: col('modelType') })).toBeNull();
  });

  it('Condo: model select, floor select and tower chips, no model chips', () => {
    renderFilters('U');

    expect(screen.getByRole('button', { name: col('modelType') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: col('floor') })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: col('towerName') })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: col('modelName') })).toBeNull();
  });
});
