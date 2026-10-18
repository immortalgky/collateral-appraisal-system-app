import { describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, screen } from '@/test/test-utils';
import ResizableSidebar from './ResizableSidebar';

describe('ResizableSidebar close button', () => {
  it('is titled with the translated common:actions.closePanel, not hard-coded English', async () => {
    const original = i18n.t('common:actions.closePanel');
    i18n.addResource('en', 'common', 'actions.closePanel', 'CLOSE-FROM-I18N');
    try {
      const onToggle = vi.fn();
      const { user } = render(
        <ResizableSidebar isOpen onToggle={onToggle} openedWidth="w-64">
          <ResizableSidebar.Main>main</ResizableSidebar.Main>
          <ResizableSidebar.Sidebar>side</ResizableSidebar.Sidebar>
        </ResizableSidebar>,
      );
      const close = screen.getByTitle('CLOSE-FROM-I18N');
      await user.click(close);
      expect(onToggle).toHaveBeenCalledTimes(1);
    } finally {
      i18n.addResource('en', 'common', 'actions.closePanel', original);
    }
  });
});
