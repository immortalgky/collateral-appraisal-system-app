import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { transitionFormSchema, type TransitionFormValues } from '../../schemas';

interface TransitionFormProps {
  edgeId: string;
}

function getEdgeType(data: Record<string, unknown> | undefined): 'Normal' | 'Conditional' {
  if (!data) return 'Normal';
  const t = (data.type as string) ?? (data.Type as string) ?? 'Normal';
  if (t === 'Conditional') return 'Conditional';
  return 'Normal';
}

function getEdgeCondition(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  return (data.condition as string) ?? (data.Condition as string) ?? null;
}

export function TransitionForm({ edgeId }: TransitionFormProps) {
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateTransition = useWorkflowStore((s) => s.updateTransition);

  const edge = edges.find((e) => e.id === edgeId);
  const [isRawMode, setIsRawMode] = useState(false);

  const edgeData = edge?.data as Record<string, unknown> | undefined;
  const sourceNode = edge ? nodes.find((n) => n.id === edge.source) : null;
  const targetNode = edge ? nodes.find((n) => n.id === edge.target) : null;

  const initialType = getEdgeType(edgeData);
  const initialCondition = getEdgeCondition(edgeData);

  const { register, handleSubmit, reset, watch, setValue } =
    useForm<TransitionFormValues>({
      resolver: zodResolver(transitionFormSchema),
      defaultValues: {
        type: initialType,
        condition: initialCondition,
      },
    });

  const watchType = watch('type');

  // Reset form when edge changes
  useEffect(() => {
    const data = edge?.data as Record<string, unknown> | undefined;
    reset({
      type: getEdgeType(data),
      condition: getEdgeCondition(data),
    });
  }, [edgeId]);

  const onSubmit = (values: TransitionFormValues) => {
    updateTransition(edgeId, {
      condition: values.type === 'Normal' ? null : values.condition,
      type: values.type,
    });
  };

  if (!edge) return null;

  const sourceName = sourceNode?.data
    ? (sourceNode.data as Record<string, unknown>).name as string
    : edge.source;
  const targetName = targetNode?.data
    ? (targetNode.data as Record<string, unknown>).name as string
    : edge.target;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Connection info */}
      <div className="rounded-lg bg-base-200 p-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium">From:</span>
          <span className="badge badge-sm">{sourceName}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-medium">To:</span>
          <span className="badge badge-sm">{targetName}</span>
        </div>
      </div>

      {/* Type */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Transition Type</span>
        </label>
        <select
          value={watchType}
          className="select select-bordered select-sm w-full"
          onChange={(e) => {
            const val = e.target.value as 'Normal' | 'Conditional';
            setValue('type', val);
            if (val === 'Normal') {
              setValue('condition', null);
            }
            handleSubmit(onSubmit)();
          }}
        >
          <option value="Normal">Normal (unconditional)</option>
          <option value="Conditional">Conditional</option>
        </select>
      </div>

      {/* Condition */}
      {watchType === 'Conditional' && (
        <div className="form-control">
          <div className="flex items-center justify-between">
            <label className="label">
              <span className="label-text text-xs font-medium">Condition</span>
            </label>
            <button
              type="button"
              onClick={() => setIsRawMode(!isRawMode)}
              className="btn btn-ghost btn-xs"
            >
              {isRawMode ? 'Builder' : 'Raw'}
            </button>
          </div>

          {isRawMode ? (
            <textarea
              {...register('condition')}
              className="textarea textarea-bordered textarea-sm w-full font-mono text-xs"
              rows={3}
              placeholder="decision == 'proceed'"
              onBlur={handleSubmit(onSubmit)}
            />
          ) : (
            <ConditionBuilder
              value={watch('condition') ?? ''}
              onChange={(val) => {
                setValue('condition', val);
                handleSubmit(onSubmit)();
              }}
            />
          )}
        </div>
      )}
    </form>
  );
}

interface ConditionBuilderProps {
  value: string;
  onChange: (value: string) => void;
}

function ConditionBuilder({ value, onChange }: ConditionBuilderProps) {
  const parsed = parseCondition(value);

  return (
    <div className="flex gap-2">
      <input
        className="input input-bordered input-xs flex-1"
        placeholder="variable"
        value={parsed.variable}
        onChange={(e) =>
          onChange(buildCondition(e.target.value, parsed.operator, parsed.value))
        }
      />
      <select
        className="select select-bordered select-xs"
        value={parsed.operator}
        onChange={(e) =>
          onChange(buildCondition(parsed.variable, e.target.value, parsed.value))
        }
      >
        <option value="==">=</option>
        <option value="!=">!=</option>
        <option value=">">{'>'}</option>
        <option value="<">{'<'}</option>
        <option value=">=">{'>='}  </option>
        <option value="<=">{'<='}</option>
      </select>
      <input
        className="input input-bordered input-xs flex-1"
        placeholder="value"
        value={parsed.value}
        onChange={(e) =>
          onChange(buildCondition(parsed.variable, parsed.operator, e.target.value))
        }
      />
    </div>
  );
}

function parseCondition(condition: string): {
  variable: string;
  operator: string;
  value: string;
} {
  const match = condition.match(/^(\S+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!match) return { variable: '', operator: '==', value: '' };
  return {
    variable: match[1],
    operator: match[2],
    value: match[3].replace(/^'|'$/g, ''),
  };
}

function buildCondition(variable: string, operator: string, value: string): string {
  if (!variable || !value) return '';
  const needsQuote = isNaN(Number(value));
  const formattedValue = needsQuote ? `'${value}'` : value;
  return `${variable} ${operator} ${formattedValue}`;
}
