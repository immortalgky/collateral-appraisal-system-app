import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import { ReadOnlyPageWrapper } from '@/shared/contexts/PageReadOnlyContext';
import RequestPageSkeleton from './RequestPageSkeleton';

describe('RequestPageSkeleton', () => {
  it('has the action bar on the editable page', () => {
    const { container } = render(<RequestPageSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelector('[data-page-actions]')).not.toBeNull();
  });

  it('has no action bar on the read-only page', () => {
    const { container } = render(
      <ReadOnlyPageWrapper>
        <RequestPageSkeleton />
      </ReadOnlyPageWrapper>,
    );
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelector('[data-page-actions]')).toBeNull();
  });
});
