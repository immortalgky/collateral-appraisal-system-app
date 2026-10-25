import { describe, expect, it } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import QuotationStatusView from './QuotationStatusView';
import type { QuotationRequestDetailDto } from '../schemas/quotation';

const finalized = (companyName: string) =>
  ({
    id: 'q-1',
    status: 'Finalized',
    quotationNumber: 'Q-001',
    tentativeWinnerQuotationId: 'cq-1',
    companyQuotations: [
      { id: 'cq-1', companyName, companyNameLocal: null, totalQuotedPrice: 1000 },
    ],
  }) as unknown as QuotationRequestDetailDto;

describe('QuotationStatusView', () => {
  it('renders the awarded company as text, never as HTML', async () => {
    const hostile = '<img src=x onerror=alert(1)><strong>Evil</strong> Co';
    render(<QuotationStatusView quotation={finalized(hostile)} />);

    const paragraph = await screen.findByText(
      (_, el) => el?.tagName === 'P' && !!el.textContent?.includes('Quotation awarded to'),
    );
    expect(document.querySelector('img')).toBeNull();
    const bold = paragraph.querySelectorAll('strong');
    expect(bold).toHaveLength(1);
    expect(bold[0].textContent).toBe(hostile);
    expect(bold[0]).toHaveClass('text-(--palette-ink)');
  });
});
