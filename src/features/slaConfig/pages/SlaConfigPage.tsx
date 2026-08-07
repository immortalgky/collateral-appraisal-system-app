import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { useParameterOptions } from '@shared/utils/parameterUtils';
import {
  OVERRIDE_PRIORITY,
  useCreateHoliday,
  useCreateSlaPolicy,
  useDeleteHoliday,
  useDeleteSlaPolicy,
  useGetBusinessHours,
  useGetHolidays,
  useGetSlaMatrix,
  useUpdateSlaPolicy,
  useUpsertBusinessHours,
  type HolidayDto,
  type SlaMatrixActivity,
  type SlaMatrixGroup,
  type SlaMatrixResponse,
} from '../api/slaConfigApi';

// Business hours per working day — matches the seeded workflow umbrella (240h / 30 business-days).
const BUSINESS_HOURS_PER_DAY = 8;

const APPRAISAL_TYPES = ['New', 'ReAppraisal', 'Progressive', 'PreAppraisal'] as const;

// Display groups by OWNER (who is responsible for the time).
const OWNER_GROUPS = [
  { owner: 'Shared', label: 'Shared activities (bank, both cases)' },
  { owner: 'External', label: 'External / vendor activities (external company)' },
  { owner: 'Bank', label: 'Bank appraisal step' },
] as const;


const inputClass =
  'w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

const selectClass =
  'rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

const daysHint = (hours: number) =>
  `≈ ${(hours / BUSINESS_HOURS_PER_DAY).toFixed(1)} day(s)`;

// ─── Anchor selector ──────────────────────────────────────────────────────────
// Shared between group rows and per-activity rows. Passes null for "no anchor".

function AnchorSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className={selectClass + (disabled ? ' opacity-40 cursor-not-allowed' : '')}
      disabled={disabled}
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
    >
      <option value="">No anchor</option>
      <option value="Assignment">Assignment</option>
      <option value="AppointmentDate">Appointment date</option>
    </select>
  );
}

// ─── Group (Stage-scope) window editor ───────────────────────────────────────
// A group is one shared OLA/SLA window from a Start activity to an End activity (e.g. the external
// company's total turnaround). Saving an inherited default spawns a new override for this cell;
// saving an override updates it in place.

type GroupDraft = { start: string; end: string; hours: string; anchorType: string | null };
type ActivityOption = { id: string; name: string };

function GroupSpanEditor({
  activities,
  group,
  hours,
  onHoursChange,
  onSave,
  onDelete,
  busy,
}: {
  activities: ActivityOption[];
  group: SlaMatrixGroup | null; // null = add-new form
  hours: string;
  onHoursChange: (v: string) => void;
  onSave: (draft: GroupDraft) => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  const [start, setStart] = useState(group?.startActivityKey ?? '');
  const [end, setEnd] = useState(group?.endActivityKey ?? group?.startActivityKey ?? '');
  const [anchorType, setAnchorType] = useState<string | null>(group?.anchorType ?? null);

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="text-xs text-gray-500">Start</label>
        <select value={start} onChange={e => setStart(e.target.value)} className={selectClass}>
          <option value="">—</option>
          {activities.map(a => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <label className="text-xs text-gray-500">End</label>
        <select value={end} onChange={e => setEnd(e.target.value)} className={selectClass}>
          <option value="">—</option>
          {activities.map(a => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          value={hours}
          onChange={e => onHoursChange(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-gray-400">hrs</span>
        <AnchorSelect value={anchorType} onChange={setAnchorType} />
        {group &&
          (group.isOverride ? (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">override</span>
          ) : (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              inherited default
            </span>
          ))}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            type="button"
            onClick={() => onSave({ start, end, hours, anchorType })}
            isLoading={busy}
          >
            Save
          </Button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-1 text-gray-400 hover:text-red-500"
              aria-label="Delete group"
              title="Delete / revert to default"
            >
              <Icon name="trash" style="solid" className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      {group && group.members.length > 0 && (
        <p className="mt-1 px-1 text-xs text-gray-400">
          Members: {group.members.join(', ')}
        </p>
      )}
    </div>
  );
}

// ─── Pill selector ─────────────────────────────────────────────────────────────

function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            value === o.value
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Editor (remounts per path + refetch via key) ────────────────────────────────

interface EditorProps {
  data: SlaMatrixResponse;
  loanType: string;
  appraisalType: string;
}

function MatrixEditor({ data, loanType, appraisalType }: EditorProps) {
  const create = useCreateSlaPolicy();
  const update = useUpdateSlaPolicy();
  const remove = useDeleteSlaPolicy();
  const busy = create.isPending || update.isPending || remove.isPending;

  // Draft state, initialized from server data (component is remounted on refetch).
  const [umbrella, setUmbrella] = useState(
    data.umbrella.durationHours != null ? String(data.umbrella.durationHours) : '',
  );
  const [activityHours, setActivityHours] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      data.activities.map(a => [a.activityId, a.durationHours != null ? String(a.durationHours) : '']),
    ),
  );
  const [groupHours, setGroupHours] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.groups.map(g => [g.policyId, String(g.durationHours)])),
  );
  // Per-activity anchor: 0 = Assignment, 1 = Appointment date, null = no anchor.
  const [activityAnchor, setActivityAnchor] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(data.activities.map(a => [a.activityId, a.anchorType])),
  );
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupHours, setNewGroupHours] = useState('');
  const [groupToDelete, setGroupToDelete] = useState<SlaMatrixGroup | null>(null);

  // Activity options for the group span selectors/checkboxes.
  const activityOptions: ActivityOption[] = data.activities.map(a => ({
    id: a.activityId,
    name: a.name,
  }));

  const umbrellaHours = parseInt(umbrella || '0', 10) || 0;

  // ── Persist helpers ──
  const handleError = (e: unknown) => {
    const msg =
      (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
      'Save failed';
    toast.error(msg);
  };

  const saveActivity = (act: SlaMatrixActivity) => {
    const hours = parseInt(activityHours[act.activityId] || '', 10);
    if (isNaN(hours) || hours < 0) {
      toast.error('Enter a valid number of hours');
      return;
    }
    const onDone = {
      onSuccess: () => toast.success(`${act.name} saved`),
      onError: handleError,
    };
    if (act.isOverride && act.policyId) {
      update.mutate(
        {
          id: act.policyId,
          body: {
            durationHours: hours,
            useBusinessDays: true,
            priority: OVERRIDE_PRIORITY,
            loanType,
            appraisalType,
            scope: 1,
            anchorType: activityAnchor[act.activityId] ?? null,
          },
        },
        onDone,
      );
    } else {
      create.mutate(
        {
          activityId: act.activityId,
          durationHours: hours,
          useBusinessDays: true,
          priority: OVERRIDE_PRIORITY,
          loanType,
          appraisalType,
          scope: 1,
          anchorType: activityAnchor[act.activityId] ?? null,
        },
        onDone,
      );
    }
  };

  const revertActivity = (act: SlaMatrixActivity) => {
    if (!act.policyId) return;
    remove.mutate(act.policyId, {
      onSuccess: () => toast.success(`${act.name} reverted to default`),
      onError: handleError,
    });
  };

  const saveUmbrella = () => {
    const hours = parseInt(umbrella || '', 10);
    if (isNaN(hours) || hours <= 0) {
      toast.error('Enter a valid SLA umbrella in hours');
      return;
    }
    if (!data.umbrella.workflowDefinitionId) {
      toast.error('No workflow context for the SLA umbrella (seed a default first)');
      return;
    }
    const onDone = {
      onSuccess: () => toast.success('SLA umbrella saved'),
      onError: handleError,
    };
    if (data.umbrella.isOverride && data.umbrella.policyId) {
      update.mutate(
        {
          id: data.umbrella.policyId,
          body: {
            durationHours: hours,
            useBusinessDays: true,
            priority: OVERRIDE_PRIORITY,
            loanType,
            appraisalType,
            scope: 3,
            workflowDefinitionId: data.umbrella.workflowDefinitionId,
          },
        },
        onDone,
      );
    } else {
      create.mutate(
        {
          activityId: '*',
          durationHours: hours,
          useBusinessDays: true,
          priority: OVERRIDE_PRIORITY,
          loanType,
          appraisalType,
          scope: 3,
          workflowDefinitionId: data.umbrella.workflowDefinitionId,
        },
        onDone,
      );
    }
  };

  // Create or update a Stage-scope (group) OLA. `existing` is the row being edited (null = brand new).
  // Editing an inherited default spawns a NEW override at this cell; editing an override updates it in
  // place. The span (start/end/middle) is fully editable here — that's how you add/remove activities.
  const persistGroup = (existing: SlaMatrixGroup | null, draft: GroupDraft) => {
    const hours = parseInt(draft.hours || '', 10);
    if (!draft.start || !draft.end) {
      toast.error('Pick a start and end activity for the group');
      return;
    }
    if (isNaN(hours) || hours <= 0) {
      toast.error('Enter a valid number of hours');
      return;
    }
    const body = {
      durationHours: hours,
      useBusinessDays: true,
      priority: OVERRIDE_PRIORITY,
      loanType,
      appraisalType,
      scope: 2 as const,
      startActivityKey: draft.start,
      endActivityKey: draft.end,
      middleActivityKeys: null,
      anchorType: draft.anchorType,
      // Carry the workflow definition id so the backend can graph-walk Start→End for members.
      workflowDefinitionId: data.umbrella.workflowDefinitionId,
    };
    const onDone = {
      onSuccess: () => toast.success('Group OLA saved'),
      onError: handleError,
    };
    if (existing?.isOverride) {
      update.mutate({ id: existing.policyId, body }, onDone);
    } else {
      create.mutate({ activityId: '*', ...body }, onDone);
    }
  };

  // Delete is confirmed via a dialog. An override delete just reverts that cell to the inherited
  // default; a DEFAULT delete removes the shared group window for ALL loan/appraisal-type cells.
  const confirmDeleteGroup = () => {
    if (!groupToDelete) return;
    const wasOverride = groupToDelete.isOverride;
    remove.mutate(groupToDelete.policyId, {
      onSuccess: () => {
        toast.success(wasOverride ? 'Group reverted to default' : 'Group deleted');
        setGroupToDelete(null);
      },
      onError: handleError,
    });
  };

  // ── Render ──
  return (
    <div className="flex flex-col gap-5">
      {/* SLA umbrella */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">SLA umbrella (end-to-end)</span>
          {!data.umbrella.isOverride && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              inherited default
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={umbrella}
              onChange={e => setUmbrella(e.target.value)}
              className={inputClass}
            />
            <span className="w-24 text-xs text-gray-400">hrs · {daysHint(umbrellaHours)}</span>
            <Button size="sm" type="button" onClick={saveUmbrella} isLoading={busy}>
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Group OLAs — a shared OLA/SLA window from a Start activity to an End activity. */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-gray-800">Group windows (Start → End)</p>
        <p className="mb-2 text-xs text-gray-500">
          A shared OLA/SLA deadline spanning from a start activity to an end activity (e.g. the
          external company's total turnaround), separate from the per-activity hours below.
        </p>
        <div className="space-y-2">
          {data.groups.map(g => (
            <GroupSpanEditor
              key={g.policyId}
              activities={activityOptions}
              group={g}
              hours={groupHours[g.policyId] ?? ''}
              onHoursChange={v => setGroupHours(prev => ({ ...prev, [g.policyId]: v }))}
              onSave={draft => persistGroup(g, draft)}
              onDelete={() => setGroupToDelete(g)}
              busy={busy}
            />
          ))}

          {showAddGroup ? (
            <GroupSpanEditor
              activities={activityOptions}
              group={null}
              hours={newGroupHours}
              onHoursChange={setNewGroupHours}
              onSave={draft => {
                persistGroup(null, draft);
                setNewGroupHours('');
                setShowAddGroup(false);
              }}
              busy={busy}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddGroup(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add group
            </button>
          )}
        </div>
      </div>

      {/* Per-activity OLAs, grouped by owner */}
      {OWNER_GROUPS.map(({ owner, label }) => {
        const rows = data.activities.filter(a => a.owner === owner);
        if (rows.length === 0) return null;
        return (
          <div key={owner} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-800">{label}</p>
            <div className="space-y-1.5">
              {rows.map(act => {
                // WindowMember activities are governed by a group window; their
                // individual hours/anchor are irrelevant and must not be edited.
                const isWindowMember = act.clockMode === 'WindowMember';
                return (
                  <div
                    key={act.activityId}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm"
                  >
                    <span className="flex-1 text-gray-700">
                      {act.name}
                      {act.scenario !== 'Both' && (
                        <span className="ml-2 rounded bg-violet-50 px-1.5 py-0.5 text-xs text-violet-600">
                          {act.scenario === 'ExternalCase' ? 'external case' : 'in-house case'}
                        </span>
                      )}
                      {act.isOverride && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                          override
                        </span>
                      )}
                      {isWindowMember && (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
                          governed by {act.governingWindow ?? 'window'}
                        </span>
                      )}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={activityHours[act.activityId] ?? ''}
                      onChange={e =>
                        setActivityHours(prev => ({ ...prev, [act.activityId]: e.target.value }))
                      }
                      disabled={isWindowMember}
                      className={inputClass + (isWindowMember ? ' opacity-40 cursor-not-allowed' : '')}
                    />
                    <span className="w-12 text-xs text-gray-400">hrs</span>
                    <AnchorSelect
                      value={activityAnchor[act.activityId] ?? null}
                      onChange={v =>
                        setActivityAnchor(prev => ({ ...prev, [act.activityId]: v }))
                      }
                      disabled={isWindowMember}
                    />
                    {!isWindowMember && (
                      <>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => saveActivity(act)}
                          isLoading={busy}
                        >
                          Save
                        </Button>
                        {act.isOverride && (
                          <button
                            type="button"
                            onClick={() => revertActivity(act)}
                            className="rounded p-1 text-gray-400 hover:text-red-500"
                            aria-label="Revert to default"
                            title="Revert to default"
                          >
                            <Icon name="rotate-left" style="solid" className="size-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        isOpen={!!groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onConfirm={confirmDeleteGroup}
        isLoading={remove.isPending}
        variant="danger"
        title={groupToDelete?.isOverride ? 'Revert group to default' : 'Delete group window'}
        confirmText={groupToDelete?.isOverride ? 'Revert' : 'Delete'}
        message={
          groupToDelete?.isOverride
            ? 'Revert this group to the inherited default for this loan type / appraisal type?'
            : 'This removes the group window for ALL loan types and appraisal types (it is the shared default). Continue?'
        }
      />
    </div>
  );
}

// ─── Targets tab ──────────────────────────────────────────────────────────────

function TargetsTab() {
  const segmentOptions = useParameterOptions('BankingSegment');
  const loanTypeOptions = useMemo(
    () => segmentOptions.map(o => ({ value: String(o.value), label: o.label })),
    [segmentOptions],
  );

  const [loanType, setLoanType] = useState('');
  const [appraisalType, setAppraisalType] = useState<string>(APPRAISAL_TYPES[0]);

  // Default the loan-type selection once options load.
  const effectiveLoanType = loanType || loanTypeOptions[0]?.value || '';

  const { data, isLoading, dataUpdatedAt } = useGetSlaMatrix(effectiveLoanType, appraisalType);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        Define the end-to-end SLA umbrella and the per-activity / group OLA targets for each loan
        type and appraisal type. Targets apply to new appraisals.
      </p>

      {/* Selectors */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">Loan Type</p>
          <Pills options={loanTypeOptions} value={effectiveLoanType} onChange={setLoanType} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">Appraisal Type</p>
          <Pills
            options={APPRAISAL_TYPES.map(t => ({ value: t, label: t }))}
            value={appraisalType}
            onChange={setAppraisalType}
          />
        </div>
      </div>

      {/* Editor */}
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <MatrixEditor
          // Remount on path change OR after a save-triggered refetch so drafts re-init from server.
          key={`${effectiveLoanType}-${appraisalType}-${dataUpdatedAt}`}
          data={data}
          loanType={effectiveLoanType}
          appraisalType={appraisalType}
        />
      )}
    </div>
  );
}

// ─── Holidays tab ─────────────────────────────────────────────────────────────
// Non-working days for the business-day SLA clock. The API has no update verb,
// so correcting an entry means delete + re-add.

function HolidaysTab() {
  const [year, setYear] = useState<string>('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [toDelete, setToDelete] = useState<HolidayDto | null>(null);

  const yearFilter = year ? Number(year) : undefined;
  const { data: holidays = [], isLoading } = useGetHolidays(yearFilter);
  const create = useCreateHoliday();
  const remove = useDeleteHoliday();

  // Year pills come from what is actually stored, so the list never offers an empty year.
  const { data: allHolidays = [] } = useGetHolidays();
  const yearOptions = useMemo(() => {
    const years = [...new Set(allHolidays.map(h => h.year))].sort((a, b) => b - a);
    return [
      { value: '', label: 'All years' },
      ...years.map(y => ({ value: String(y), label: String(y) })),
    ];
  }, [allHolidays]);

  const add = () => {
    if (!date) {
      toast.error('Pick a date.');
      return;
    }
    if (!description.trim()) {
      toast.error('Enter a description.');
      return;
    }
    if (holidays.some(h => h.date === date)) {
      toast.error('That date is already a holiday.');
      return;
    }
    create.mutate(
      { date, description: description.trim() },
      {
        onSuccess: () => {
          toast.success('Holiday added');
          setDate('');
          setDescription('');
        },
        onError: () => toast.error('Could not add the holiday'),
      },
    );
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Holiday removed');
        setToDelete(null);
      },
      onError: () => toast.error('Could not remove the holiday'),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        Dates the business-day SLA clock skips. Applies to every loan type and appraisal type.
      </p>

      {/* Add row */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">Date</p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={selectClass}
          />
        </div>
        <div className="flex-1 min-w-48">
          <p className="mb-1 text-xs font-medium text-gray-600">Description</p>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Songkran Festival"
            className={selectClass + ' w-full'}
          />
        </div>
        <Button size="sm" type="button" onClick={add} isLoading={create.isPending}>
          <Icon name="plus" style="solid" className="mr-1.5 size-3.5" />
          Add holiday
        </Button>
      </div>

      {/* Year filter */}
      {yearOptions.length > 1 && (
        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">Year</p>
          <Pills options={yearOptions} value={year} onChange={setYear} />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : holidays.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          No holidays configured{year ? ` for ${year}` : ''}. The SLA clock treats every weekday as
          a working day.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Description', ''].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left text-xs font-medium uppercase text-gray-500 last:w-16"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {holidays.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{h.date}</td>
                  <td className="px-4 py-2.5 text-gray-700">{h.description}</td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setToDelete(h)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      aria-label={`Remove ${h.description}`}
                    >
                      <Icon name="trash" style="solid" className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={remove.isPending}
        variant="danger"
        title="Remove holiday"
        confirmText="Remove"
        message={
          toDelete
            ? `Remove ${toDelete.date} (${toDelete.description})? The SLA clock will count it as a working day.`
            : ''
        }
      />
    </div>
  );
}

// ─── Business hours tab ───────────────────────────────────────────────────────
// One active window shared by every workflow, plus an optional lunch break that
// is subtracted from the elapsed time.

// <input type="time"> exchanges "HH:mm"; the API exchanges TimeOnly ("HH:mm:ss").
const toApiTime = (v: string) => (v.length === 5 ? `${v}:00` : v);
const toInputTime = (v: string | null | undefined) => (v ? v.slice(0, 5) : '');

function BusinessHoursTab() {
  const { data, isLoading } = useGetBusinessHours();
  const upsert = useUpsertBusinessHours();

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [lunchStartTime, setLunchStartTime] = useState('');
  const [lunchEndTime, setLunchEndTime] = useState('');
  const [timeZone, setTimeZone] = useState('');

  // Re-seed the draft whenever the server copy arrives or changes.
  useEffect(() => {
    setStartTime(toInputTime(data?.startTime) || '08:30');
    setEndTime(toInputTime(data?.endTime) || '17:30');
    setLunchStartTime(toInputTime(data?.lunchStartTime));
    setLunchEndTime(toInputTime(data?.lunchEndTime));
    setTimeZone(data?.timeZone || 'SE Asia Standard Time');
  }, [data]);

  const save = () => {
    if (!startTime || !endTime) {
      toast.error('Start and end time are required.');
      return;
    }
    if (startTime >= endTime) {
      toast.error('End time must be after the start time.');
      return;
    }
    // Lunch is all-or-nothing; the backend rejects a half-configured break.
    if (!!lunchStartTime !== !!lunchEndTime) {
      toast.error('Set both lunch start and lunch end, or neither.');
      return;
    }
    if (lunchStartTime && lunchEndTime) {
      if (lunchStartTime >= lunchEndTime) {
        toast.error('Lunch end must be after lunch start.');
        return;
      }
      if (lunchStartTime < startTime || lunchEndTime > endTime) {
        toast.error('The lunch break must fall inside the working window.');
        return;
      }
    }
    if (!timeZone.trim()) {
      toast.error('Time zone is required.');
      return;
    }

    upsert.mutate(
      {
        startTime: toApiTime(startTime),
        endTime: toApiTime(endTime),
        timeZone: timeZone.trim(),
        lunchStartTime: lunchStartTime ? toApiTime(lunchStartTime) : null,
        lunchEndTime: lunchEndTime ? toApiTime(lunchEndTime) : null,
      },
      {
        onSuccess: () => toast.success('Business hours saved'),
        onError: (err: unknown) => {
          const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Could not save the business hours');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" style="solid" className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-xs text-gray-500">
        The working window the business-hours SLA clock counts. Time outside this window, weekends,
        and any configured holiday are not counted.
      </p>

      {!data && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          No business hours are configured yet — the values below are defaults and are not in effect
          until you save.
        </p>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600">Start time</p>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className={selectClass}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600">End time</p>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className={selectClass}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600">Lunch start (optional)</p>
            <input
              type="time"
              value={lunchStartTime}
              onChange={e => setLunchStartTime(e.target.value)}
              className={selectClass}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600">Lunch end (optional)</p>
            <input
              type="time"
              value={lunchEndTime}
              onChange={e => setLunchEndTime(e.target.value)}
              className={selectClass}
            />
          </div>
          <div className="col-span-2">
            <p className="mb-1 text-xs font-medium text-gray-600">Time zone</p>
            <input
              type="text"
              value={timeZone}
              onChange={e => setTimeZone(e.target.value)}
              className={selectClass + ' w-full'}
            />
            <p className="mt-1 text-xs text-gray-400">
              Windows time-zone id as recognised by the server, e.g.{' '}
              <span className="font-mono">SE Asia Standard Time</span>.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button size="sm" type="button" onClick={save} isLoading={upsert.isPending}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'targets', label: 'OLA / SLA Targets' },
  { value: 'holidays', label: 'Holidays' },
  { value: 'business-hours', label: 'Business Hours' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

function SlaConfigPage() {
  const [tab, setTab] = useState<TabValue>('targets');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">SLA Configuration</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Targets, non-working days, and the working window that together drive the SLA clock.
        </p>
      </div>

      <Pills options={TABS.map(t => ({ ...t }))} value={tab} onChange={setTab} />

      {tab === 'targets' && <TargetsTab />}
      {tab === 'holidays' && <HolidaysTab />}
      {tab === 'business-hours' && <BusinessHoursTab />}
    </div>
  );
}

export default SlaConfigPage;
