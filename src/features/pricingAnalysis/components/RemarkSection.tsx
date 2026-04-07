import { useState } from 'react';
import { Icon } from '@/shared/components';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';

interface RemarkSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
}

export function RemarkSection({ setValue, watch }: RemarkSectionProps) {
  const remark = watch('remark') ?? '';
  const hasContent = remark.trim().length > 0;
  const [expanded, setExpanded] = useState(hasContent);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon name="note-sticky" className="size-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Notes & Assumptions</span>
          {hasContent && !expanded && (
            <span className="text-[10px] text-gray-400 truncate max-w-[200px]">
              — {remark.slice(0, 50)}{remark.length > 50 ? '...' : ''}
            </span>
          )}
        </div>
        <Icon
          name="chevron-down"
          className={`size-3 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-gray-100">
          <textarea
            value={remark}
            onChange={(e) => setValue('remark', e.target.value || null, { shouldDirty: true })}
            placeholder="Document your assumptions, rationale for growth rates, discount rate justification, or any adjustments made..."
            className="w-full text-xs text-gray-700 bg-transparent border border-gray-200 rounded-md px-3 py-2 resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 placeholder:text-gray-400"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
