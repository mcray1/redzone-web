import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Subscriber, Invoice, Payment, ServicePlan, StaffUser, Ticket, CollectorToday } from '../api/types';

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

// --- Service plans ---

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await api.get<ServicePlan[]>('/plans');
      return data;
    },
  });
}

export function useSavePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Partial<ServicePlan> & { id?: string }) => {
      if (plan.id) {
        const body = { ...plan };
        delete body.id;
        const { data } = await api.put(`/plans/${plan.id}`, body);
        return data;
      }
      const { data } = await api.post('/plans', plan);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/plans/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
}

// --- Staff / users ---

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get<StaffUser[]>('/users')).data,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { name: string; email: string; password: string; role: string }) =>
      (await api.post('/users', p)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useSetStaffActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; active: boolean }) =>
      (await api.patch(`/users/${p.id}/active`, { active: p.active })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

// --- Collector ---
export function useCollectorToday() {
  return useQuery({
    queryKey: ['collector-today'],
    queryFn: async () => (await api.get<CollectorToday>('/collector/today')).data,
  });
}

// --- Tickets ---
export function useTickets(status?: string) {
  return useQuery({
    queryKey: ['tickets', status],
    queryFn: async () =>
      (await api.get<Ticket[]>('/tickets', { params: status ? { status } : {} })).data,
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Ticket>(`/tickets/${id}`)).data,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { subject: string; body: string; priority?: string }) =>
      (await api.post('/tickets', p)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useReplyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; body: string }) =>
      (await api.post(`/tickets/${p.id}/reply`, { body: p.body })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['ticket', v.id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status?: string; priority?: string }) => {
      const { id, ...body } = p;
      return (await api.patch(`/tickets/${id}`, body)).data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['ticket', v.id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}
