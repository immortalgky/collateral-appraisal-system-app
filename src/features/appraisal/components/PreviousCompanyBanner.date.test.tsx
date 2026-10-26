import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { render, screen } from '@/test/test-utils';
import type { PreviousCompany } from '../types/administration';
import PreviousCompanyBanner from './PreviousCompanyBanner';

/** The completion date follows the UI language: Thai month and Buddhist year, or dd/mm/yyyy. */

const previous: PreviousCompany = {
  companyId: 'c-old',
  companyName: 'Old Co',
  appraisalId: 'P1',
  appraisalNumber: '69105522',
  inspectionNumber: 3,
  completedAt: '2026-05-12T10:00:00',
  mouActive: true,
};

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('PreviousCompanyBanner completion date', () => {
  it('is in Thai with the Buddhist year when the language is Thai', async () => {
    await i18n.loadNamespaces(['appraisal', 'common']);
    await i18n.changeLanguage('th');
    render(<PreviousCompanyBanner previousCompany={previous} isSelected={false} />);

    expect(screen.getByRole('status')).toHaveTextContent(/12 พ\.ค\. 2569/);
    expect(screen.getByRole('status')).not.toHaveTextContent('2026');
  });

  it('is dd/mm/yyyy in English', async () => {
    await i18n.loadNamespaces(['appraisal', 'common']);
    await i18n.changeLanguage('en');
    render(<PreviousCompanyBanner previousCompany={previous} isSelected={false} />);

    expect(screen.getByRole('status')).toHaveTextContent('12/05/2026');
    expect(screen.getByRole('status')).not.toHaveTextContent('2569');
  });
});
