import { useState } from 'react';
import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { useSubmitVote } from '../../api/decisionSummary';

const VOTE_OPTIONS = [
  { value: 'Approve', label: 'Approve' },
  { value: 'Reject', label: 'Reject' },
  { value: 'RouteBack', label: 'Route Back' },
] as const;

interface VoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appraisalId: string;
  reviewId: string;
}

const VoteDialog = ({ isOpen, onClose, appraisalId, reviewId }: VoteDialogProps) => {
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const { mutate: submitVote, isPending } = useSubmitVote();

  const handleSubmit = () => {
    if (!selectedVote) return;

    submitVote(
      {
        appraisalId,
        reviewId,
        body: { vote: selectedVote, remark: remark || null },
      },
      {
        onSuccess: (data) => {
          if (data.isAutoApproved) {
            toast.success('Committee has approved this appraisal');
          } else {
            toast.success('Vote recorded');
          }
          setSelectedVote(null);
          setRemark('');
          onClose();
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || 'Failed to submit vote');
        },
      },
    );
  };

  const handleClose = () => {
    if (!isPending) {
      setSelectedVote(null);
      setRemark('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit Your Vote" size="sm">
      <div className="space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-3">Vote</legend>
          <div className="space-y-2">
            {VOTE_OPTIONS.map((option) => (
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
          <label htmlFor="vote-remark" className="block text-sm font-medium text-gray-700 mb-1">
            Remark (optional)
          </label>
          <textarea
            id="vote-remark"
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
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
