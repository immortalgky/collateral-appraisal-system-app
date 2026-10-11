import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import SlideOverPanel from './SlideOverPanel';

describe('SlideOverPanel afterLeave', () => {
  beforeEach(() => {
    // jsdom lays nothing out; without a size Headless UI takes the open panel for gone and closes it
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 100, 100),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('runs once the panel has closed, not before', async () => {
    const afterLeave = vi.fn();
    const { rerender } = render(
      <SlideOverPanel isOpen onClose={() => {}} title="Panel" afterLeave={afterLeave}>
        body
      </SlideOverPanel>,
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(afterLeave).not.toHaveBeenCalled();

    rerender(
      <SlideOverPanel isOpen={false} onClose={() => {}} title="Panel" afterLeave={afterLeave}>
        body
      </SlideOverPanel>,
    );
    await waitFor(() => expect(afterLeave).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('still works as before without afterLeave', async () => {
    render(
      <SlideOverPanel isOpen onClose={() => {}} title="Panel">
        body
      </SlideOverPanel>,
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });
});
