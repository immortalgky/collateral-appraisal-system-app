import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { ExternalCompany, PreviousCompany } from '../types/administration';
import type { FeePreview } from '../types/feePreview';
import ChangeCompanyDialog from './ChangeCompanyDialog';

/** The test i18n returns keys, so texts are asserted by key. */

const previousCompany = {
  companyId: 'c-old',
  companyName: 'Old Co',
  appraisalId: 'P1',
  appraisalNumber: '69105522',
  inspectionNumber: 3,
  completedAt: '2026-05-12T10:00:00',
  mouActive: true,
} as PreviousCompany;

const newCompany = {
  id: 'c-new',
  companyName: 'New Co',
  companyNameLocal: null,
} as ExternalCompany;

const keptFee = {
  systemBaseAmount: 3000,
  baseSource: { kind: 'ConstructionInspectionFee' },
  adminOverrideAmount: null,
} as FeePreview;

const renderDialog = (over: Partial<React.ComponentProps<typeof ChangeCompanyDialog>> = {}) =>
  render(
    <ChangeCompanyDialog
      previousCompany={previousCompany}
      newCompany={newCompany}
      feePreview={undefined}
      onKeepPrevious={vi.fn()}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      {...over}
    />,
  );

describe('ChangeCompanyDialog: the fee row', () => {
  it('says the fee is loading while the preview has not answered', () => {
    renderDialog();

    expect(screen.getByText('feePreview.loading')).toBeInTheDocument();
    expect(screen.queryByText('feePreview.loadFailed')).not.toBeInTheDocument();
  });

  it('says the load failed, not that it is loading, when the preview errored', () => {
    renderDialog({ feeError: true });

    expect(screen.getByText('feePreview.loadFailed')).toBeInTheDocument();
    expect(screen.queryByText('feePreview.loading')).not.toBeInTheDocument();
  });

  it('shows the kept fee once the preview is there, even if an error flag is still set', () => {
    renderDialog({ feePreview: keptFee, feeError: true });

    expect(screen.getByText('administration.changeCompany.feeKept')).toBeInTheDocument();
    expect(screen.queryByText('feePreview.loadFailed')).not.toBeInTheDocument();
    expect(screen.queryByText('feePreview.loading')).not.toBeInTheDocument();
  });
});

describe('ChangeCompanyDialog: leaving it', () => {
  it('the keep button asks to keep the previous company, Esc only cancels', async () => {
    const onKeepPrevious = vi.fn();
    const onCancel = vi.fn();
    const { user } = renderDialog({ onKeepPrevious, onCancel });

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onKeepPrevious).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'administration.changeCompany.keepPrevious' }),
    );
    expect(onKeepPrevious).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ChangeCompanyDialog: the layout', () => {
  it('shows the previous and the selected company as two cards, the fee line and the confirm button', () => {
    renderDialog({ feePreview: keptFee });

    expect(screen.getByText('administration.changeCompany.previous')).toBeInTheDocument();
    expect(screen.getByText('administration.changeCompany.selected')).toBeInTheDocument();
    expect(screen.getByText('Old Co')).toBeInTheDocument();
    expect(screen.getByText('New Co')).toBeInTheDocument();
    expect(screen.getByText('administration.changeCompany.fee')).toBeInTheDocument();
    expect(screen.getByText('administration.changeCompany.feeKept')).toBeInTheDocument();
    // The confirm action is the primary (teal) button; keeping the previous company is the outline one.
    expect(
      screen.getByRole('button', { name: 'administration.changeCompany.confirm' }),
    ).toHaveClass('bg-primary');
    expect(
      screen.getByRole('button', { name: 'administration.changeCompany.keepPrevious' }),
    ).not.toHaveClass('bg-primary');
  });
});
