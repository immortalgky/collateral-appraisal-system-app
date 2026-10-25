import { useState, useRef } from 'react';
import { Icon } from '@/shared/components';

export function FieldTooltip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
  };

  return (
    <span
      ref={ref}
      className="inline-flex items-center ml-1 shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setPos(null)}
    >
      <Icon
        name="circle-question"
        style="regular"
        className="size-3 text-(--palette-gray-400) cursor-help hover:text-(--palette-primary-text) transition-colors"
      />
      {pos && (
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y - 10,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
        >
          <div className="bg-(--palette-surface) border border-(--palette-line) rounded-lg shadow-xl px-3 py-2.5 text-xs text-(--palette-ink) leading-relaxed w-[360px] whitespace-normal text-left">
            {text}
          </div>
        </div>
      )}
    </span>
  );
}
