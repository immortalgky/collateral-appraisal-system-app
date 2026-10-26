import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { FormReadOnlyContext } from '../form/context';
import SectionHeader from './SectionHeader';

describe('SectionHeader required mark', () => {
  it('is drawn on an editable page and not on a read page', () => {
    const { unmount } = render(<SectionHeader title="Customer" variant="card" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
    unmount();
    render(
      <FormReadOnlyContext.Provider value>
        <SectionHeader title="Customer" variant="card" required />
      </FormReadOnlyContext.Provider>,
    );
    expect(screen.queryByText('*')).toBeNull();
  });
});
