import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, screen } from '@/test/test-utils';
import ConfirmDialog from './ConfirmDialog';

// English "Cancel"/"Confirm" are what the dialog used to hard-code, so the shared keys get marker
// texts: only a label that really comes from i18n shows them.
const original = {
  cancel: i18n.t('common:actions.cancel'),
  confirm: i18n.t('common:actions.confirm'),
};
afterEach(() => {
  i18n.addResource('en', 'common', 'actions.cancel', original.cancel);
  i18n.addResource('en', 'common', 'actions.confirm', original.confirm);
});

const setup = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) =>
  render(<ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} {...props} />);

describe('ConfirmDialog button labels', () => {
  it('defaults to the translated cancel and confirm, not hard-coded English', () => {
    i18n.addResource('en', 'common', 'actions.cancel', 'CANCEL-FROM-I18N');
    i18n.addResource('en', 'common', 'actions.confirm', 'CONFIRM-FROM-I18N');
    setup();
    expect(screen.getByText('CANCEL-FROM-I18N')).toBeTruthy();
    expect(screen.getByText('CONFIRM-FROM-I18N')).toBeTruthy();
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('lets explicit labels win', () => {
    i18n.addResource('en', 'common', 'actions.cancel', 'CANCEL-FROM-I18N');
    i18n.addResource('en', 'common', 'actions.confirm', 'CONFIRM-FROM-I18N');
    setup({ cancelText: 'Keep it', confirmText: 'Remove it' });
    expect(screen.getByText('Keep it')).toBeTruthy();
    expect(screen.getByText('Remove it')).toBeTruthy();
    expect(screen.queryByText('CANCEL-FROM-I18N')).toBeNull();
    expect(screen.queryByText('CONFIRM-FROM-I18N')).toBeNull();
  });

  it('has the translations the default reads, in all three languages', () => {
    for (const lng of ['th', 'en', 'zh']) {
      expect(i18n.exists('common:actions.cancel', { lng }), lng).toBe(true);
      expect(i18n.exists('common:actions.confirm', { lng }), lng).toBe(true);
    }
  });
});
