import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useFilledColumns } from './useFilledColumns';

const proto = HTMLElement.prototype;

type Result = ReturnType<typeof useFilledColumns>;

function setup(props: { widths?: Record<string, number>; box: number }) {
  const original = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return 'box' in this.dataset ? props.box : 0;
    },
  });
  let out!: Result;
  const tableRef = createRef<HTMLTableElement>();
  function Probe() {
    out = useFilledColumns({
      keys: ['a', 'b'],
      widths: props.widths ?? { a: 200, b: 300 },
      leading: [48],
      trailing: [],
      tableRef,
    });
    return <div ref={out.setContainer} data-box />;
  }
  render(<Probe />);
  return {
    get: () => out,
    restore: () => original && Object.defineProperty(proto, 'clientWidth', original),
  };
}

describe('useFilledColumns', () => {
  it('grows the columns to the box, keeping their proportions, and the table is the box wide', () => {
    const s = setup({ box: 1048 });
    try {
      // 1048 less the 48 fixed leaves 1000 for 500 stored: everything doubles
      expect(s.get().widthOf('a')).toBe(400);
      expect(s.get().widthOf('b')).toBe(600);
      expect(s.get().tableWidth).toBe(1048);
    } finally {
      s.restore();
    }
  });

  it('leaves the stored widths alone, and scrolls, when they pass the box', () => {
    const s = setup({ box: 400 });
    try {
      expect(s.get().widthOf('a')).toBe(200);
      expect(s.get().tableWidth).toBe(548);
    } finally {
      s.restore();
    }
  });

  it('converts a width on screen back to the one to store', () => {
    const s = setup({ box: 1048 });
    try {
      // a column shown 400 wide while the fill doubles things is stored 200
      expect(s.get().storedFor('a', 400)).toBe(200);
    } finally {
      s.restore();
    }
  });
});
