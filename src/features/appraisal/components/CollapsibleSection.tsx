import { useState, type ReactNode } from 'react';
import Icon from '@shared/components/Icon';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * A lightweight outer "topic" disclosure for the Appraisal Book Builder's editor column.
 * Intentionally carries no card chrome of its own (no bg/border/shadow) — the wrapped
 * content (AppendixTab, the Machinery Summary pane) already renders its own card, so this
 * is just a labeled toggle above it, not a nested card.
 */
export const CollapsibleSection = ({ title, defaultOpen = true, children }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center gap-2 text-left group"
      >
        <Icon
          name={isOpen ? 'chevron-down' : 'chevron-right'}
          className="text-gray-400 text-xs transition-transform group-hover:text-gray-600"
        />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-hover:text-gray-700">
          {title}
        </span>
      </button>
      {isOpen && children}
    </div>
  );
};

export default CollapsibleSection;
