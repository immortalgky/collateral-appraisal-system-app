import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { useAuthStore } from '@/features/auth/store';
import { useCompleteActivity } from '../../api/workflow';
import { decisionSummaryKeys } from '../../api/decisionSummary';

const VOTE_OPTIONS = [
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'route_back', label: 'Route Back' },
] as const;

type VoteValue = (typeof VOTE_OPTIONS)[number]['value'];

interface VoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workflowInstanceId: string;
  activityId: string;
}

const VoteDialog = ({ isOpen, onClose, workflowInstanceId, activityId }: VoteDialogProps) => {
  const [selectedVote, setSelectedVote] = useState<VoteValue | null>(null);
  const [comments, setComments] = useState('');
  const completeActivity = useCompleteActivity();
  const isPending = completeActivity.isPending;
  const username = useAuthStore(s => s.user?.username);
  const queryClient = useQueryClient();

  const handleSubmit = () => {
    if (!selectedVote || !username) return;

    completeActivity.mutate(
      {
        workflowInstanceId,
        activityId,
        input: {
          completedBy: username,
          decisionTaken: selectedVote,
          comments: comments || undefined,
        },
      },
      {
        onSuccess: result => {
          if (result.status === 'ValidationFailed' || result.status === 'Failed') {
            const errors = result.validationErrors ?? [];
            if (errors.length > 0) {
              errors.forEach(err => toast.error(err));
            } else {
              toast.error('Failed to submit vote');
            }
            return;
          }

          toast.success(result.isCompleted ? 'Committee decision recorded' : 'Vote recorded');
          // Refresh the approval list so members[]/conditions[] reflect the new vote.
          queryClient.invalidateQueries({
            queryKey: decisionSummaryKeys.approvalList(workflowInstanceId, activityId),
          });
          setSelectedVote(null);
          setComments('');
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to submit vote');
        },
      },
    );
  };

  const handleClose = () => {
    if (!isPending) {
      setSelectedVote(null);
      setComments('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit Your Vote" size="sm">
      <div className="space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-3">Vote</legend>
          <div className="space-y-2">
            {VOTE_OPTIONS.map(option => (
              <label
                key={option.value}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
              >
                <input
                  type="radio"
                  name="vote"
                  value={option.value}
                  checked={selectedVote === option.value}
                  onChange={() => setSelectedVote(option.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="vote-comments" className="block text-sm font-medium text-gray-700 mb-1">
            Comments (optional)
          </label>
          <textarea
            id="vote-comments"
            rows={3}
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Add a comment..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!selectedVote || isPending}>
            {isPending ? 'Submitting...' : 'Submit Vote'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VoteDialog;
