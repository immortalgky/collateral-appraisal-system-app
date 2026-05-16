import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';

export type InvoiceTab = 'unpaid' | 'paid';

const TABS: readonly { id: InvoiceTab; icon: string }[] = [
  { id: 'unpaid', icon: 'clock' },
  { id: 'paid', icon: 'circle-check' },
] as const;

// ─── Sliding indicator hook ─────────────────────────────────────────────────

interface Geometry {
  left: number;
  width: number;
}

function useSlidingIndicator<K extends string>(
  activeKey: K,
  deps: ReadonlyArray<unknown> = [],
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<K, HTMLElement | null>>(new Map());
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  const registerItem = (key: K) => (el: HTMLElement | null) => {
    itemRefs.current.set(key, el);
  };

  useLayoutEffect(() => {
    const item = itemRefs.current.get(activeKey);
    const container = containerRef.current;
    if (!item || !container) return;
    const itemRect = item.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setGeometry({
      left: itemRect.left - containerRect.left,
      width: itemRect.width,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, ...deps]);

  return { containerRef, registerItem, geometry };
}

// ─── Tab button ─────────────────────────────────────────────────────────────

interface TabButtonProps {
  isActive: boolean;
  icon: string;
  label: string;
  count?: number;
  onClick: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}

const TabButton = ({
  isActive,
  icon,
  label,
  count,
  onClick,
  buttonRef,
}: TabButtonProps) => (
  <button
    ref={buttonRef}
    type="button"
    role="tab"
    aria-selected={isActive}
    onClick={onClick}
    className={`relative z-10 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
      isActive ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
    }`}
  >
    <Icon
      style={isActive ? 'solid' : 'regular'}
      name={icon}
      className={`size-3.5 transition-colors duration-200 ${
        isActive ? 'text-primary' : 'text-gray-400'
      }`}
    />
    <span>{label}</span>
    {count !== undefined && (
      <CountBadge isActive={isActive}>{count}</CountBadge>
    )}
  </button>
);

const CountBadge = ({
  isActive,
  children,
}: {
  isActive: boolean;
  children: ReactNode;
}) => (
  <span
    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums leading-none transition-colors duration-200 ${
      isActive ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-600'
    }`}
  >
    {children}
  </span>
);

// ─── Main component ─────────────────────────────────────────────────────────

interface InvoiceListTabsProps {
  value: InvoiceTab;
  onChange: (next: InvoiceTab) => void;
  /** Counts per tab; pass `undefined` to hide the badge while still loading. */
  counts?: Partial<Record<InvoiceTab, number | undefined>>;
}

const InvoiceListTabs = ({ value, onChange, counts }: InvoiceListTabsProps) => {
  const { t } = useTranslation('invoice');
  const { containerRef, registerItem, geometry } = useSlidingIndicator(value, [
    counts?.unpaid,
    counts?.paid,
  ]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={t('list.title')}
      className="relative inline-flex p-1 bg-gray-100 rounded-lg gap-1"
    >
      {/* Sliding white pill behind the active tab */}
      {geometry && (
        <div
          aria-hidden="true"
          className="absolute top-1 bottom-1 bg-white rounded-md shadow-sm transition-[left,width] duration-300 ease-out"
          style={{ left: geometry.left, width: geometry.width }}
        />
      )}

      {TABS.map(({ id, icon }) => (
        <TabButton
          key={id}
          isActive={value === id}
          icon={icon}
          label={t(`list.tabs.${id}` as const)}
          count={counts?.[id]}
          onClick={() => onChange(id)}
          buttonRef={registerItem(id)}
        />
      ))}
    </div>
  );
};

export default InvoiceListTabs;
