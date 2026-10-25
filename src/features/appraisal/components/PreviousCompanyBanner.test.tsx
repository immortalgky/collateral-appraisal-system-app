import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { PreviousCompany } from '../types/administration';
import PreviousCompanyBanner from './PreviousCompanyBanner';

/** What the banner claims about the prior inspection's company. The test i18n returns keys. */

const previous = (over: Partial<PreviousCompany> = {}): PreviousCompany => ({
  companyId: 'c-old',
  companyName: 'Old Co',
  appraisalId: 'P1',
  appraisalNumber: '69105522',
  inspectionNumber: 3,
  completedAt: '2026-05-12T10:00:00',
  mouActive: true,
  ...over,
});

const hint = () => screen.queryByText(/administration\.previousCompany\.hint/);

describe('PreviousCompanyBanner hint', () => {
  it('says it was chosen for the admin when the system preselected it', () => {
    render(
      <PreviousCompanyBanner previousCompany={previous()} isSelected isPreselected isEligible />,
    );

    expect(screen.getByText('administration.previousCompany.hintSelected')).toBeInTheDocument();
  });

  it('only says it is available when the admin picked it, not the system', () => {
    render(<PreviousCompanyBanner previousCompany={previous()} isSelected isEligible />);

    expect(screen.getByText('administration.previousCompany.hintAvailable')).toBeInTheDocument();
    expect(screen.queryByText('administration.previousCompany.hintSelected')).toBeNull();
  });

  it('says nothing about a company that is offered but not the current selection', () => {
    render(<PreviousCompanyBanner previousCompany={previous()} isSelected={false} isEligible />);

    expect(screen.getByText('administration.previousCompany.title')).toBeInTheDocument();
    expect(hint()).toBeNull();
  });

  it('makes no claim while it is not known whether the company is offered', () => {
    render(<PreviousCompanyBanner previousCompany={previous()} isSelected isPreselected />);

    expect(hint()).toBeNull();
    expect(screen.getByRole('status')).not.toHaveClass('bg-(--palette-warn-wash)');
  });

  it('warns, in amber, when the company is not offered for this segment', () => {
    render(
      <PreviousCompanyBanner previousCompany={previous()} isSelected={false} isEligible={false} />,
    );

    expect(screen.getByText('administration.previousCompany.hintNotEligible')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('bg-(--palette-warn-wash)');
  });

  it('warns, in amber, when the MOU is not active, whatever else is true', () => {
    render(
      <PreviousCompanyBanner
        previousCompany={previous({ mouActive: false })}
        isSelected
        isPreselected
        isEligible
      />,
    );

    expect(screen.getByText('administration.previousCompany.hintMouInactive')).toBeInTheDocument();
    expect(screen.queryByText('administration.previousCompany.hintSelected')).toBeNull();
    expect(screen.getByRole('status')).toHaveClass('bg-(--palette-warn-wash)');
  });

  it.each([
    ['MOU not active', { mouActive: false }, true],
    ['not offered for the segment', {}, false],
    ['chosen for the admin', {}, true],
  ] as const)('read-only: keeps the facts and drops the hint (%s)', (_, over, isEligible) => {
    render(
      <PreviousCompanyBanner
        previousCompany={previous(over)}
        isSelected
        isPreselected
        isEligible={isEligible}
        readOnly
      />,
    );

    expect(screen.getByText('administration.previousCompany.title')).toBeInTheDocument();
    expect(screen.getByText(/administration\.previousCompany\.book/)).toBeInTheDocument();
    expect(hint()).toBeNull();
    expect(screen.getByRole('status')).not.toHaveClass('bg-(--palette-warn-wash)');
  });
});
