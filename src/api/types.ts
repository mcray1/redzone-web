export type Role = 'OWNER' | 'ADMIN' | 'COLLECTOR';

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
  active?: boolean;
}

export interface Subscriber {
  id: string;
  accountNo: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  status: SubscriberStatus;
  servicePlan?: ServicePlan | null;
  balanceCents: number;
  dueDay: number;
  pppoeUsername?: string | null;
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
