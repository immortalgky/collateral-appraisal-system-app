import Icon from '@/shared/components/Icon';
import { collateralIcon } from '@/shared/config/collateralIcon';
import { useRef, useState, useLayoutEffect } from 'react';

interface CollateralSelectModalProps {
  items: any[];
  position: { x: number; y: number };
  onSelect: (item: any) => void;
  onCancel: () => void;
}

const CollateralSelectModal = ({
  items,
  onSelect,
  onCancel,
  position,
}: CollateralSelectModalProps) => {
  const ref = useRef<HTMLUListElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    top: position.y,
    left: position.x,
  });

  useLayoutEffect(() => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const padding = 8;

    let top = position.y;
    let left = position.x;

    if (left + rect.width > window.innerWidth) {
      left = window.innerWidth - rect.width - padding;
    }

    if (top + rect.height > window.innerHeight) {
      top = window.innerHeight - rect.height - padding;
    }

    setStyle({ top, left });
  }, [position]);

  return (
    <div className="fixed inset-0 z-50" onClick={onCancel}>
      <ul
        ref={ref}
        className="absolute min-w-max rounded-xl bg-white shadow-lg border border-neutral-3 p-2"
        style={style}
        onClick={e => e.stopPropagation()}
      >
        {items.map(item => {
          const icon = collateralIcon[item.code] ?? 'circle-question';

          return (
            <li
              key={item.code}
              onClick={() => onSelect(item)}
              className="flex items-center p-2 hover:bg-neutral-3 rounded-lg cursor-pointer"
            >
              <Icon style="light" name={icon} className="size-3 text-neutral-4" />
              <p className="ml-2">{item.description}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CollateralSelectModal;
