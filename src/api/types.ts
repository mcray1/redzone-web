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
