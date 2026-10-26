import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import SendToRmModal from './SendToRmModal';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

describe('SendToRmModal', () => {
  it('shows the shortlisted count in bold', async () => {
    render(<SendToRmModal isOpen onClose={vi.fn()} quotationId="q-1" shortlistedCount={4} />);

    const paragraph = await screen.findByText(
      (_, el) => el?.tagName === 'P' && !!el.textContent?.includes('You are sending 4'),
    );
    expect(paragraph.querySelector('strong')?.textContent).toBe('4');
  });
});
