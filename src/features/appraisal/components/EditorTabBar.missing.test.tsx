import { describe, expect, it } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { EditorTabBar } from './EditorTabBar';

describe('EditorTabBar', () => {
  it("shows each tab's own missing count, and nothing on a complete tab", () => {
    render(
      <EditorTabBar
        label="Tabs"
        onSelect={() => {}}
        activeId="land"
        tabs={[
          { id: 'land', label: 'Land', missingCount: 7 },
          { id: 'building', label: 'Building', missingCount: 9 },
          { id: 'done', label: 'Done', missingCount: 0 },
        ]}
      />,
    );
    expect(screen.getByRole('tab', { name: /Land/ })).toHaveTextContent('7 missing');
    expect(screen.getByRole('tab', { name: /Building/ })).toHaveTextContent('9 missing');
    expect(screen.getByRole('tab', { name: 'Done' })).not.toHaveTextContent('missing');
  });
});
