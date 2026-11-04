import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';

/**
 * Every namespace of every language is bundled inline, so a component that mounts
 * late must render at once instead of suspending. A suspend on a task page hides and
 * re-shows its whole SuspenseOutlet, which refetches all its queries 2-3 times.
 */
function Label({ ns, k }: { ns: 'nav' | 'monitoring'; k: string }) {
  const { t } = useTranslation(ns);
  return <span data-testid="label">{t(k as never)}</span>;
}

const renderLabel = (ns: 'nav' | 'monitoring' = 'nav', k = 'sidebar.dashboard') =>
  render(
    <Suspense fallback={<span data-testid="fallback">loading</span>}>
      <Label ns={ns} k={k} />
    </Suspense>,
  );

describe('i18n cold boot rendering', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it.each([
    ['th', 'แดชบอร์ด'],
    ['en', 'Dashboard'],
    ['zh', '仪表盘'],
  ])('renders %s without suspending', async (lng, text) => {
    localStorage.setItem('app-language', lng);
    await import('../index');

    renderLabel();

    expect(screen.queryByTestId('fallback')).toBeNull();
    expect(screen.getByTestId('label')).toHaveTextContent(text);
  });

  it('renders English, not the key, for a zh namespace that has no zh file', async () => {
    localStorage.setItem('app-language', 'zh');
    await import('../index');

    renderLabel('monitoring', 'nav.title');

    expect(screen.queryByTestId('fallback')).toBeNull();
    expect(screen.getByTestId('label')).toHaveTextContent('Monitoring');
  });

  it('re-renders on en -> th without suspending', async () => {
    localStorage.setItem('app-language', 'en');
    const { default: i18n } = await import('../index');

    renderLabel();
    expect(screen.getByTestId('label')).toHaveTextContent('Dashboard');

    await act(() => i18n.changeLanguage('th'));

    expect(screen.queryByTestId('fallback')).toBeNull();
    expect(screen.getByTestId('label')).toHaveTextContent('แดชบอร์ด');
  });
});
