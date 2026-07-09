export type Role = 'OWNER' | 'ADMIN' | 'COLLECTOR' | 'TECHNICIAN' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId?: string | null;
}

export type SubscriberStatus =
  | 'ACTIVE' | 'PENDING_INSTALLATION' | 'SUSPENDED' | 'DISCONNECTED' | 'ARCHIVED';

export interface ServicePlan {
  id: string;
  name: string;
  priceCents: number;
  downloadKbps: number;
  uploadKbps: number;
  graceDays?: number;
  lateFeeCents?: number;
  active?: boolean;
}

export interface Subscriber {
  id: string;
  accountNo: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  sitio?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  status: SubscriberStatus;
  servicePlan?: ServicePlan | null;
  balanceCents: number;
  dueDay: number;
  lateFeeEnabled?: boolean;
  pppoeUsername?: string | null;
  loginUser?: { id: string; email: string; active: boolean } | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  amountCents: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: 'PAID' | 'DUE' | 'OVERDUE';
}

export interface Payment {
  id: string;
  amountCents: number;
  method: string;
  receiptNo: string;
  createdAt: string;
  voided?: boolean;
  voidReason?: string | null;
  proofUrl?: string | null;
}

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amountCents: number;
  method?: string | null;
  vendor?: string | null;
  reference?: string | null;
  receiptPath?: string | null;
  status?: ExpenseStatus;
  createdAt: string;
  submittedBy?: string;
  submittedRole?: Role | null;
}

export type ExtensionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface PaymentExtension {
  id: string;
  subscriberId: string;
  requestedDate: string;
  approvedDate?: string | null;
  reason?: string | null;
  status: ExtensionStatus;
  createdAt: string;
  subscriber?: { id: string; fullName: string; accountNo: string; balanceCents: number };
}

export interface AuditEntry {
  id: string;
  action: string;
  target?: string | null;
  meta?: unknown;
  ip?: string | null;
  createdAt: string;
  userName: string;
}

export const peso = (cents: number) =>
  '₱' + (cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });

export type StaffRole = 'ADMIN' | 'COLLECTOR';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  municipalities?: string[];
  createdAt: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TicketMessage {
  id: string;
  authorName: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  subscriber?: { fullName: string; accountNo: string } | null;
  messages: TicketMessage[];
  _count?: { messages: number };
  createdAt: string;
  updatedAt: string;
}

export interface CollectorToday {
  count: number;
  totalCents: number;
  byMethod: Record<string, number>;
  payments: Array<{
    id: string;
    amountCents: number;
    method: string;
    receiptNo: string;
    createdAt: string;
    subscriber: { fullName: string; accountNo: string };
  }>;
}

export type JobType = 'INSTALLATION' | 'REPAIR';
export type JobStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  subscriberId: string;
  technicianId?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  equipmentUsed?: string | null;
  cpeModel?: string | null;
  serialNo?: string | null;
  routerMac?: string | null;
  subscriber: {
    id: string;
    fullName: string;
    accountNo: string;
    address?: string | null;
    barangay?: string | null;
    municipality?: string | null;
    gpsLat?: number | null;
    gpsLng?: number | null;
  };
}

// --- Payroll / salary ---
export type SalaryType = 'MONTHLY' | 'DAILY';
export type AdvanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StaffSalary {
  id: string;
  userId: string;
  type: SalaryType;
  baseCents: number;       // monthly base, or the daily rate when type = DAILY
  allowanceCents: number;  // monthly allowance
  notes?: string | null;
  updatedAt: string;
}

export interface SalaryAdvance {
  id: string;
  userId: string;
  amountCents: number;
  reason?: string | null;
  status: AdvanceStatus;
  decisionNote?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  user?: { id: string; name: string; role: Role };
}

export interface StaffSalaryRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  salary: StaffSalary | null;
  approvedAdvanceTotal: number;
}

// --- Remittance ---
export type RemittanceStatus = 'PENDING' | 'VERIFIED';
export interface Remittance {
  id: string;
  collectorId: string;
  expectedCents: number;
  submittedCents: number;
  status: RemittanceStatus;
  note?: string | null;
  createdAt: string;
  collectorName?: string;
  varianceCents?: number;
}

// --- Payroll runs ---
export type PayrollStatus = 'DRAFT' | 'FINALIZED';
export interface PayrollRun {
  id: string;
  period: string;
  status: PayrollStatus;
  createdAt: string;
  finalizedAt?: string | null;
  _count?: { payslips: number };
}
export interface Payslip {
  id: string;
  userId: string;
  type: SalaryType;
  baseCents: number;
  allowanceCents: number;
  dailyRateCents: number;
  daysWorked: number;
  grossCents: number;
  advanceDeductedCents: number;
  netCents: number;
  staffName?: string;
  staffRole?: Role | null;
}
export interface PayrollRunDetail extends PayrollRun {
  payslips: Payslip[];
  totals: { gross: number; advance: number; net: number };
}
