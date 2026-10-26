import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useElementWidth } from './useElementWidth';

const proto = HTMLElement.prototype;

function Probe({ initiallyShown }: { initiallyShown: boolean }) {
  const [setRef, width] = useElementWidth<HTMLDivElement>();
  const [shown, setShown] = useState(initiallyShown);
  return (
    <>
      <output data-testid="w">{width}</output>
      <button onClick={() => setShown(true)}>show</button>
      {shown && <div ref={setRef} data-box />}
    </>
  );
}

describe('useElementWidth', () => {
  it('measures an element that mounts after the component (an error view first, then the page)', () => {
    const original = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return 'box' in this.dataset ? 1400 : 0;
      },
    });
    try {
      render(<Probe initiallyShown={false} />);
      expect(screen.getByTestId('w')).toHaveTextContent('0');
      act(() => screen.getByText('show').click());
      expect(screen.getByTestId('w')).toHaveTextContent('1400');
    } finally {
      if (original) Object.defineProperty(proto, 'clientWidth', original);
    }
  });
});
