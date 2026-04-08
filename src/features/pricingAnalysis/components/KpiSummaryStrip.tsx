import { Icon } from '@/shared/components';

export interface KpiCard {
  label: string;
  value: number | null;
  icon: string;
  color: 'green' | 'blue' | 'gray' | 'amber';
  primary?: boolean;
  suffix?: string;
}

const colorMap = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    value: 'text-green-700',
    label: 'text-green-600/70',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    value: 'text-blue-700',
    label: 'text-blue-600/70',
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-500',
    value: 'text-gray-700',
    label: 'text-gray-500',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    value: 'text-amber-700',
    label: 'text-amber-600/70',
  },
};

const fmt = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '-';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface KpiSummaryStripProps {
  cards: KpiCard[];
}

export function KpiSummaryStrip({ cards }: KpiSummaryStripProps) {
  if (cards.every((c) => c.value == null || c.value === 0)) return null;

  return (
    <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }}>
      {cards.map((card) => {
        const c = colorMap[card.color];
        return (
          <div
            key={card.label}
            className={`rounded-lg border px-3 py-2.5 ${c.bg} ${c.border} ${card.primary ? 'ring-1 ring-green-300' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name={card.icon} className={`size-3 ${c.icon}`} />
              <span className={`text-[10px] uppercase tracking-wide font-medium ${c.label}`}>
                {card.label}
              </span>
            </div>
            <div className={`text-sm font-bold ${c.value} tabular-nums`}>
              {fmt(card.value)}
              {card.suffix && <span className="text-[10px] font-normal ml-1 opacity-70">{card.suffix}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
