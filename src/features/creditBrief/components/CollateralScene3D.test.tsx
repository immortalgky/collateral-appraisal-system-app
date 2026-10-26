import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import type { BriefAsset } from '../api/appraisalBrief';
import type { BuiltCallout } from '../scene3d/kit';
import { useUIStore } from '@/shared/store';
import CollateralScene3D from './CollateralScene3D';

const engine = vi.hoisted(() => ({
  setCalloutEls: vi.fn(),
  setReserved: vi.fn(),
  setFrameEls: vi.fn(),
  restyle: vi.fn(),
  handlers: null as null | { onHover: (card: unknown, dismiss?: boolean) => void },
  /** The callouts the next build returns; null for the default three. */
  next: null as null | unknown[],
}));
vi.mock('../scene3d/engine', () => ({
  SceneEngine: class {
    constructor(
      _host: unknown,
      _layer: unknown,
      handlers: { onHover: (card: unknown, dismiss?: boolean) => void },
    ) {
      engine.handlers = handlers;
    }
    load() {
      if (engine.next) return engine.next as BuiltCallout[];
      return [
        {
          key: '2::0',
          title: 'Land',
          sub: 'a · b',
          rows: [
            { label: 'item', value: 'a' },
            { label: 'item', value: 'b' },
          ],
          priority: 2,
        },
        { key: '1:unit:0', title: 'Unit', sub: 'b', tone: 'unit', priority: 1 },
        { key: '0:danger:0', title: 'Legal', sub: 'c', tone: 'danger', priority: 0 },
      ] as BuiltCallout[];
    }
    relabel = this.load;
    setCalloutEls = engine.setCalloutEls;
    setReserved = engine.setReserved;
    setFrameEls = engine.setFrameEls;
    setLabel() {}
    restyle = engine.restyle;
    dispose() {}
  },
}));

const land = { propertyType: 'L', areaRai: 1, areaNgan: 0, areaSquareWa: 0 } as BriefAsset;

const mount = () =>
  render(
    <CollateralScene3D assets={[land]} project={null} appraisalId="a1" onUnavailable={() => {}} />,
  );

describe('CollateralScene3D theme', () => {
  it('restyles the engine when the app theme changes, not on every render', () => {
    useUIStore.setState({ theme: 'light' });
    engine.restyle.mockClear();
    const { rerender } = mount();
    expect(engine.restyle).toHaveBeenLastCalledWith(false);
    const before = engine.restyle.mock.calls.length;
    rerender(
      <CollateralScene3D
        assets={[land]}
        project={null}
        appraisalId="a1"
        onUnavailable={() => {}}
      />,
    );
    expect(engine.restyle.mock.calls.length).toBe(before);
    act(() => useUIStore.setState({ theme: 'dark' }));
    expect(engine.restyle).toHaveBeenLastCalledWith(true);
    useUIStore.setState({ theme: 'light' });
  });
});

describe('a card a pin owns, on a touch screen and across a rebuild', () => {
  it('closes on a tap or click on the canvas, but not on the pointer merely moving over it', () => {
    const { container } = mount();
    fireEvent.click(container.querySelector('.cs3d-co')!);
    expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Land');
    act(() => engine.handlers!.onHover(null));
    expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Land');
    // The tap on the canvas (the engine says so with `dismiss`, whatever the pointer type).
    act(() => engine.handlers!.onHover(null, true));
    expect(container.querySelector('.cs3d-tip')).toBeNull();
  });

  it('does not close a mesh card when the pin that had focus before it blurs', () => {
    const { container } = mount();
    const dot = container.querySelector('.cs3d-co-idx')!;
    fireEvent.focus(dot);
    act(() => engine.handlers!.onHover({ key: 'mesh', title: 'Mesh', rows: [], x: 1, y: 1 }));
    expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Mesh');
    fireEvent.blur(dot);
    expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Mesh');
  });

  it('keeps keyboard focus on the dot when its pin is retitled by a rebuild', () => {
    const { container, rerender } = mount();
    const dot = container.querySelector<HTMLElement>('.cs3d-co-idx')!;
    dot.focus();
    expect(document.activeElement).toBe(dot);
    engine.next = [
      { key: '2::0', title: 'Terrain', sub: 'z', priority: 2 },
      { key: '1:unit:0', title: 'Unit', sub: 'b', tone: 'unit', priority: 1 },
      { key: '0:danger:0', title: 'Legal', sub: 'c', tone: 'danger', priority: 0 },
    ];
    try {
      rerender(
        <CollateralScene3D
          assets={[{ ...land }]}
          project={null}
          appraisalId="a1"
          onUnavailable={() => {}}
        />,
      );
      // The same element, still focused: a retitle is not a different pin.
      expect(container.querySelector('.cs3d-co-idx')).toBe(dot);
      expect(document.activeElement).toBe(dot);
      expect(dot.getAttribute('aria-label')).toContain('Terrain');
    } finally {
      engine.next = null;
    }
  });

  it('does not carry an open pin card over to another appraisal', () => {
    const { container, rerender } = mount();
    fireEvent.focus(container.querySelector('.cs3d-co-idx')!);
    rerender(
      <CollateralScene3D
        assets={[{ ...land }]}
        project={null}
        appraisalId="a2"
        onUnavailable={() => {}}
      />,
    );
    expect(container.querySelector('.cs3d-tip')).toBeNull();
  });

  it('follows its pin by identity, not by place, when the callouts are rebuilt', () => {
    const { container, rerender } = mount();
    fireEvent.focus(container.querySelector('.cs3d-co-idx')!);
    expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Land');
    engine.next = [
      // A callout of another class now comes first: the Land one is no longer at index 0.
      { key: '0:danger:0', title: 'Legal', sub: 'c', tone: 'danger', priority: 0 },
      {
        key: '2::0',
        title: 'Terrain',
        sub: 'z',
        rows: [{ label: 'item', value: 'z' }],
        priority: 2,
      },
      { key: '1:unit:0', title: 'Unit', sub: 'b', tone: 'unit', priority: 1 },
    ];
    try {
      // New labels for the same appraisal: a new asset array rebuilds in place.
      rerender(
        <CollateralScene3D
          assets={[{ ...land }]}
          project={null}
          appraisalId="a1"
          onUnavailable={() => {}}
        />,
      );
      expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Terrain');
      expect(container.querySelector('.cs3d-tip td:last-child')!.textContent).toBe('z');
      // And when the pin is gone altogether the card closes, rather than showing another pin's.
      engine.next = [{ key: '0:danger:0', title: 'Legal', sub: 'c', priority: 0 }];
      rerender(
        <CollateralScene3D
          assets={[{ ...land }]}
          project={null}
          appraisalId="a1"
          onUnavailable={() => {}}
        />,
      );
      expect(container.querySelector('.cs3d-tip')).toBeNull();
      engine.next = null;
    } finally {
      engine.next = null;
    }
  });
});

describe('a card a pin owns', () => {
  const mesh = { key: 'mesh', title: 'Mesh', rows: [], x: 5, y: 5 };

  it('stays open while the mouse moves over empty canvas after a keyboard focus', () => {
    const { container } = mount();
    fireEvent.focus(container.querySelector('.cs3d-co-idx')!);
    expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Land');
    act(() => engine.handlers!.onHover(null));
    expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Land');
    fireEvent.blur(container.querySelector('.cs3d-co-idx')!);
    expect(container.querySelector('.cs3d-tip')).toBeNull();
  });

  it('is not taken by the mesh under the pointer while the pointer is on the pin', () => {
    const { container } = mount();
    const pin = container.querySelector('.cs3d-co')!;
    fireEvent.pointerEnter(pin.querySelector('.cs3d-co-card')!);
    act(() => engine.handlers!.onHover(mesh));
    act(() => engine.handlers!.onHover(null));
    expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Land');
  });

  it('gives way to a mesh once the pointer has left the pin, and a pin card never lingers after that', () => {
    vi.useFakeTimers();
    try {
      const { container } = mount();
      const pin = container.querySelector('.cs3d-co')!;
      fireEvent.pointerEnter(pin);
      fireEvent.pointerLeave(pin);
      // Crossing empty canvas: the null reports do not close it before the grace is up.
      act(() => engine.handlers!.onHover(null));
      expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Land');
      act(() => engine.handlers!.onHover(mesh));
      expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Mesh');
      // And empty canvas for good closes a pin card by its timer.
      fireEvent.pointerEnter(pin);
      fireEvent.pointerLeave(pin);
      act(() => void vi.advanceTimersByTime(200));
      expect(container.querySelector('.cs3d-tip')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('CollateralScene3D pins', () => {
  it('treats the dot and its pill as one hover region', () => {
    const { container } = mount();
    const pin = container.querySelector('.cs3d-co')!;
    // The pointer arrives on the pill: the card opens for the pin, as it does on the dot.
    fireEvent.pointerEnter(pin.querySelector('.cs3d-co-card')!);
    expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Land');
    // Leaving the dot for its pill (a gap between them) does not close it.
    vi.useFakeTimers();
    try {
      fireEvent.pointerLeave(pin);
      act(() => void vi.advanceTimersByTime(100));
      fireEvent.pointerEnter(pin.querySelector('.cs3d-co-card')!);
      act(() => void vi.advanceTimersByTime(500));
      expect(container.querySelector('.cs3d-tip h4')!.textContent).toBe('Land');
      // It closes once the pointer has left the pin as a whole.
      fireEvent.pointerLeave(pin);
      act(() => void vi.advanceTimersByTime(200));
      expect(container.querySelector('.cs3d-tip')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the page from scrolling when Space or Enter opens a pin', () => {
    const { container } = mount();
    const dot = container.querySelector('.cs3d-co-idx')!;
    for (const key of [' ', 'Enter']) {
      const notPrevented = fireEvent.keyDown(dot, { key });
      expect(notPrevented).toBe(false);
    }
    expect(fireEvent.keyDown(dot, { key: 'a' })).toBe(true);
  });

  it('does not re-hand the engine its frame on a hover (a tip is not a reason to refit)', () => {
    const { container } = mount();
    const before = engine.setFrameEls.mock.calls.length;
    const reserved = engine.setReserved.mock.calls.length;
    fireEvent.focus(container.querySelector('.cs3d-co-idx')!);
    fireEvent.blur(container.querySelector('.cs3d-co-idx')!);
    expect(engine.setFrameEls.mock.calls.length).toBe(before);
    expect(engine.setReserved.mock.calls.length).toBe(reserved);
  });

  it('keeps every leader line in one layer ahead of all pins', () => {
    const { container } = mount();
    const layer = container.querySelector('.cs3d-leaders');
    expect(layer).not.toBeNull();
    const pins = [...container.querySelectorAll('.cs3d-co')];
    expect(pins).toHaveLength(3);
    // Painted first, so under every pin: a pill hides a line that crosses it.
    for (const pin of pins)
      expect(layer!.compareDocumentPosition(pin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(layer!.querySelectorAll('line')).toHaveLength(3);
    expect(layer!.querySelector('line.danger')).not.toBeNull();
    expect(container.querySelectorAll('.cs3d-co-idx')).toHaveLength(3);
    expect(container.querySelector('.cs3d-co.danger')).not.toBeNull();
    const [els, lines] = engine.setCalloutEls.mock.calls.at(-1)!;
    expect([els.length, lines.length]).toEqual([3, 3]);
  });

  it('puts the title only on the pill and the pieces in the card a pin opens', () => {
    const { container } = mount();
    const pill = container.querySelector('.cs3d-co-card')!;
    expect(pill.textContent).toBe('Land');
    expect(container.querySelector('.cs3d-tip')).toBeNull();
    fireEvent.focus(container.querySelector('.cs3d-co-idx')!);
    const tip = container.querySelector('.cs3d-tip')!;
    expect(tip.querySelector('h4')!.textContent).toBe('Land');
    expect([...tip.querySelectorAll('tr')].map(r => r.lastElementChild!.textContent)).toEqual([
      'a',
      'b',
    ]);
    fireEvent.blur(container.querySelector('.cs3d-co-idx')!);
    expect(container.querySelector('.cs3d-tip')).toBeNull();
  });

  it('hands the engine what to keep clear of and frame around, and renders the summary cards', () => {
    const { container } = mount();
    const [reserved] = engine.setReserved.mock.calls.at(-1)!;
    // title, hint, toolbar, then the glass cards
    expect(reserved.slice(0, 3)).toEqual([
      container.querySelector('.cs3d-title'),
      container.querySelector('.cs3d-hint'),
      container.querySelector('.cs3d-toolbar'),
    ]);
    expect(reserved.slice(3).every((el: Element) => el.classList.contains('cs3d-gcard'))).toBe(
      true,
    );
    const frame = engine.setFrameEls.mock.calls.at(-1)![0];
    expect(frame.title).toBe(container.querySelector('.cs3d-title'));
    expect(frame.column).toBe(container.querySelector('.cs3d-col'));
    expect(container.querySelector('.cs3d-ov')).not.toBeNull();
    expect(container.querySelector('.cs3d-hi')).not.toBeNull();
    expect(container.querySelector('.cs3d-listcard')).not.toBeNull();
  });
});
