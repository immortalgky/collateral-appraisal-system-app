import { Icon, Toggle } from '@/shared/components';
import clsx from 'clsx';
import { set } from 'date-fns';
import { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { PriceAnalysisAccordion } from './PriceAnalysisAccordion';

interface PriceAnalysisTabProps {
  groupId: string;
}

export function PriceAnalysisTab({ groupId }: PriceAnalysisTabProps): JSX.Element {
  return (
    <div>
      <PriceAnalysisAccordion data={groupId} />
    </div>
  );
}
