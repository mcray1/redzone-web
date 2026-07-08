import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Subscriber, Invoice, Payment, ServicePlan, StaffUser, Ticket, CollectorToday, Job, StaffSalary, SalaryAdvance, StaffSalaryRow, Remittance, PayrollRun, PayrollRunDetail } from '../api/types';

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
// Dashboard/billing stats — computed in the database via /stats/overview.
// Returns aggregates plus small pre-sorted lists, so no page pulls every subscriber.
export function useOwnerStats() {
  return useQuery({
    queryKey: ['owner-stats'],
    queryFn: async () => {
      const { data } = await api.get<{
        total: number;
        active: number;
        suspended: number;
        pending: number;
        outstanding: number;
        owingCount: number;
        monthlyRevenue: number;
        recent: Array<{ id: string; fullName: string; accountNo: string; status: Subscriber['status'] }>;
        owing: Array<{ id: string; fullName: string; accountNo: string; status: Subscriber['status']; balanceCents: number; dueDay: number }>;
      }>('/stats/overview');
      return data;
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

// --- Customer's own account (replaces the branchId hack) ---
export function useMyAccount() {
  return useQuery({
    queryKey: ['my-account'],
    queryFn: async () => {
      const { data } = await api.get<Subscriber & { payments: Payment[] }>('/subscribers/me/account');
      return data;
    },
  });
}

// --- Customer login management (staff creates from subscriber detail) ---
export function useCreateCustomerLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { subscriberId: string; email: string; password: string }) => {
      const { data } = await api.post(`/subscribers/${p.subscriberId}/login`, {
        email: p.email, password: p.password,
      });
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['subscriber', v.subscriberId] }),
  });
}

// --- Staff scoping (municipalities + subscriber assignments) ---
export function useStaffScope(userId: string | undefined) {
  return useQuery({
    queryKey: ['staff-scope', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await api.get<{
        municipalities: string[];
        barangays: string[];
        subscribers: Array<{ id: string; fullName: string; accountNo: string; municipality: string | null }>;
      }>(`/users/${userId}/scope`);
      return data;
    },
  });
}

export function useSetStaffMunicipalities() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; municipalities: string[] }) =>
      (await api.patch(`/users/${p.id}/municipalities`, { municipalities: p.municipalities })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['staff-scope', v.id] });
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

// Barangay coverage: each entry is "Municipality|Barangay".
export function useSetStaffBarangays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; barangays: string[] }) =>
      (await api.patch(`/users/${p.id}/barangays`, { barangays: p.barangays })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['staff-scope', v.id] });
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useSetStaffAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; subscriberIds: string[] }) =>
      (await api.put(`/users/${p.id}/assignments`, { subscriberIds: p.subscriberIds })).data,
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['staff-scope', v.id] }),
  });
}

// --- Subscriber status change ---
export function useSetSubscriberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status: string }) =>
      (await api.patch(`/subscribers/${p.id}/status`, { status: p.status })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['subscriber', v.id] });
      qc.invalidateQueries({ queryKey: ['subscribers'] });
      qc.invalidateQueries({ queryKey: ['owner-stats'] });
    },
  });
}

// --- Jobs / installations ---
export function useJobs(params?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: async () => (await api.get<Job[]>('/jobs', { params: params || {} })).data,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['job', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Job>(`/jobs/${id}`)).data,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { subscriberId: string; type?: string; technicianId?: string | null; scheduledAt?: string | null; notes?: string | null }) =>
      (await api.post('/jobs', p)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; technicianId?: string | null; scheduledAt?: string | null; status?: string; notes?: string | null }) => {
      const { id, ...body } = p;
      return (await api.patch(`/jobs/${id}`, body)).data;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['jobs'] }); qc.invalidateQueries({ queryKey: ['job', v.id] }); },
  });
}

export function useStartJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/jobs/${id}/start`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useCompleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; equipmentUsed?: string; cpeModel?: string; serialNo?: string; routerMac?: string; notes?: string }) => {
      const { id, ...body } = p;
      return (await api.post(`/jobs/${id}/complete`, body)).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); qc.invalidateQueries({ queryKey: ['owner-stats'] }); },
  });
}

// --- Attendance (technician GPS time-in) ---
export function useAttendanceToday() {
  return useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const { data } = await api.get<{ checkedIn: boolean; records: Array<{ id: string; timeIn: string; timeOut: string | null; gpsLat: number | null; gpsLng: number | null }> }>('/attendance/today');
      return data;
    },
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { gpsLat?: number; gpsLng?: number; accuracyM?: number; note?: string }) =>
      (await api.post('/attendance/check-in', p)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-today'] }),
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/attendance/check-out')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-today'] }),
  });
}

export function useAttendance(params?: { date?: string; technicianId?: string }) {
  return useQuery({
    queryKey: ['attendance', params],
    queryFn: async () => {
      const { data } = await api.get<Array<{
        id: string; userId: string; technicianName: string;
        timeIn: string; timeOut: string | null;
        gpsLat: number | null; gpsLng: number | null; accuracyM: number | null;
      }>>('/attendance', { params: params || {} });
      return data;
    },
  });
}

export interface BillingRunResult {
  period: string;      // "YYYY-MM"
  eligible: number;    // active subscribers with a plan
  created: number;     // invoices created (or that would be, in a preview)
  skipped: number;     // already billed this month, or no plan price
  totalCents: number;  // total added to balances
  dryRun?: boolean;
  overdueMarked?: number;
}

// Preview this month's billing without writing anything (owner/admin).
export function useBillingPreview() {
  return useMutation({
    mutationFn: async () => (await api.get<BillingRunResult>('/billing/preview')).data,
  });
}

// Actually generate this month's invoices and flag overdue ones (owner only).
export function useRunBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<BillingRunResult>('/billing/run')).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-stats'] });
      qc.invalidateQueries({ queryKey: ['subscribers'] });
    },
  });
}

// Edit a subscriber's everyday details (owner/admin).
export function useUpdateSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; data: Record<string, unknown> }) =>
      (await api.patch(`/subscribers/${p.id}`, p.data)).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['subscriber', v.id] });
      qc.invalidateQueries({ queryKey: ['subscribers'] });
      qc.invalidateQueries({ queryKey: ['owner-stats'] });
    },
  });
}

// Any logged-in user changes their own password.
export function useChangePassword() {
  return useMutation({
    mutationFn: async (p: { currentPassword: string; newPassword: string }) =>
      (await api.post('/auth/change-password', p)).data,
  });
}

// --- Payroll / salary ---
const pinHeader = (pin: string) => ({ headers: { 'x-salary-pin': pin } });

// Does the current user have a salary PIN set yet?
export function useSalaryStatus() {
  return useQuery({
    queryKey: ['salary-status'],
    queryFn: async () => (await api.get<{ hasPin: boolean }>('/salary/status')).data,
  });
}

export function useSetSalaryPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { pin: string; currentPin?: string }) => (await api.post('/salary/pin', p)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-status'] }),
  });
}

// Staff: my own salary + advances (needs the unlocked PIN).
export function useMySalary(pin: string | null) {
  return useQuery({
    queryKey: ['salary-me', pin],
    enabled: !!pin,
    retry: false,
    queryFn: async () =>
      (await api.get<{ salary: StaffSalary | null; advances: SalaryAdvance[]; approvedTotal: number }>(
        '/salary/me', pinHeader(pin as string))).data,
  });
}

export function useRequestAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { amountCents: number; reason?: string }) => (await api.post('/salary/advances', p)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-me'] }),
  });
}

// Admin: all staff salaries (needs the unlocked PIN).
export function useStaffSalaries(pin: string | null) {
  return useQuery({
    queryKey: ['salary-staff', pin],
    enabled: !!pin,
    retry: false,
    queryFn: async () => (await api.get<StaffSalaryRow[]>('/salary/staff', pinHeader(pin as string))).data,
  });
}

export function useSetStaffSalary(pin: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { userId: string; type: string; baseCents: number; allowanceCents: number; notes?: string }) => {
      const { userId, ...body } = p;
      return (await api.put(`/salary/staff/${userId}`, body, pinHeader(pin as string))).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-staff'] }),
  });
}

// Admin: advance requests queue (needs the unlocked PIN).
export function useAdvancesQueue(pin: string | null, status?: string) {
  return useQuery({
    queryKey: ['salary-advances', status, pin],
    enabled: !!pin,
    retry: false,
    queryFn: async () =>
      (await api.get<SalaryAdvance[]>('/salary/advances', { ...pinHeader(pin as string), params: status ? { status } : {} })).data,
  });
}

export function useDecideAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status: 'APPROVED' | 'REJECTED'; note?: string }) => {
      const { id, ...body } = p;
      return (await api.post(`/salary/advances/${id}/decision`, body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-advances'] });
      qc.invalidateQueries({ queryKey: ['salary-staff'] });
    },
  });
}

// --- Payroll runs (admin, PIN-gated) ---
export function usePayrollRuns(pin: string | null) {
  return useQuery({
    queryKey: ['payroll-runs', pin],
    enabled: !!pin,
    retry: false,
    queryFn: async () => (await api.get<PayrollRun[]>('/salary/payroll/runs', pinHeader(pin as string))).data,
  });
}

export function usePayrollRun(pin: string | null, id: string | null) {
  return useQuery({
    queryKey: ['payroll-run', id, pin],
    enabled: !!pin && !!id,
    retry: false,
    queryFn: async () => (await api.get<PayrollRunDetail>(`/salary/payroll/runs/${id}`, pinHeader(pin as string))).data,
  });
}

export function useCreatePayrollRun(pin: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (period: string) => (await api.post('/salary/payroll/runs', { period }, pinHeader(pin as string))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  });
}

export function useUpdatePayslip(pin: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; daysWorked: number }) =>
      (await api.patch(`/salary/payroll/payslips/${p.id}`, { daysWorked: p.daysWorked }, pinHeader(pin as string))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-run'] }),
  });
}

export function useFinalizePayroll(pin: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/salary/payroll/runs/${id}/finalize`, {}, pinHeader(pin as string))).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-run'] });
      qc.invalidateQueries({ queryKey: ['salary-staff'] });
    },
  });
}

// --- Payment void ---
export function useVoidPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; reason: string; subscriberId: string }) =>
      (await api.post(`/billing/payments/${p.id}/void`, { reason: p.reason })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['subscriber', v.subscriberId] });
      qc.invalidateQueries({ queryKey: ['owner-stats'] });
    },
  });
}

// --- Remittance (collector) ---
export function useRemittancePending() {
  return useQuery({
    queryKey: ['remittance-pending'],
    queryFn: async () => (await api.get<{ expectedCents: number; count: number }>('/remittance/pending')).data,
  });
}
export function useMyRemittances() {
  return useQuery({
    queryKey: ['remittance-mine'],
    queryFn: async () => (await api.get<Remittance[]>('/remittance/mine')).data,
  });
}
export function useSubmitRemittance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { submittedCents: number; note?: string }) => (await api.post('/remittance', p)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['remittance-pending'] });
      qc.invalidateQueries({ queryKey: ['remittance-mine'] });
    },
  });
}

// --- Remittance (admin) ---
export function useRemittances(status?: string) {
  return useQuery({
    queryKey: ['remittances', status],
    queryFn: async () => (await api.get<Remittance[]>('/remittance', { params: status ? { status } : {} })).data,
  });
}
export function useVerifyRemittance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/remittance/${id}/verify`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['remittances'] }),
  });
}
