import { describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, screen } from '@/test/test-utils';
import type { ReappraisalPreviewResult, ReappraisalPreviewUnit } from '../api/projectUnit';
import UnitVerificationDialog from './UnitVerificationDialog';

// The typed `t` only takes known keys; this one is built from a runtime string
const col = (key: string) =>
  i18n.t(`blockProject:unitListing.cols.${key}` as never, undefined as never) as unknown as string;

const unit = (over: Partial<ReappraisalPreviewUnit>): ReappraisalPreviewUnit => ({
  id: 'u1',
  sequenceNumber: 1,
  modelType: null,
  usableArea: null,
  sellingPrice: 1_000_000,
  floor: null,
  towerName: null,
  condoRegistrationNumber: null,
  roomNumber: null,
  plotNumber: 'A-01',
  houseNumber: '1/1',
  numberOfFloors: null,
  landArea: 50,
  isSold: false,
  status: 'Available',
  diffFields: [],
  incomingValues: {},
  ...over,
});

const renderDialog = (units: ReappraisalPreviewUnit[]) => {
  const result = {
    summary: {
      total: units.length,
      sold: 0,
      newlySold: 0,
      available: 0,
      matchDifference: 0,
      added: 0,
    },
    units,
    addedUnits: [],
  } as ReappraisalPreviewResult;
  return render(
    <UnitVerificationDialog
      isOpen
      onClose={vi.fn()}
      onApply={vi.fn()}
      result={result}
      projectType="L"
      isApplying={false}
    />,
  );
};

const headers = () => screen.getAllByRole('columnheader').map(h => h.textContent);

describe('UnitVerificationDialog, L (land only)', () => {
  it('shows the L columns only when no row differs elsewhere', () => {
    renderDialog([unit({})]);

    expect(headers()).toEqual([
      col('sqNo'),
      i18n.t('blockProject:unitVerification.cols.status'),
      col('plotNo'),
      col('houseNo'),
      col('landAreaSqWa'),
      col('sellingPriceBaht'),
    ]);
  });

  it('brings a hidden column back when the server flags a row on it', () => {
    renderDialog([
      unit({
        status: 'MatchDifference',
        usableArea: 100,
        diffFields: ['usableArea'],
        incomingValues: { usableArea: 120 },
      }),
    ]);

    expect(headers()).toContain(col('usableAreaSqm'));
    expect(headers()).not.toContain(col('modelName'));
    expect(screen.getByText('120')).toBeInTheDocument();
  });
});
