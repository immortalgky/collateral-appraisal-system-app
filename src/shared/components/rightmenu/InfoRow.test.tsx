import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import InfoRow from './InfoRow';

const valueOf = (text: string) => screen.getByText(text);

describe('InfoRow value', () => {
  it('cuts a code with an ellipsis and keeps the full text in the tooltip', () => {
    render(<InfoRow icon="circle" label="Activity" value="IntAppraisalExecution" />);
    expect(valueOf('IntAppraisalExecution')).toHaveClass('truncate');
    expect(valueOf('IntAppraisalExecution')).toHaveAttribute('title', 'IntAppraisalExecution');
  });

  it('wraps Thai text, which has no spaces between words, instead of cutting it', () => {
    render(<InfoRow icon="circle" label="Activity" value="ตรวจสอบความถูกต้องของรายงาน" />);
    expect(valueOf('ตรวจสอบความถูกต้องของรายงาน')).not.toHaveClass('truncate');
    expect(valueOf('ตรวจสอบความถูกต้องของรายงาน')).toHaveClass('line-clamp-5');
  });
});
