import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import axios from '@/shared/api/axiosInstance';
import Icon from '@/shared/components/Icon';
import MarkPaidLayout from '../components/MarkPaidLayout';
import { invoiceKeys, useBulkMarkInvoicesPaid } from '../api/invoice';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';
import type { InvoiceDetail, InvoiceListItem } from '../types/invoice';
import toast from 'react-hot-toast';

interface LocationState {
  invoices?: InvoiceListItem[];
}

const IntBulkPaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('invoice');
  const state = (location.state ?? {}) as LocationState;
  const selected = state.invoices ?? [];

  useBreadcrumb(t('internal.markPaidTitle'));

  // Page reached via direct URL (no state) — bounce back to the list.
  useEffect(() => {
    if (selected.length === 0) navigate('/admin/invoices', { replace: true });
  }, [selected.length, navigate]);

  // Fetch each invoice's detail (including line items + bank info) in parallel.
  const detailQueries = useQueries({
    queries: selected.map(inv => ({
      queryKey: invoiceKeys.detail(inv.id),
      queryFn: async (): Promise<InvoiceDetail> => {
        const { data } = await axios.get<InvoiceDetail>(`/invoices/${inv.id}`);
        return data;
      },
      staleTime: 10_000,
    })),
  });

  const invoices = detailQueries
    .map(q => q.data)
    .filter((d): d is InvoiceDetail => !!d);
  const isLoadingAny = detailQueries.some(q => q.isLoading);

  const { mutate: bulkMarkPaid, isPending } = useBulkMarkInvoicesPaid();

  const handleSubmit = ({
    paymentOrderNo,
    paidDate,
  }: {
    paymentOrderNo: string;
    paidDate: string;
  }) => {
    bulkMarkPaid(
      { invoiceIds: selected.map(i => i.id), paymentOrderNo, paidDate },
      {
        onSuccess: () => {
          toast.success(t('internal.bulkSuccess'));
          navigate('/admin/invoices');
        },
        onError: () => toast.error(t('errors.bulkFailed')),
      },
    );
  };

  if (selected.length === 0) return null;

  if (isLoadingAny && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Icon style="solid" name="spinner" className="size-5 animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <MarkPaidLayout
      invoices={invoices}
      isSubmitting={isPending}
      onCancel={() => navigate('/admin/invoices')}
      onSubmit={handleSubmit}
    />
  );
};

export default IntBulkPaymentPage;
