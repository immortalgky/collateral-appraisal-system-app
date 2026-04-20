import { Icon } from '@/shared/components';

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

const fmt = (n: number | null): string => {
  if (n == null || !Number.isFinite(n) || n === 0) return '-';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export interface KpiItem {
  label: string;
  value: number | null;
  icon: string;
  color: 'green' | 'blue' | 'gray' | 'amber';
  suffix?: string;
}

export interface KpiDashboardProps {
  primary?: KpiItem;
  secondary: KpiItem[];
  compact?: boolean;
}

function SecondaryCard({ card }: { card: KpiItem }) {
  const c = colorMap[card.color];
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon name={card.icon} className={`size-3 ${c.icon}`} />
        <span className={`text-[10px] uppercase tracking-wide font-medium ${c.label}`}>
          {card.label}
        </span>
      </div>
      <div className={`text-sm font-bold ${c.value} tabular-nums`}>
        {fmt(card.value)}
        {card.suffix && (
          <span className="text-[10px] font-normal ml-1 opacity-70">{card.suffix}</span>
        )}
      </div>
    </div>
  );
}

function PrimaryCard({ card, compact }: { card: KpiItem; compact: boolean }) {
  const c = colorMap[card.color];

  if (compact) {
    return <SecondaryCard card={card} />;
  }

  return (
    <div className={`rounded-lg border px-4 py-3 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon name={card.icon} className={`size-4 ${c.icon}`} />
        <span className={`text-xs uppercase tracking-wide font-semibold ${c.label}`}>
          {card.label}
        </span>
      </div>
      <div className={`text-lg font-bold ${c.value} tabular-nums`}>
        {fmt(card.value)}
        {card.suffix && (
          <span className="text-xs font-normal ml-1.5 opacity-70">{card.suffix}</span>
        )}
      </div>
    </div>
  );
}

export function KpiDashboard({ primary, secondary, compact = false }: KpiDashboardProps) {
  if (compact) {
    const all = primary ? [primary, ...secondary] : secondary;
    return (
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${all.length}, minmax(0, 1fr))` }}
      >
        {all.map((card) => (
          <SecondaryCard key={card.label} card={card} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {primary && <PrimaryCard card={primary} compact={false} />}
      {secondary.length > 0 && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${secondary.length}, minmax(0, 1fr))` }}
        >
          {secondary.map((card) => (
            <SecondaryCard key={card.label} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
