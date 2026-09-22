import { useContext, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ServerDataCtx } from '../../store/selectionContext';
import type { Method, MethodRole } from '../../types/selection';
import {
  costSelectionIssues,
  requiredComponents,
  ROLE_COVERS,
} from '../../utils/costRequiredComponents';

/** Per-role chip border colour (mock `.fxp.r-land/.r-bld/.r-mc`, mock:462-464). `LandAndBuilding`
 *  has no override in the mock (no `.fxp.r-all` rule) so it keeps the chip's default border. */
const ROLE_BORDER: Partial<Record<MethodRole, string>> = {
  Land: '#15803d',
  Building: '#99f6e4',
  Machinery: '#b45309',
};

interface PricingAnalysisCostFormulaRowProps {
  /** The Cost approach's full method list — filtered here to the multi-selected ones. */
  methods: Method[];
}

/**
 * Cost approach formula row (mock:3188, `costParts()`/`paintSel()` at mock:3162-3350) — shows how
 * the group's Cost value is built from its multi-selected methods, and warns when a required
 * component (from the group's properties) is missing or counted by more than one method.
 *
 * Renders nothing when the group has no required components (a condo group, or a model subject
 * with no `groupDetail`) — same gate as the mock's `GT().need.length`. The other half of the
 * mock's gate, `ms.length` (mock:3183), is `sel.added[a.id]` — methods *added* to the approach,
 * not ticked — so this checks `methods.length`, not `picks.length`: with nothing ticked yet, the
 * row still renders and shows every required component as missing (mock's own empty-pick state).
 */
export function PricingAnalysisCostFormulaRow({ methods }: PricingAnalysisCostFormulaRowProps) {
  const { t } = useTranslation('pricingAnalysis');
  const serverData = useContext(ServerDataCtx);
  const required = requiredComponents(serverData?.groupDetail?.properties ?? []);
  const picks = methods.filter(m => m.isSelected);

  if (required.length === 0 || methods.length === 0) return null;

  // Shared with the Save button's gate (PricingAnalysisApproachMethodSelector) — one
  // implementation, so the banner below and the button can never disagree about the same ticks.
  // A selected method with no role covers nothing (it can't be checked against `required`) and,
  // same as a missing/duplicated/uncalculated component, keeps this row from resolving a total —
  // silently treating it as fully covering or contributing nothing would both be wrong.
  const { missing, duplicated, roleless, pending } = costSelectionIssues(methods, required);
  const ok = !missing.length && !duplicated.length && !roleless.length && !pending.length;
  const total = ok ? picks.reduce((sum, p) => sum + p.appraisalValue, 0) : null;

  const roleLabel = (role: MethodRole) => t(`board.role.${role}` as `board.role.${MethodRole}`);

  // Roleless picks read as a miss-styled chip (below) instead of a separate red line — mock has
  // no equivalent because every mock method always has a role, so there's no vocabulary for it
  // to borrow beyond its own `.fxp.miss` chip.
  const warnings = [
    ...duplicated.map(c =>
      t('board.formula.duplicateWarning', {
        component: roleLabel(c),
        methods: picks
          .filter(p => p.role && ROLE_COVERS[p.role].includes(c))
          .map(p => p.methodType)
          .join(t('board.formula.and')),
      }),
    ),
    ...pending.map(p => t('board.formula.pendingWarning', { method: p.methodType })),
  ];

  /** Two-line chip (mock `.fxp`, mock:459-469): a small muted label over a bold value. */
  const chip = (
    key: string,
    label: string,
    value: string,
    opts: { miss?: boolean; tot?: boolean; borderColor?: string } = {},
  ) => (
    <span
      key={key}
      className={clsx(
        'inline-flex flex-col justify-center whitespace-nowrap rounded-[7px] border px-[9px] py-[3px] leading-[1.2]',
        opts.tot ? 'border-[#0d9488] bg-[#0d9488]' : 'bg-white',
        opts.miss && 'border-dashed',
        !opts.tot && !opts.borderColor && 'border-[#e3e9e8]',
      )}
      style={opts.borderColor ? { borderColor: opts.borderColor } : undefined}
    >
      <span className={clsx('text-[10px]', opts.tot ? 'text-white' : 'text-[#8a96a0]')}>
        {label}
      </span>
      <b
        className={clsx(
          'tabular-nums',
          opts.tot
            ? 'text-[12.5px] font-semibold text-white'
            : opts.miss
              ? 'text-[11.5px] font-medium text-[#8a96a0]'
              : 'text-[12.5px] font-semibold text-gray-800',
        )}
      >
        {value}
      </b>
    </span>
  );

  const op = (key: string, symbol: '+' | '=') => (
    <span key={key} className="font-semibold text-[#8a96a0]">
      {symbol}
    </span>
  );

  // Picks and missing components share one "+"-separated chain — combined so the leading item
  // (whichever list it comes from, including the all-missing case when nothing is ticked yet)
  // never gets a stray leading "+".
  const leftItems: { key: string; node: ReactNode }[] = [
    ...picks.map(p => ({
      key: p.methodType,
      node: p.role
        ? chip(
            p.methodType,
            `${roleLabel(p.role)} · ${p.methodType}`,
            p.appraisalValue > 0 ? p.appraisalValue.toLocaleString() : '—',
            { borderColor: ROLE_BORDER[p.role] },
          )
        : chip(p.methodType, p.methodType, t('board.roleUnset'), { miss: true }),
    })),
    ...missing.map(c => ({
      key: c,
      node: chip(c, roleLabel(c), t('board.formula.missingCover'), { miss: true }),
    })),
  ];

  return (
    // mock:456 — `.g.board tr.formula td { background: var(--accent-wash) }`. Painted on the
    // cells rather than the row: a <tr> background sits behind its cells, so any cell that
    // stays transparent lets the surface underneath show through as a white gap — which is
    // exactly what the empty first column was doing. Written as the literal hex because
    // Tailwind v4's palette is OKLCH, so `teal-50` no longer equals the mock's token.
    <tr className="[&>td]:bg-[#f0fdfa]">
      <td></td>
      <td colSpan={5} className="px-[8px] py-1.5">
        <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[6px] text-[11px]">
          {leftItems.map((item, i) => (
            <span key={`w-${item.key}`} className="contents">
              {i > 0 && op(`op-${item.key}`, '+')}
              {item.node}
            </span>
          ))}
          {op('op-total', '=')}
          {chip(
            'total',
            t('board.formula.totalLabel'),
            total == null ? '—' : total.toLocaleString(),
            {
              tot: true,
            },
          )}
          <div className="basis-full text-[10.5px] text-[#8a96a0]">
            {t('board.formula.requiredNote', {
              components: required.map(roleLabel).join(' + '),
            })}
          </div>
          {warnings.length > 0 && (
            <div className="basis-full text-[11px] font-medium text-[#b45309]">
              {warnings.join(' · ')}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
