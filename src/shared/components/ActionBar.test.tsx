import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import ActionBar from './ActionBar';

const bar = (readOnly: boolean, keep?: boolean) =>
  render(
    <PageReadOnlyContext.Provider value={readOnly}>
      <ActionBar keepWhenReadOnly={keep}>
        <button type="button">Cancel</button>
      </ActionBar>
    </PageReadOnlyContext.Provider>,
  );

describe('ActionBar', () => {
  it('is drawn on an editable page', () => {
    bar(false);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('is not drawn on a read page, unless it opts in', () => {
    const { unmount } = bar(true);
    expect(screen.queryByRole('toolbar')).toBeNull();
    unmount();
    bar(true, true);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });
});
