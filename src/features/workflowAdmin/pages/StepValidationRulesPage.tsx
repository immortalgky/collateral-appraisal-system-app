import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { PROPERTY_TYPES } from '@features/appraisal/components/PropertyTypeDropdown';
import {
  useGetStepCatalog,
  useGetProcessConfig,
  useSaveProcessConfig,
  useValidateProcessConfig,
  useGetValidationFields,
  useGetPropertyValidationFields,
  type ProcessConfigRow,
  type StepCatalogItem,
  type ValidationField,
} from '../api/workflowAdmin';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

/** Try to parse a JSON Schema string and return required + property names */
function parseSchemaShape(
  schemaStr: string | null,
): { type: 'unknown' } | { type: 'validateAppraisalFields' } | { type: 'validatePropertyMandatoryFields' } | { type: 'freeform' } {
  if (!schemaStr) return { type: 'unknown' };
  try {
    const schema = JSON.parse(schemaStr) as { properties?: Record<string, unknown> };
    const props = schema.properties ?? {};
    if ('rules' in props) return { type: 'validateAppraisalFields' };
    if ('requiredByType' in props) return { type: 'validatePropertyMandatoryFields' };
    return { type: 'freeform' };
  } catch {
    return { type: 'unknown' };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-forms for well-known parameter shapes
// ──────────────────────────────────────────────────────────────────────────────

interface AppraisalFieldRule {
  fieldKey?: string;
  op?: string;
  value?: string;
  expression?: string;
  message: string;
}

interface ValidateAppraisalFieldsParams {
  rules: AppraisalFieldRule[];
}

function ValidateAppraisalFieldsForm({
  value,
  onChange,
  fields,
}: {
  value: string | null;
  onChange: (v: string) => void;
  fields: ValidationField[];
}) {
  let parsed: ValidateAppraisalFieldsParams = { rules: [] };
  try {
    if (value) parsed = JSON.parse(value) as ValidateAppraisalFieldsParams;
  } catch {
    /* ignore */
  }

  const rules = parsed.rules ?? [];

  const updateRules = (updated: AppraisalFieldRule[]) => {
    onChange(JSON.stringify({ rules: updated }));
  };

  const addRule = () => {
    updateRules([...rules, { fieldKey: '', op: 'Required', value: '', message: '' }]);
  };

  const removeRule = (idx: number) => {
    updateRules(rules.filter((_, i) => i !== idx));
  };

  const updateRule = (idx: number, patch: Partial<AppraisalFieldRule>) => {
    updateRules(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-600">Field Rules</p>
        <button
          type="button"
          onClick={addRule}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Icon name="plus" style="solid" className="size-3" />
          Add rule
        </button>
      </div>
      {rules.length === 0 && (
        <p className="text-xs text-gray-400 italic">No rules defined</p>
      )}
      {rules.map((rule, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Rule #{idx + 1}</span>
            <button
              type="button"
              onClick={() => removeRule(idx)}
              className="text-gray-400 hover:text-red-500"
            >
              <Icon name="trash" style="solid" className="size-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Field</label>
              <select
                value={rule.fieldKey ?? ''}
                onChange={e => updateRule(idx, { fieldKey: e.target.value })}
                className={inputClass}
              >
                <option value="">— use expression —</option>
                {fields.map(f => (
                  <option key={f.key} value={f.key}>
                    {f.displayName} ({f.key})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Operator</label>
              <select
                value={rule.op ?? ''}
                onChange={e => updateRule(idx, { op: e.target.value })}
                className={inputClass}
              >
                <option value="Required">required</option>
                <option value="Equals">equals</option>
                <option value="NotEquals">not equals</option>
                <option value="GreaterThan">greater than</option>
                <option value="GreaterOrEqual">greater or equal</option>
                <option value="LessThan">less than</option>
                <option value="LessOrEqual">less or equal</option>
              </select>
            </div>
          </div>
          {!rule.fieldKey && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Expression</label>
              <input
                type="text"
                value={rule.expression ?? ''}
                onChange={e => updateRule(idx, { expression: e.target.value })}
                className={inputClass}
                placeholder="e.g. appraisal.LandArea > 0"
              />
            </div>
          )}
          {rule.op !== 'Required' && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Value</label>
              <input
                type="text"
                value={rule.value ?? ''}
                onChange={e => updateRule(idx, { value: e.target.value })}
                className={inputClass}
                placeholder="Expected value"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Message</label>
            <input
              type="text"
              value={rule.message}
              onChange={e => updateRule(idx, { message: e.target.value })}
              className={inputClass}
              placeholder="Shown when rule fails"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface RequiredByTypeParams {
  requiredByType: Record<string, string[]>;
}

function ValidatePropertyMandatoryFieldsForm({
  value,
  onChange,
  propertyFields,
}: {
  value: string | null;
  onChange: (v: string) => void;
  propertyFields: ValidationField[];
}) {
  let parsed: RequiredByTypeParams = { requiredByType: {} };
  try {
    if (value) parsed = JSON.parse(value) as RequiredByTypeParams;
  } catch {
    /* ignore */
  }

  const rbt = parsed.requiredByType ?? {};
  const typeCodes = Object.keys(rbt);

  const update = (updated: Record<string, string[]>) => {
    onChange(JSON.stringify({ requiredByType: updated }));
  };

  const addType = (code: string) => {
    if (!code || code in rbt) return;
    update({ ...rbt, [code]: [] });
  };

  const removeType = (code: string) => {
    const next = { ...rbt };
    delete next[code];
    update(next);
  };

  const toggleField = (typeCode: string, fieldKey: string) => {
    const existing = rbt[typeCode] ?? [];
    const next = existing.includes(fieldKey)
      ? existing.filter(k => k !== fieldKey)
      : [...existing, fieldKey];
    update({ ...rbt, [typeCode]: next });
  };

  const availableTypes = PROPERTY_TYPES.filter(pt => !(pt.code in rbt));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-600">Required Fields by Property Type</p>
      </div>
      {availableTypes.length > 0 && (
        <select
          value=""
          onChange={e => addType(e.target.value)}
          className={inputClass}
        >
          <option value="">— add a property type —</option>
          {availableTypes.map(pt => (
            <option key={pt.code} value={pt.code}>
              {pt.type} ({pt.code})
            </option>
          ))}
        </select>
      )}
      {typeCodes.length === 0 && (
        <p className="text-xs text-gray-400 italic">No types defined</p>
      )}
      {typeCodes.map(typeCode => (
        <div key={typeCode} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700 font-mono">{typeCode}</span>
            <button
              type="button"
              onClick={() => removeType(typeCode)}
              className="text-gray-400 hover:text-red-500"
            >
              <Icon name="trash" style="solid" className="size-3" />
            </button>
          </div>
          {propertyFields.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No property fields available — apply the property validation view.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {propertyFields.map(f => (
                <label key={f.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(rbt[typeCode] ?? []).includes(f.key)}
                    onChange={() => toggleField(typeCode, f.key)}
                    className="h-3 w-3 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-gray-700">{f.displayName}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Step edit modal
// ──────────────────────────────────────────────────────────────────────────────

interface StepModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: ProcessConfigRow | null;
  catalog: StepCatalogItem[];
  /** Appraisal-level fields for ValidateAppraisalFieldsForm */
  fields: ValidationField[];
  /** Per-property fields for ValidatePropertyMandatoryFieldsForm */
  propertyFields: ValidationField[];
  onSave: (row: ProcessConfigRow) => void;
}

function StepModal({ isOpen, onClose, editing, catalog, fields, propertyFields, onSave }: StepModalProps) {
  const [processorName, setProcessorName] = useState(editing?.processorName ?? '');
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 0));
  const [parametersJson, setParametersJson] = useState(editing?.parametersJson ?? '');
  const [runIfExpression, setRunIfExpression] = useState(editing?.runIfExpression ?? '');
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  const [exampleOpen, setExampleOpen] = useState(false);

  // Reset when editing prop changes (same modal reused for different rows)
  useEffect(() => {
    setProcessorName(editing?.processorName ?? '');
    setSortOrder(String(editing?.sortOrder ?? 0));
    setParametersJson(editing?.parametersJson ?? '');
    setRunIfExpression(editing?.runIfExpression ?? '');
    setIsActive(editing?.isActive ?? true);
    setExampleOpen(false);
  }, [editing]);

  const selectedCatalogItem = catalog.find(c => c.name === processorName) ?? null;
  const schemaShape = parseSchemaShape(selectedCatalogItem?.parametersSchema ?? null);
  const exampleJson = selectedCatalogItem?.exampleParametersJson ?? null;

  /** Pretty-print the example JSON, falling back to the raw string on parse error */
  const prettyExample = exampleJson
    ? (() => {
        try {
          return JSON.stringify(JSON.parse(exampleJson), null, 2);
        } catch {
          return exampleJson;
        }
      })()
    : null;

  const handleInsertExample = () => {
    if (!prettyExample) return;
    if (parametersJson && !confirm('Replace current parameters with the example?')) return;
    setParametersJson(prettyExample);
  };

  const handleSave = () => {
    const row: ProcessConfigRow = {
      processorName,
      sortOrder: parseInt(sortOrder, 10) || 0,
      parametersJson: parametersJson || null,
      runIfExpression: runIfExpression || null,
      isActive,
    };
    onSave(row);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Edit Validation Step' : 'Add Validation Step'}
      size="lg"
    >
      <div className="space-y-4">
        {/* Processor picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Step <span className="text-red-500">*</span>
          </label>
          <select
            value={processorName}
            onChange={e => {
              setProcessorName(e.target.value);
              setParametersJson('');
              setExampleOpen(false);
            }}
            className={inputClass}
          >
            <option value="">— select a step —</option>
            {catalog.map(c => (
              <option key={c.name} value={c.name}>
                {c.displayName} ({c.kind})
              </option>
            ))}
          </select>
          {selectedCatalogItem?.description && (
            <p className="mt-1 text-xs text-gray-500">{selectedCatalogItem.description}</p>
          )}
          {/* Collapsible example — shown for all step shapes when exampleParametersJson exists */}
          {prettyExample && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setExampleOpen(o => !o)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <Icon
                  name={exampleOpen ? 'chevron-down' : 'chevron-right'}
                  style="solid"
                  className="size-3"
                />
                Example
              </button>
              {exampleOpen && (
                <pre className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                  {prettyExample}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Sort order */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              Active
            </label>
          </div>
        </div>

        {/* Parameters — rendered from schema shape */}
        {processorName && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Parameters</label>
              {/* "Insert example" only shown for freeform textarea when example exists */}
              {prettyExample &&
                (schemaShape.type === 'freeform' || schemaShape.type === 'unknown') && (
                  <button
                    type="button"
                    onClick={handleInsertExample}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Insert example
                  </button>
                )}
            </div>
            {schemaShape.type === 'validateAppraisalFields' ? (
              <ValidateAppraisalFieldsForm
                value={parametersJson}
                onChange={setParametersJson}
                fields={fields}
              />
            ) : schemaShape.type === 'validatePropertyMandatoryFields' ? (
              <ValidatePropertyMandatoryFieldsForm
                value={parametersJson}
                onChange={setParametersJson}
                propertyFields={propertyFields}
              />
            ) : (
              <textarea
                value={parametersJson}
                onChange={e => setParametersJson(e.target.value)}
                className={`${inputClass} h-28 font-mono text-xs`}
                placeholder={prettyExample ?? '{"key": "value"}'}
              />
            )}
          </div>
        )}

        {/* runIfExpression */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Run-If Expression{' '}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={runIfExpression}
            onChange={e => setRunIfExpression(e.target.value)}
            className={inputClass}
            placeholder='e.g. appraisal.CollateralType == "LND"'
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!processorName}>
            {editing ? 'Update Step' : 'Add Step'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────

const StepValidationRulesPage = () => {
  const [activityName, setActivityName] = useState('');
  const [rows, setRows] = useState<ProcessConfigRow[]>([]);
  const [editingRow, setEditingRow] = useState<{ row: ProcessConfigRow; idx: number } | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    { index: number; stepName: string; message: string }[]
  >([]);
  const stepModal = useDisclosure();

  const { data: catalog = [], isLoading: catalogLoading } = useGetStepCatalog();
  const { data: validationFields = [] } = useGetValidationFields();
  const { data: propertyValidationFields = [] } = useGetPropertyValidationFields();
  const { data: savedConfig, isLoading: configLoading } = useGetProcessConfig(
    activityName || undefined,
  );
  const saveConfig = useSaveProcessConfig(activityName);
  const validateConfig = useValidateProcessConfig(activityName);

  // Sync rows from server whenever the activity or saved config changes
  useEffect(() => {
    if (savedConfig) {
      setRows([...savedConfig].sort((a, b) => a.sortOrder - b.sortOrder));
    } else if (activityName) {
      setRows([]);
    }
  }, [savedConfig, activityName]);

  const handleAddStep = () => {
    setEditingRow(null);
    stepModal.onOpen();
  };

  const handleEditRow = (row: ProcessConfigRow, idx: number) => {
    setEditingRow({ row, idx });
    stepModal.onOpen();
  };

  const handleDeleteRow = (idx: number) => {
    if (!confirm('Remove this step?')) return;
    setRows(prev => prev.filter((_, i) => i !== idx));
    setValidationErrors([]);
  };

  const handleMoveRow = (idx: number, direction: 'up' | 'down') => {
    setRows(prev => {
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      // Re-assign sortOrder to match new positions
      return next.map((r, i) => ({ ...r, sortOrder: i + 1 }));
    });
    setValidationErrors([]);
  };

  const handleModalSave = (row: ProcessConfigRow) => {
    if (editingRow !== null) {
      setRows(prev => prev.map((r, i) => (i === editingRow.idx ? row : r)));
    } else {
      setRows(prev => [...prev, { ...row, sortOrder: prev.length + 1 }]);
    }
    setValidationErrors([]);
    stepModal.onClose();
  };

  const handleValidate = () => {
    setValidationErrors([]);
    validateConfig.mutate(rows, {
      onSuccess: result => {
        if (result.valid) {
          toast.success('Configuration is valid');
        } else {
          setValidationErrors(result.errors ?? []);
          toast.error(`Validation failed: ${result.errors?.length ?? 0} error(s)`);
        }
      },
      onError: (err: unknown) => {
        const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
        toast.error(detail || 'Validation request failed');
      },
    });
  };

  const handleSave = () => {
    if (!activityName) return;
    saveConfig.mutate(rows, {
      onSuccess: () => toast.success('Configuration saved'),
      onError: (err: unknown) => {
        const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
        toast.error(detail || 'Save failed');
      },
    });
  };

  const getCatalogLabel = (name: string) => {
    const item = catalog.find(c => c.name === name);
    return item?.displayName ?? name;
  };

  const getCatalogKind = (name: string) => {
    const item = catalog.find(c => c.name === name);
    return item?.kind ?? '';
  };

  // Validation error index map for quick row lookup
  const errorsByIndex = new Map(validationErrors.map(e => [e.index, e]));

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Step Validation Rules</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure which validation steps run when completing each workflow activity.
        </p>
      </div>

      {/* Activity picker */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Activity Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={activityName}
          onChange={e => {
            setActivityName(e.target.value);
            setValidationErrors([]);
          }}
          className={inputClass}
          placeholder="e.g. ext-appraisal-assignment"
        />
        <p className="mt-1 text-xs text-gray-400">
          Enter the exact workflow activity name from the workflow definition.
        </p>
      </div>

      {/* Step list */}
      {activityName && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Validation steps
              {configLoading && (
                <Icon name="spinner" style="solid" className="ml-2 size-3.5 animate-spin text-gray-400 inline-block" />
              )}
            </span>
            <Button size="sm" type="button" onClick={handleAddStep} disabled={catalogLoading}>
              <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
              Add step
            </Button>
          </div>

          {rows.length === 0 && !configLoading ? (
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-400 italic">
              No validation steps configured for this activity.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-8 px-2 py-2.5" />
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Order
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Step
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Kind
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Run-If
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="w-24 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row, idx) => {
                    const rowError = errorsByIndex.get(idx);
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-gray-50 ${rowError ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-2 py-3">
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveRow(idx, 'up')}
                              className="text-gray-300 hover:text-gray-500 disabled:opacity-0"
                            >
                              <Icon name="chevron-up" style="solid" className="size-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === rows.length - 1}
                              onClick={() => handleMoveRow(idx, 'down')}
                              className="text-gray-300 hover:text-gray-500 disabled:opacity-0"
                            >
                              <Icon name="chevron-down" style="solid" className="size-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 tabular-nums">{row.sortOrder}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {getCatalogLabel(row.processorName)}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{row.processorName}</p>
                            {rowError && (
                              <p className="mt-0.5 text-xs text-red-600">{rowError.message}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {getCatalogKind(row.processorName)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs max-w-xs truncate">
                          {row.runIfExpression ?? <span className="italic text-gray-300">always</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditRow(row, idx)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              aria-label={`Edit ${row.processorName}`}
                            >
                              <Icon name="pen" style="solid" className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(idx)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              aria-label={`Delete ${row.processorName}`}
                            >
                              <Icon name="trash" style="solid" className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleValidate}
              disabled={validateConfig.isPending || rows.length === 0}
            >
              {validateConfig.isPending ? (
                <>
                  <Icon name="spinner" style="solid" className="size-3.5 mr-1.5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Icon name="check" style="solid" className="size-3.5 mr-1.5" />
                  Validate
                </>
              )}
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={handleSave}
              disabled={saveConfig.isPending}
            >
              {saveConfig.isPending ? (
                <>
                  <Icon name="spinner" style="solid" className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>

          {/* Validation errors summary */}
          {validationErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
              <p className="text-xs font-medium text-red-700">Validation errors:</p>
              {validationErrors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">
                  Row {e.index + 1} ({e.stepName}): {e.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step edit modal */}
      <StepModal
        isOpen={stepModal.isOpen}
        onClose={stepModal.onClose}
        editing={editingRow?.row ?? null}
        catalog={catalog}
        fields={validationFields}
        propertyFields={propertyValidationFields}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default StepValidationRulesPage;
