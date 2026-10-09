import { Icon } from '@/shared/components';

export interface KpiCard {
  label: string;
  value: number | null;
  /** Card variant only — the flat strip draws no icons. */
  icon?: string;
  /** Card variant only — the flat strip takes its ink from `primary`. */
  color?: 'green' | 'blue' | 'gray' | 'amber';
  primary?: boolean;
  /** A unit. Renders small and muted beside the value (mock's `.kpi small`). */
  suffix?: string;
  /**
   * Trailing text rendered INSIDE the value, in the value's own weight and colour — for a
   * qualifier that belongs to the figure rather than to its unit, e.g. the depreciation
   * percentage the mock appends as `1,234.00 (12.5%)` (mock:1772). Deliberately not
   * `suffix`: that slot is muted 10px, which would style a percentage as if it were a unit.
   */
  note?: string;
  /**
   * Flat variant only: drop this figure below the `2xl` breakpoint.
   *
   * For a strip living in the tab-strip toolbar, where the row cannot wrap (fixed 34px)
   * and cannot shrink (the toolbar is `shrink-0`), so an over-wide strip would push the
   * tabs rather than reflow. Shedding the secondary figures is the explicit way to lose
   * that fight; it mirrors the `hidden 2xl:inline` the wheel-scroll hint in the same
   * toolbar already uses. Never set this on a method's own result.
   */
  secondary?: boolean;
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
  /**
   * `cards` (default) is the four-coloured-card strip Leasehold and Profit Rent render.
   * `flat` is the redesign's own strip (mock:271-276's `.kpis`): a flat text row, a 10px
   * muted label over a 600-weight tabular number, no icon and no card chrome.
   *
   * Opt-in rather than a replacement because the two panels above have not been through
   * the redesign; they pass no variant, take the branch below unchanged, and render exactly
   * what they rendered before.
   */
  variant?: 'cards' | 'flat';
}

export function KpiSummaryStrip({ cards, variant = 'cards' }: KpiSummaryStripProps) {
  if (cards.every(c => c.value == null || c.value === 0)) return null;

  if (variant === 'flat') {
    // Exact px throughout, not rem utilities: this app's root font-size is 13px, so
    // `text-xs` would render 9.75px against the mock's 10px. Hexes rather than Tailwind
    // colour names for the same reason the summary cards use them — v4's palette is OKLCH
    // and the names no longer land on the mock's tokens (`--ink` #1f2937, `--ink-2`
    // #55636f, `--ink-3` #8a96a0).
    //
    // The mock gets its value colour by inheritance (`.tools` is `--ink-2`, and `.kpi.pri b`
    // overrides to `--ink`); this strip sits on a white card instead, with nothing muted to
    // inherit from, so both inks are set explicitly to keep the primary/secondary contrast
    // the mock actually shows.
    return (
      <div className="flex items-center gap-[14px]">
        {cards.map(card => (
          <div
            key={card.label}
            className={`flex-col leading-[1.15] text-[12px] ${
              card.secondary ? 'hidden 2xl:flex' : 'flex'
            }`}
          >
            <span className="text-[10px] text-[#8a96a0] whitespace-nowrap">{card.label}</span>
            <b
              className={`font-semibold tabular-nums whitespace-nowrap ${
                card.primary ? 'text-[#1f2937]' : 'text-[#55636f]'
              }`}
            >
              {fmt(card.value)}
              {card.note && ` ${card.note}`}
              {card.suffix && (
                <small className="text-[10px] font-normal text-[#8a96a0]"> {card.suffix}</small>
              )}
            </b>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3`}
      style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }}
    >
      {cards.map(card => {
        // `?? 'gray'` only guards the flat variant's cards, which carry no colour. Every
        // caller of this branch passes one, so its output is unchanged.
        const c = colorMap[card.color ?? 'gray'];
        return (
          <div
            key={card.label}
            className={`rounded-lg border px-3 py-2.5 ${c.bg} ${c.border} ${card.primary ? 'ring-1 ring-green-300' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {card.icon && <Icon name={card.icon} className={`size-3 ${c.icon}`} />}
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
      })}
    </div>
  );
}
