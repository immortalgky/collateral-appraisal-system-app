import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import RejectTentativeModal from './RejectTentativeModal';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

describe('RejectTentativeModal', () => {
  it('renders the company name as text, never as HTML', async () => {
    const hostile = '<img src=x onerror=alert(1)><strong>Evil</strong> Co';
    render(
      <RejectTentativeModal isOpen onClose={vi.fn()} quotationId="q-1" companyName={hostile} />,
    );

    const paragraph = await screen.findByText(
      (_, el) => el?.tagName === 'P' && !!el.textContent?.includes(hostile),
    );
    expect(document.querySelector('img')).toBeNull();
    const bold = paragraph.querySelectorAll('strong');
    expect(bold).toHaveLength(1);
    expect(bold[0].textContent).toBe(hostile);
  });
});
