import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import StarRating from './StarRating';

/** Stars drawn: the icons are sprite <use> refs, so count the star icons by their colour class. */
const stars = (container: HTMLElement) => ({
  lit: container.querySelectorAll('.text-amber-400').length,
  empty: container.querySelectorAll('.text-gray-300').length,
});

describe('StarRating', () => {
  it('clamps a score above 5 to five lit stars', () => {
    const { container } = render(<StarRating score={7} />);

    expect(stars(container)).toEqual({ lit: 5, empty: 0 });
  });

  it('clamps a negative score to five empty stars', () => {
    const { container } = render(<StarRating score={-1} />);

    expect(stars(container)).toEqual({ lit: 0, empty: 5 });
  });

  it('lights a half star from a fraction of .25 up, never a full one early', () => {
    const half = render(<StarRating score={4.25} />);
    expect(stars(half.container)).toEqual({ lit: 5, empty: 0 });
    expect(half.container.innerHTML).toContain('star-half-stroke');

    const none = render(<StarRating score={4.1} />);
    expect(stars(none.container)).toEqual({ lit: 4, empty: 1 });
    expect(none.container.innerHTML).not.toContain('star-half-stroke');
  });
});
