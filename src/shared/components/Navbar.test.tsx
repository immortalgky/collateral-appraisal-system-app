import { afterEach, describe, expect, it } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import Navbar from './Navbar';

const setPlatform = (platform: string) =>
  Object.defineProperty(navigator, 'userAgentData', { value: { platform }, configurable: true });
const saved = Object.getOwnPropertyDescriptor(navigator, 'userAgentData');
afterEach(() => {
  if (saved) Object.defineProperty(navigator, 'userAgentData', saved);
  else delete (navigator as unknown as Record<string, unknown>).userAgentData;
});

describe('Navbar quick-search hint', () => {
  it('shows ⌘K on a Mac', () => {
    setPlatform('macOS');
    render(<Navbar userNavigation={[]} />);
    expect(screen.getByText('⌘K')).toBeTruthy();
    expect(screen.queryByText('Ctrl K')).toBeNull();
  });

  it('shows Ctrl K on Windows and Linux', () => {
    setPlatform('Windows');
    render(<Navbar userNavigation={[]} />);
    expect(screen.getByText('Ctrl K')).toBeTruthy();
    expect(screen.queryByText('⌘K')).toBeNull();
  });

  it('opens the search on Ctrl+K and on ⌘K, whatever the label says', async () => {
    setPlatform('Windows');
    const { user } = render(<Navbar userNavigation={[]} />);
    const input = screen.getByRole('searchbox');
    await user.keyboard('{Control>}k{/Control}');
    expect(input).toHaveFocus();
    input.blur();
    await user.keyboard('{Meta>}k{/Meta}');
    expect(input).toHaveFocus();
  });
});
