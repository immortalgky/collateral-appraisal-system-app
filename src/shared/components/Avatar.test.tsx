import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('does not crash without a name: the initials fall back to "?"', () => {
    render(<Avatar name={undefined} />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
