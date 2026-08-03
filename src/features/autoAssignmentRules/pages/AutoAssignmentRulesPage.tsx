import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import {
  ROUTING_DECISIONS,
  useCreateAutoAssignmentRule,
  useDeleteAutoAssignmentRule,
  useListAutoAssignmentRules,
  useUpdateAutoAssignmentRule,
  type AutoAssignmentRuleDto,
  type SaveAutoAssignmentRuleBody,
} from '../api/autoAssignmentRules';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none';

// Empty text input → null, so an unconstrained dimension is stored as NULL rather than "".
const orNull = (v: string) => (v.trim() ? v.trim() : null);
const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

// ──────────────────────────────────────────────────────────────────────────────
// Modal
// ──────────────────────────────────────────────────────────────────────────────

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: AutoAssignmentRuleDto | null;
  onSave: (body: SaveAutoAssignmentRuleBody, id?: string) => void;
  isSaving: boolean;
}

function RuleModal({ isOpen, onClose, editing, onSave, isSaving }: RuleModalProps) {
  const { t } = useTranslation('autoAssignmentRules');

  const [ruleName, setRuleName] = useState('');
  const [priority, setPriority] = useState('100');
  const [routingDecision, setRoutingDecision] = useState<string>(ROUTING_DECISIONS[0].value);
  const [channels, setChannels] = useState('');
  const [entrySources, setEntrySources] = useState('');
  const [loanTypes, setLoanTypes] = useState('');
  const [priorities, setPriorities] = useState('');
  const [minFacilityLimit, setMinFacilityLimit] = useState('');
  const [maxFacilityLimit, setMaxFacilityLimit] = useState('');
  const [conditionExpression, setConditionExpression] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    setRuleName(editing?.ruleName ?? '');
    setPriority(String(editing?.priority ?? 100));
    setRoutingDecision(editing?.routingDecision ?? ROUTING_DECISIONS[0].value);
    setChannels(editing?.channels ?? '');
    setEntrySources(editing?.entrySources ?? '');
    setLoanTypes(editing?.loanTypes ?? '');
    setPriorities(editing?.priorities ?? '');
    setMinFacilityLimit(editing?.minFacilityLimit != null ? String(editing.minFacilityLimit) : '');
    setMaxFacilityLimit(editing?.maxFacilityLimit != null ? String(editing.maxFacilityLimit) : '');
    setConditionExpression(editing?.conditionExpression ?? '');
    setIsActive(editing?.isActive ?? true);
  }, [editing, isOpen]);

  const handleSave = () => {
    if (!ruleName.trim()) {
      toast.error(t('validation.nameRequired'));
      return;
    }
    const min = numOrNull(minFacilityLimit);
    const max = numOrNull(maxFacilityLimit);
    if (min != null && max != null && min > max) {
      toast.error(t('validation.minAboveMax'));
      return;
    }

    onSave(
      {
        ruleName: ruleName.trim(),
        priority: Number(priority) || 0,
        routingDecision,
        channels: orNull(channels),
        entrySources: orNull(entrySources),
        loanTypes: orNull(loanTypes),
        priorities: orNull(priorities),
        minFacilityLimit: min,
        maxFacilityLimit: max,
        conditionExpression: orNull(conditionExpression),
        isActive,
      },
      editing?.id,
    );
  };

  const csvField = (label: string, hint: string, value: string, setValue: (v: string) => void) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        className={inputClass}
      />
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? t('modal.editTitle') : t('modal.addTitle')}
      size="lg"
    >
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('fields.ruleName')}
            </label>
            <input
              type="text"
              value={ruleName}
              onChange={e => setRuleName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('fields.priority')}
            </label>
            <input
              type="number"
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">{t('hints.priority')}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('fields.routingDecision')}
          </label>
          <select
            value={routingDecision}
            onChange={e => setRoutingDecision(e.target.value)}
            className={inputClass}
          >
            {ROUTING_DECISIONS.map(d => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            {ROUTING_DECISIONS.find(d => d.value === routingDecision)?.hint}
          </p>
        </div>

        <p className="border-t border-gray-100 pt-3 text-xs font-medium uppercase text-gray-500">
          {t('sections.matchConditions')}
        </p>

        <div className="grid grid-cols-2 gap-4">
          {csvField(t('fields.channels'), t('hints.csv'), channels, setChannels)}
          {csvField(t('fields.entrySources'), t('hints.csv'), entrySources, setEntrySources)}
          {csvField(t('fields.loanTypes'), t('hints.csv'), loanTypes, setLoanTypes)}
          {csvField(t('fields.priorities'), t('hints.csv'), priorities, setPriorities)}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('fields.minFacilityLimit')}
            </label>
            <input
              type="number"
              value={minFacilityLimit}
              onChange={e => setMinFacilityLimit(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('fields.maxFacilityLimit')}
            </label>
            <input
              type="number"
              value={maxFacilityLimit}
              onChange={e => setMaxFacilityLimit(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('fields.conditionExpression')}
          </label>
          <textarea
            rows={2}
            value={conditionExpression}
            onChange={e => setConditionExpression(e.target.value)}
            className={inputClass + ' font-mono'}
          />
          <p className="mt-1 text-xs text-gray-400">{t('hints.conditionExpression')}</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary/20"
          />
          {t('fields.isActive')}
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('common:actions.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="button" onClick={handleSave} isLoading={isSaving}>
            {t('common:actions.save', { defaultValue: 'Save' })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

const AutoAssignmentRulesPage = () => {
  const { t } = useTranslation('autoAssignmentRules');
  const [editing, setEditing] = useState<AutoAssignmentRuleDto | null>(null);
  const [toDelete, setToDelete] = useState<AutoAssignmentRuleDto | null>(null);
  const modal = useDisclosure();

  const { data: rules = [], isLoading } = useListAutoAssignmentRules();
  const createRule = useCreateAutoAssignmentRule();
  const updateRule = useUpdateAutoAssignmentRule();
  const deleteRule = useDeleteAutoAssignmentRule();

  const activeCount = rules.filter(r => r.isActive).length;

  const decisionLabel = (value: string) =>
    ROUTING_DECISIONS.find(d => d.value === value)?.label ?? value;

  const conditionSummary = (r: AutoAssignmentRuleDto) => {
    const parts: string[] = [];
    if (r.channels) parts.push(`${t('fields.channels')}: ${r.channels}`);
    if (r.entrySources) parts.push(`${t('fields.entrySources')}: ${r.entrySources}`);
    if (r.loanTypes) parts.push(`${t('fields.loanTypes')}: ${r.loanTypes}`);
    if (r.priorities) parts.push(`${t('fields.priorities')}: ${r.priorities}`);
    if (r.minFacilityLimit != null || r.maxFacilityLimit != null) {
      parts.push(
        `${t('fields.facility')}: ${r.minFacilityLimit ?? '−∞'} … ${r.maxFacilityLimit ?? '∞'}`,
      );
    }
    if (r.conditionExpression) parts.push(r.conditionExpression);
    return parts.length ? parts.join(' · ') : t('table.matchesEverything');
  };

  const handleAdd = () => {
    setEditing(null);
    modal.onOpen();
  };

  const handleEdit = (row: AutoAssignmentRuleDto) => {
    setEditing(row);
    modal.onOpen();
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteRule.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(t('toasts.deleted'));
        setToDelete(null);
      },
      onError: () => toast.error(t('toasts.deleteFailed')),
    });
  };

  const handleSave = (body: SaveAutoAssignmentRuleBody, id?: string) => {
    const onSuccess = () => {
      toast.success(id ? t('toasts.updated') : t('toasts.created'));
      modal.onClose();
    };
    // The backend compile-checks the condition expression, so surface its message verbatim.
    const onError = (err: unknown) => {
      const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
      toast.error(detail || t('toasts.saveFailed'));
    };
    if (id) updateRule.mutate({ id, body }, { onSuccess, onError });
    else createRule.mutate(body, { onSuccess, onError });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{t('page.subtitle')}</p>
        </div>
        <Button size="sm" type="button" onClick={handleAdd}>
          <Icon name="plus" style="solid" className="mr-1.5 size-3.5" />
          {t('actions.addRule')}
        </Button>
      </div>

      {/* Deactivating every rule is a supported state — say so rather than looking broken. */}
      {!isLoading && activeCount === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {t('page.noActiveRules')}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : rules.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">{t('page.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  t('table.priority'),
                  t('table.rule'),
                  t('table.conditions'),
                  t('table.routesTo'),
                  t('table.status'),
                  '',
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left text-xs font-medium uppercase text-gray-500 last:w-20"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rules.map(row => (
                <tr key={row.id} className={row.isActive ? 'hover:bg-gray-50' : 'bg-gray-50/60'}>
                  <td className="px-4 py-3 font-mono text-gray-500">{row.priority}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.ruleName}</td>
                  <td className="max-w-md px-4 py-3 text-xs text-gray-500">
                    {conditionSummary(row)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{decisionLabel(row.routingDecision)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.isActive ? t('status.active') : t('status.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        aria-label={t('actions.edit')}
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(row)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        aria-label={t('actions.delete')}
                      >
                        <Icon name="trash" style="solid" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RuleModal
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        editing={editing}
        onSave={handleSave}
        isSaving={createRule.isPending || updateRule.isPending}
      />

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={deleteRule.isPending}
        variant="danger"
        title={t('confirm.deleteTitle')}
        confirmText={t('actions.delete')}
        message={toDelete ? t('confirm.deleteMessage', { name: toDelete.ruleName }) : ''}
      />
    </div>
  );
};

export default AutoAssignmentRulesPage;
