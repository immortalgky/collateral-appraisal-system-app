import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
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

describe('SlideOverPanel focus outline', () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 100, 100),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('switches the global outline off, inline, on the dialog and its panel', async () => {
    render(
      <SlideOverPanel isOpen onClose={() => {}} title="Panel">
        body
      </SlideOverPanel>,
    );
    const dialog = await screen.findByRole('dialog');
    // containers that take the focus when the drawer opens or something inside is clicked: the
    // unlayered :focus-visible outline would box them in blue, and only an inline style beats it
    expect(dialog.style.outlineStyle).toBe('none');
    const panel = screen
      .getByText('Panel')
      .closest('[id^="headlessui-dialog-panel"]') as HTMLElement;
    expect(panel.style.outlineStyle).toBe('none');
  });
});

describe('SlideOverPanel close button name', () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 100, 100),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('is the translated common:actions.closePanel, not hard-coded English', async () => {
    const original = i18n.t('common:actions.closePanel');
    i18n.addResource('en', 'common', 'actions.closePanel', 'CLOSE-FROM-I18N');
    try {
      render(
        <SlideOverPanel isOpen onClose={() => {}} title="Panel">
          body
        </SlideOverPanel>,
      );
      expect(await screen.findByRole('button', { name: 'CLOSE-FROM-I18N' })).toBeInTheDocument();
    } finally {
      i18n.addResource('en', 'common', 'actions.closePanel', original);
    }
  });

  it('has the key in all three languages', () => {
    for (const lng of ['th', 'en', 'zh']) {
      expect(i18n.exists('common:actions.closePanel', { lng }), lng).toBe(true);
    }
  });
});
