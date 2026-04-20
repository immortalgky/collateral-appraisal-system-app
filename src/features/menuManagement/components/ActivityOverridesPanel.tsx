import { useEffect, useMemo, useState } from 'react';
import Icon from '@shared/components/Icon';
import {
  useActivitiesList,
  useActivityOverrides,
  useUpdateActivityOverrides,
} from '../hooks/useActivityOverrides';
import type { ActivityOverrideRow } from '../types';

/**
 * Admin panel for configuring activity-scoped menu overrides.
 *
 * Mounted under the "Activities" tab of the menu admin page. Picks one activity
 * from /admin/activities, then renders a table of appraisal-scope menu items
 * with per-row Visible / Editable toggles. Saves via bulk PUT — the backend
 * strips rows that match the default (Visible=true, Editable=false) so the
 * table stays small.
 */
export function ActivityOverridesPanel() {
  const { data: activities, isLoading: isLoadingActivities } = useActivitiesList();
  const [activityId, setActivityId] = useState<string | null>(null);

  // Auto-select the first activity once the list loads
  useEffect(() => {
    if (!activityId && activities && activities.length > 0) {
      setActivityId(activities[0].activityId);
    }
  }, [activities, activityId]);

  const { data, isLoading, isError, refetch } = useActivityOverrides(activityId);
  const updateMutation = useUpdateActivityOverrides();

  // Local draft — only holds fields that have been touched since last load
  const [draft, setDraft] = useState<Record<string, { isVisible: boolean; canEdit: boolean }>>({});

  // Reset draft when the backend data changes (activity switch or refetch)
  useEffect(() => {
    if (data) setDraft({});
  }, [data]);

  const mergedRows: ActivityOverrideRow[] = useMemo(() => {
    if (!data) return [];
    return data.rows.map(row => {
      const change = draft[row.menuItemId];
      return change ? { ...row, ...change } : row;
    });
  }, [data, draft]);

  const isDirty = Object.keys(draft).length > 0;

  const toggle = (menuItemId: string, field: 'isVisible' | 'canEdit') => {
    const base = mergedRows.find(r => r.menuItemId === menuItemId);
    if (!base) return;
    // "Editable" implies visible — if user checks Editable, auto-check Visible too.
    const next = {
      isVisible: base.isVisible,
      canEdit: base.canEdit,
      [field]: !base[field],
    };
    if (field === 'canEdit' && next.canEdit) next.isVisible = true;
    if (field === 'isVisible' && !next.isVisible) next.canEdit = false;

    setDraft(prev => ({ ...prev, [menuItemId]: next }));
  };

  const handleSave = () => {
    if (!activityId || !data) return;
    updateMutation.mutate(
      {
        activityId,
        body: {
          rows: mergedRows.map(r => ({
            menuItemId: r.menuItemId,
            isVisible: r.isVisible,
            canEdit: r.canEdit,
          })),
        },
      },
      {
        onSuccess: () => {
          setDraft({});
          refetch();
        },
      },
    );
  };

  const handleReset = () => setDraft({});

  return (
    <div className="space-y-4">
      {/* Activity picker */}
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-medium text-gray-600 mb-1">Activity</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={activityId ?? ''}
            onChange={e => setActivityId(e.target.value || null)}
            disabled={isLoadingActivities}
          >
            {isLoadingActivities && <option>Loading…</option>}
            {!isLoadingActivities && (activities?.length ?? 0) === 0 && (
              <option value="">No activities found</option>
            )}
            {activities?.map(a => (
              <option key={a.activityId} value={a.activityId}>
                {a.label} — {a.activityId}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 pb-2 flex-1">
          Overrides apply only to the Appraisal sidebar when a user enters a task for this
          activity. Unchecked rows fall back to role-based permissions.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Icon name="triangle-exclamation" style="solid" className="size-10 text-red-400" />
            <p className="text-sm text-gray-500">Failed to load overrides</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Appraisal Menu</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Item Key</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600 w-28">Visible</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600 w-28">Editable</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-40">Status</th>
              </tr>
            </thead>
            <tbody>
              {mergedRows.map(row => {
                const touched = draft[row.menuItemId] !== undefined;
                const isDefault = row.isVisible && !row.canEdit;
                return (
                  <tr key={row.menuItemId} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2.5 text-gray-900">{row.label}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{row.itemKey}</td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={row.isVisible}
                        onChange={() => toggle(row.menuItemId, 'isVisible')}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={row.canEdit}
                        disabled={!row.isVisible}
                        onChange={() => toggle(row.menuItemId, 'canEdit')}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {touched && <span className="text-amber-600">Unsaved</span>}
                      {!touched && isDefault && <span className="text-gray-400">Role default</span>}
                      {!touched && !isDefault && (
                        <span className="text-blue-600">Activity override</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Actions */}
      {data && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty || updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateMutation.isPending && (
              <Icon name="spinner" style="solid" className="size-4 animate-spin" />
            )}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
