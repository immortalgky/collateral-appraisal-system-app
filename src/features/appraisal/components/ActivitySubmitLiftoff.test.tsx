import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ActivitySubmitLiftoff, { type ActivitySubmitLiftoffProps } from './ActivitySubmitLiftoff';

const renderCard = (props: Partial<ActivitySubmitLiftoffProps>) =>
  render(
    <ActivitySubmitLiftoff
      origin={null}
      scene="forward"
      voteOutcome={null}
      nextActivityName="Appraisal check"
      nextAssigneeName="Damrong Ekachai"
      referenceNumber={null}
      onDone={vi.fn()}
      {...props}
    />,
  );

describe('ActivitySubmitLiftoff hand-off row', () => {
  it('shows the user code beside the name', () => {
    renderCard({ nextAssigneeCode: 'int.staff1' });

    expect(screen.getByText('Damrong Ekachai')).toHaveAttribute(
      'title',
      'Damrong Ekachai (int.staff1)',
    );
    expect(screen.getByText('int.staff1')).toHaveClass('liftoff-code');
  });

  it('hides the code when it only repeats the name, ignoring case and spaces', () => {
    renderCard({ nextAssigneeName: 'Int.Staff1', nextAssigneeCode: ' int.staff1 ' });

    expect(screen.getAllByText(/int\.staff1/i)).toHaveLength(1);
    expect(document.querySelector('.liftoff-code')).toBeNull();
  });

  it('shows no code when the server sent none', () => {
    renderCard({ nextAssigneeCode: null });
    expect(document.querySelector('.liftoff-code')).toBeNull();
  });

  it('shows no code on a step-only row', () => {
    renderCard({ nextAssigneeName: null, nextAssigneeCode: 'int.staff1' });

    expect(screen.queryByText('int.staff1')).toBeNull();
  });
});
