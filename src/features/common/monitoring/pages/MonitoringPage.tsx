import { useCallback, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Icon from '@shared/components/Icon';
import { useAuthStore } from '@features/auth/store';

import {
  useMonitoringTabCounts,
  type TopBreachRow,
  type TopBreachSectionId,
} from '../api/monitoringApi';
import PendingQuotationSection from '../components/sections/PendingQuotationSection';
import PendingInternalSection from '../components/sections/PendingInternalSection';
import PendingExternalSection from '../components/sections/PendingExternalSection';
import PendingFollowupSection from '../components/sections/PendingFollowupSection';
import PendingEvaluationSection from '../components/sections/PendingEvaluationSection';
import MeetingFollowupSection from '../components/sections/MeetingFollowupSection';
import MonitoringSectionCard, { type SectionAccent } from '../components/MonitoringSectionCard';
import MonitoringOverviewStrip from '../components/MonitoringOverviewStrip';
import TopBreachesBanner from '../components/TopBreachesBanner';

// ─── Section identifiers ──────────────────────────────────────────────────────

export type MonitoringSectionId =
  | 'pending-quotation'
  | 'pending-internal'
  | 'pending-external'
  | 'pending-followup'
  | 'pending-evaluation'
  | 'meeting-followup';

const EXPANDED_PARAM = 'expanded';

// ─── Section config ───────────────────────────────────────────────────────────

type MonitoringSectionLabelKey =
  | 'tabs.pendingQuotation'
  | 'tabs.pendingInternal'
  | 'tabs.pendingExternal'
  | 'tabs.pendingFollowup'
  | 'tabs.pendingEvaluation'
  | 'tabs.meetingFollowup';

interface SectionConfig {
  id: MonitoringSectionId;
  labelKey: MonitoringSectionLabelKey;
  permissionPrefix: string;
  icon: string;
  accent: SectionAccent;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'pending-quotation',
    labelKey: 'tabs.pendingQuotation',
    permissionPrefix: 'MONITORING:PENDING_QUOTATION',
    icon: 'file-invoice-dollar',
    accent: 'emerald',
  },
  {
    id: 'pending-internal',
    labelKey: 'tabs.pendingInternal',
    permissionPrefix: 'MONITORING:PENDING_INTERNAL:',
    icon: 'briefcase',
    accent: 'indigo',
  },
  {
    id: 'pending-external',
    labelKey: 'tabs.pendingExternal',
    permissionPrefix: 'MONITORING:PENDING_EXTERNAL:',
    icon: 'building',
    accent: 'amber',
  },
  {
    id: 'pending-followup',
    labelKey: 'tabs.pendingFollowup',
    permissionPrefix: 'MONITORING:PENDING_FOLLOWUP',
    icon: 'clipboard-list',
    accent: 'purple',
  },
  {
    id: 'pending-evaluation',
    labelKey: 'tabs.pendingEvaluation',
    permissionPrefix: 'MONITORING:PENDING_EVALUATION',
    icon: 'star',
    accent: 'yellow',
  },
  {
    id: 'meeting-followup',
    labelKey: 'tabs.meetingFollowup',
    permissionPrefix: 'MONITORING:MEETING_FOLLOWUP',
    icon: 'users',
    accent: 'cyan',
  },
];

const SECTION_BODY: Record<MonitoringSectionId, ReactNode> = {
  'pending-quotation': <PendingQuotationSection />,
  'pending-internal': <PendingInternalSection />,
  'pending-external': <PendingExternalSection />,
  'pending-followup': <PendingFollowupSection />,
  'pending-evaluation': <PendingEvaluationSection />,
  'meeting-followup': <MeetingFollowupSection />,
};

// ─── Component ────────────────────────────────────────────────────────────────

// Stable empty fallback — selector must not return a new array literal on each call,
// or Zustand triggers an infinite re-render loop.
const EMPTY_PERMISSIONS: readonly string[] = Object.freeze([]);

function MonitoringPage() {
  const { t } = useTranslation('monitoring');
  const [searchParams, setSearchParams] = useSearchParams();

  const permissions = useAuthStore(state => state.user?.permissions ?? EMPTY_PERMISSIONS);

  // Sections the user is permitted to see.
  const visibleSections = useMemo(
    () => SECTIONS.filter(s => permissions.some(p => p.startsWith(s.permissionPrefix))),
    [permissions],
  );

  // Eagerly fetch count for each section the user can see. Each query is
  // gated by `enabled` so we don't hit endpoints the user has no permission for.
  const tabCounts = useMonitoringTabCounts({
    pendingQuotation: visibleSections.some(s => s.id === 'pending-quotation'),
    pendingInternal: visibleSections.some(s => s.id === 'pending-internal'),
    pendingExternal: visibleSections.some(s => s.id === 'pending-external'),
    pendingFollowup: visibleSections.some(s => s.id === 'pending-followup'),
    pendingEvaluation: visibleSections.some(s => s.id === 'pending-evaluation'),
    meetingFollowup: visibleSections.some(s => s.id === 'meeting-followup'),
  });

  const countForSection = (id: MonitoringSectionId): number | undefined => {
    switch (id) {
      case 'pending-quotation':
        return tabCounts.pendingQuotation;
      case 'pending-internal':
        return tabCounts.pendingInternal;
      case 'pending-external':
        return tabCounts.pendingExternal;
      case 'pending-followup':
        return tabCounts.pendingFollowup;
      case 'pending-evaluation':
        return tabCounts.pendingEvaluation;
      case 'meeting-followup':
        return tabCounts.meetingFollowup;
    }
  };

  /** SLA breakdown for OLA sections only. Others return zeros. */
  const slaForSection = (
    id: MonitoringSectionId,
  ): { breached: number; atRisk: number; healthy: number } => {
    if (id === 'pending-internal') {
      return {
        breached: tabCounts.pendingInternalBreached ?? 0,
        atRisk: tabCounts.pendingInternalAtRisk ?? 0,
        healthy: tabCounts.pendingInternalHealthy ?? 0,
      };
    }
    if (id === 'pending-external') {
      return {
        breached: tabCounts.pendingExternalBreached ?? 0,
        atRisk: tabCounts.pendingExternalAtRisk ?? 0,
        healthy: tabCounts.pendingExternalHealthy ?? 0,
      };
    }
    if (id === 'pending-followup') {
      return {
        breached: tabCounts.pendingFollowupBreached ?? 0,
        atRisk: tabCounts.pendingFollowupAtRisk ?? 0,
        healthy: tabCounts.pendingFollowupHealthy ?? 0,
      };
    }
    return { breached: 0, atRisk: 0, healthy: 0 };
  };

  // Default = sections whose count is non-zero (or still loading — keep
  // expanded during initial load to avoid a collapse-then-expand flicker as
  // counts stream in).
  //
  // Depend on the scalar count fields rather than `tabCounts` itself —
  // `useMonitoringTabCounts` returns a fresh object every render (it carries
  // churning `dataUpdatedAt` / `isRefetching` / `refetchAll`), so a `tabCounts`
  // dep would defeat the memo entirely.
  const defaultExpandedIds = useMemo<Set<MonitoringSectionId>>(() => {
    const countsById: Record<MonitoringSectionId, number | undefined> = {
      'pending-quotation': tabCounts.pendingQuotation,
      'pending-internal': tabCounts.pendingInternal,
      'pending-external': tabCounts.pendingExternal,
      'pending-followup': tabCounts.pendingFollowup,
      'pending-evaluation': tabCounts.pendingEvaluation,
      'meeting-followup': tabCounts.meetingFollowup,
    };
    return new Set(
      visibleSections
        .filter(s => {
          const c = countsById[s.id];
          return c === undefined || c > 0;
        })
        .map(s => s.id),
    );
  }, [
    visibleSections,
    tabCounts.pendingQuotation,
    tabCounts.pendingInternal,
    tabCounts.pendingExternal,
    tabCounts.pendingFollowup,
    tabCounts.pendingEvaluation,
    tabCounts.meetingFollowup,
  ]);

  // Resolve expanded set from URL.
  // Param semantics:
  //   - param absent → default (non-zero / still-loading sections expanded)
  //   - param present (even empty) → exactly the listed visible ids
  const expandedIds = useMemo<Set<MonitoringSectionId>>(() => {
    const param = searchParams.get(EXPANDED_PARAM);
    if (param === null) return defaultExpandedIds;
    const visibleIdSet = new Set(visibleSections.map(s => s.id));
    const parsed = param
      .split(',')
      .map(s => s.trim())
      .filter((s): s is MonitoringSectionId => visibleIdSet.has(s as MonitoringSectionId));
    return new Set(parsed);
  }, [searchParams, visibleSections, defaultExpandedIds]);

  const writeExpanded = useCallback(
    (next: Set<MonitoringSectionId>) => {
      setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        const allIds = visibleSections.map(s => s.id);
        const matchesDefault =
          next.size === defaultExpandedIds.size &&
          allIds.every(id => next.has(id) === defaultExpandedIds.has(id));
        if (matchesDefault) {
          // Clean URL when user's set equals the count-aware default.
          params.delete(EXPANDED_PARAM);
        } else {
          params.set(EXPANDED_PARAM, allIds.filter(id => next.has(id)).join(','));
        }
        return params;
      });
    },
    [setSearchParams, visibleSections, defaultExpandedIds],
  );

  const handleToggle = useCallback(
    (id: MonitoringSectionId) => {
      const next = new Set(expandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeExpanded(next);
    },
    [expandedIds, writeExpanded],
  );

  // No visible sections — user reached this page without any monitoring permissions.
  if (visibleSections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-gray-500">{t('common.noRecords')}</p>
      </div>
    );
  }

  const visibleOlaSections = visibleSections
    .map(s => s.id)
    .filter(
      (id): id is TopBreachSectionId =>
        id === 'pending-internal' || id === 'pending-external' || id === 'pending-followup',
    );

  // Expand the target section (if collapsed) and scroll its card into view.
  // Two rAFs because the section body is lazy-mounted: one for React to commit
  // the new URL, one for the section card to render its body, then we measure.
  const scrollToSection = (id: MonitoringSectionId) => {
    if (!expandedIds.has(id)) {
      const next = new Set(expandedIds);
      next.add(id);
      writeExpanded(next);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`section-${id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  const handleTopBreachClick = (row: TopBreachRow) => scrollToSection(row.sectionId);

  return (
    <div className="flex flex-col min-w-0">
      {/* Page-level overview */}
      <div className="shrink-0 mb-3">
        <MonitoringOverviewStrip counts={tabCounts} />
      </div>

      {/* Top critical items (auto-hides when empty) */}
      <div className="shrink-0 mb-3">
        <TopBreachesBanner
          visibleOlaSections={visibleOlaSections}
          onChipClick={handleTopBreachClick}
        />
      </div>

      {/* Jump-to shortcut chips */}
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-gray-500 mr-1">{t('jumpTo')}</span>
        {visibleSections.map(section => {
          const count = countForSection(section.id);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Icon style="solid" name={section.icon} className="size-3 text-gray-500" />
              <span>{t(section.labelKey)}</span>
              {count !== undefined && (
                <span className="px-1 text-[10px] font-semibold text-gray-500 tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapsible sections */}
      <div className="flex flex-col gap-3 min-w-0">
        {visibleSections.map(section => {
          const sla = slaForSection(section.id);
          return (
            <div key={section.id} id={`section-${section.id}`}>
              <MonitoringSectionCard
                id={section.id}
                title={t(section.labelKey)}
                icon={section.icon}
                accent={section.accent}
                count={countForSection(section.id)}
                breached={sla.breached}
                atRisk={sla.atRisk}
                healthy={sla.healthy}
                expanded={expandedIds.has(section.id)}
                onToggle={handleToggle}
              >
                {SECTION_BODY[section.id]}
              </MonitoringSectionCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonitoringPage;
