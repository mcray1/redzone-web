export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'COLLECTOR' | 'TECHNICIAN' | 'CUSTOMER';

// Capability keys a custom (manager) role can be granted. '*' means "everything"
// and is what the token/login returns for owners and admins.
export type PermissionKey =
  | 'subscribers.add'
  | 'subscribers.edit'
  | 'subscribers.status'
  | 'subscribers.login'
  | 'payments.void'
  | 'billing.prorate'
  | 'remittances.verify'
  | 'extensions.approve'
  | 'discounts.approve'
  | 'expenses.approve'
  | 'plans.manage'
  | 'jobs.manage'
  | 'registrations.review'
  | 'tickets.manage'
  | 'inventory.view'
  | 'inventory.manage'
  | 'network.view'
  | 'routers.manage'
  | 'cpe.view'
  | 'cpe.manage'
  | 'vendo.view'
  | 'vendo.manage'
  | 'coverage.assign'
  | 'reports.view'
  | 'payroll.view'
  | 'audit.view';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  roles?: Role[];
  branchId?: string | null;
  permissions?: Array<PermissionKey | '*'>;
}

export interface CustomRole {
  id: string;
  name: string;
  permissions: PermissionKey[];
  userCount?: number;
}

export interface PermissionCatalogItem {
  key: PermissionKey;
  label: string;
  group?: string;
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

export type AccountType = 'PLAN' | 'VENDO';

export interface Subscriber {
  id: string;
  accountNo: string;
  accountType?: AccountType;
  estimatedClients?: number | null;
  vendoName?: string | null;
  vendoNumber?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  sitio?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  status: SubscriberStatus;
  servicePlan?: ServicePlan | null;
  balanceCents: number;
  dueDay: number;
  lateFeeEnabled?: boolean;
  billingExempt?: boolean;
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

export type DiscountStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface DiscountRequest {
  id: string;
  subscriberId: string;
  amountCents: number;
  reason?: string | null;
  status: DiscountStatus;
  requestedByRole?: string | null;
  decisionNote?: string | null;
  createdAt: string;
  decidedAt?: string | null;
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
  roles?: Role[];
  active: boolean;
  municipalities?: string[];
  createdAt: string;
  customRoleId?: string | null;
  customRole?: { id: string; name: string; permissions: PermissionKey[] } | null;
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

// --- Inventory ---
export type MovementType = 'STOCK_IN' | 'RETURNED' | 'STOCK_OUT' | 'DAMAGED' | 'ASSIGNED' | 'USED';
export interface InventoryItem {
  id: string;
  name: string;
  sku?: string | null;
  category: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  notes?: string | null;
  lowStock?: boolean;
}
export interface InventoryMovement {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  note?: string | null;
  createdAt: string;
}

// --- Client registrations (public sign-ups) ---
export interface PublicPlan {
  id: string;
  name: string;
  priceCents: number;
  downloadKbps: number;
  uploadKbps: number;
}

export type RegistrationType = 'PLAN' | 'VENDO';
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Registration {
  id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  fullName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  sitio?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  servicePlanId?: string | null;
  servicePlan?: { id: string; name: string; priceCents: number } | null;
  estimatedClients?: number | null;
  notes?: string | null;
  rejectReason?: string | null;
  subscriberId?: string | null;
  userId?: string | null;
  hasLogin?: boolean;
  createdAt: string;
  decidedAt?: string | null;
}

// --- CPE devices (GenieACS / TR-069) ---
export interface CpeDevice {
  id: string;
  serial?: string | null;
  productClass?: string | null;
  manufacturer?: string | null;
  oui?: string | null;
  pppoeUsername?: string | null;
  ssid?: string | null;
  uptimeSeconds?: number | null;
  software?: string | null;
  lastInform?: string | null;
  online: boolean;
  subscriber?: { id: string; fullName: string; accountNo: string; pppoeUsername?: string | null } | null;
}

// --- Vendo (coin income + expenses) ---
export interface VendoCoinType {
  id: string;
  key: string;
  label: string;
  faceCents: number;
  gramsPerCoin: number;
  sortOrder: number;
}
export interface VendoCollectionLine {
  key: string; label: string; faceCents: number; gramsPerCoin: number;
  grams: number | null; count: number; valueCents: number;
}
export interface VendoCollection {
  id: string;
  subscriberId: string;
  date: string;
  lines: VendoCollectionLine[];
  grossCents: number;
  deductionPct: number;
  deductionCents: number;
  netCents: number;
  note?: string | null;
  createdAt: string;
}
export interface VendoExpense {
  id: string;
  subscriberId: string;
  date: string;
  category: string;
  description: string;
  amountCents: number;
  createdAt: string;
}
export interface VendoSummary {
  grossCents: number; netCents: number; expenseCents: number; profitCents: number; collections: number;
}
export interface VendoReportRow {
  id: string; fullName: string; phone?: string | null; accountNo: string;
  vendoName?: string | null; vendoNumber?: string | null;
  municipality?: string | null; barangay?: string | null; sitio?: string | null;
  grossCents: number; netCents: number; expenseCents: number; profitCents: number;
}

// --- Network monitoring ---
export interface NetworkNode {
  id: string;
  name: string;
  host?: string | null;
  cpuLoad?: number | null;
  memUsedPct?: number | null;
  uptime?: string | null;
  version?: string | null;
  sessionCount?: number | null;
  sessions?: Array<{
    name: string; address?: string; uptime?: string;
    subscriberName?: string | null; accountNo?: string | null; subStatus?: string | null;
  }> | null;
  lastReportAt?: string | null;
  online: boolean;
}
