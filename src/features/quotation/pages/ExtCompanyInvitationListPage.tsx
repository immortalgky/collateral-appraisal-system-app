import { useNavigate } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { useGetMyCompanyInvitations } from '../api/quotation';
import QuotationStatusBadge from '../components/QuotationStatusBadge';
import { useAuthStore } from '@/features/auth/store';

/**
 * External company invitation list page.
 * Route: /ext/quotations  (gated by RoleProtectedRoute for ['ExtAdmin'])
 */
const ExtCompanyInvitationListPage = () => {
  const navigate = useNavigate();
  const companyId = useAuthStore(state => state.user?.companyId);
  const { data: invitations = [], isLoading } = useGetMyCompanyInvitations(companyId);

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotation Invitations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your company's quotation invitations from banks
        </p>
      </div>

      {invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed border-gray-200">
          <Icon name="inbox" style="regular" className="size-12 text-gray-300" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">No invitations yet</p>
            <p className="text-xs text-gray-500 mt-0.5">
              When a bank invites your company to bid, it will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invited On
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitations.map(invitation => {
                  const isPastDue = new Date(invitation.dueDate) < new Date();
                  return (
                    <tr key={invitation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-purple-600">
                          {invitation.quotationNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {formatDateTime(invitation.requestDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            isPastDue ? 'text-sm text-red-600 font-medium' : 'text-sm text-gray-600'
                          }
                        >
                          {formatDateTime(invitation.dueDate)}
                          {isPastDue && (
                            <span className="ml-1 text-xs text-red-500">(Closed)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <QuotationStatusBadge status={invitation.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {invitation.status !== 'Declined' && (
                          <Button
                            size="sm"
                            variant={invitation.status === 'Sent' && !isPastDue ? 'primary' : 'outline'}
                            onClick={() => navigate(`/ext/quotations/${invitation.id}`)}
                          >
                            {invitation.status === 'Sent' && !isPastDue ? 'Submit Bid' : 'View'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtCompanyInvitationListPage;
