import { useState } from 'react';
import { Icon } from '@/shared/components';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';

interface RemarkSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  readOnly?: boolean;
}

export function RemarkSection({ setValue, watch, readOnly }: RemarkSectionProps) {
  const remark = watch('remark') ?? '';
  const hasContent = remark.trim().length > 0;
  const [expanded, setExpanded] = useState(hasContent);

  return (
    <div className="rounded-lg border border-(--palette-line) overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-(--palette-surface-2) hover:bg-(--palette-surface-3) transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon name="note-sticky" className="size-3.5 text-(--palette-gray-500)" />
          <span className="text-xs font-semibold text-(--palette-ink)">Notes & Assumptions</span>
          {hasContent && !expanded && (
            <span className="text-[10px] text-(--palette-gray-400) truncate max-w-[200px]">
              — {remark.slice(0, 50)}
              {remark.length > 50 ? '...' : ''}
            </span>
          )}
        </div>
        <Icon
          name="chevron-down"
          className={`size-3 text-(--palette-gray-400) transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-(--palette-line-soft)">
          <textarea
            value={remark}
            onChange={e => setValue('remark', e.target.value || null, { shouldDirty: true })}
            placeholder="Document your assumptions, rationale for growth rates, discount rate justification, or any adjustments made..."
            className="w-full text-xs text-(--palette-ink) bg-transparent border border-(--palette-line) rounded-md px-3 py-2 resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 placeholder:text-(--palette-gray-400) disabled:bg-(--palette-surface-2) disabled:text-(--palette-gray-500) disabled:cursor-not-allowed"
            rows={3}
            disabled={readOnly}
          />
        </div>
      )}
    </div>
  );
}
