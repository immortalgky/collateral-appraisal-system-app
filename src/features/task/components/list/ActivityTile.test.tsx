import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ActivityTile } from './ActivityTile';

describe('ActivityTile', () => {
  it('draws a tile, with the default icon, for a task with no activity id', () => {
    for (const id of [null, undefined, '']) {
      const { container, unmount } = render(<ActivityTile activityId={id} />);
      expect(container.querySelector('use')?.getAttribute('xlink:href')).toContain(
        'clipboard-list',
      );
      unmount();
    }
  });
});
