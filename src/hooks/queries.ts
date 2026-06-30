import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Subscriber, Invoice, Payment } from '../api/types';

export function useSubscribers(params: { q?: string; status?: string; take?: number; skip?: number }) {
  return useQuery({
    queryKey: ['subscribers', params],
    queryFn: async () => {
      const { data } = await api.get<{ items: Subscriber[]; total: number }>('/subscribers', { params });
      return data;
    },
  });
}

export function useSubscriber(id: string | undefined) {
  return useQuery({
    queryKey: ['subscriber', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<Subscriber & { invoices: Invoice[]; payments: Payment[] }>(
        `/subscribers/${id}`
      );
      return data;
    },
  });
}

export function useCreateSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/subscribers', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscribers'] }),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      subscriberId: string;
      amountCents: number;
      method: string;
      reference?: string;
      invoiceId?: string;
    }) => {
      const { data } = await api.post('/billing/payments', payload);
      return data as { receiptNo: string; balanceCents: number; restored: boolean };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['subscribers'] });
      qc.invalidateQueries({ queryKey: ['subscriber', vars.subscriberId] });
    },
  });
}

// Owner stats are derived client-side from the subscriber list for now.
// Swap for a dedicated /stats endpoint when the backend grows one.
export function useOwnerStats() {
  return useQuery({
    queryKey: ['owner-stats'],
    queryFn: async () => {
      const { data } = await api.get<{ items: Subscriber[]; total: number }>('/subscribers', {
        params: { take: 200 },
      });
      const items = data.items;
      const active = items.filter((s) => s.status === 'ACTIVE').length;
      const suspended = items.filter((s) => s.status === 'SUSPENDED').length;
      const pending = items.filter((s) => s.status === 'PENDING_INSTALLATION').length;
      const outstanding = items.reduce((sum, s) => sum + Math.max(0, s.balanceCents), 0);
      const monthlyRevenue = items
        .filter((s) => s.status === 'ACTIVE')
        .reduce((sum, s) => sum + (s.servicePlan?.priceCents || 0), 0);
      return { total: data.total, active, suspended, pending, outstanding, monthlyRevenue, items };
    },
  });
}
