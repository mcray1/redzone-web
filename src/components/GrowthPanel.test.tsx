import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const growth = {
  mrrCents: 250_000, activeSubscribers: 2, arpuCents: 125_000,
  byStatus: { ACTIVE: 2, DISCONNECTED: 1 }, new30d: 3, churned30d: 1, churnRatePct: 33.3,
  collectedByMonth: [{ month: '2027-05', cents: 120_000 }, { month: '2027-06', cents: 200_000 }],
};
vi.mock('../hooks/queries', () => ({ useGrowth: () => ({ data: growth, isLoading: false }) }));

import { GrowthPanel } from './GrowthPanel';

describe('GrowthPanel', () => {
  it('renders the recurring-revenue KPIs, churn, and the monthly trend', () => {
    const { container } = render(<GrowthPanel enabled />);
    expect(screen.getByText('₱2,500.00')).toBeInTheDocument(); // MRR
    expect(screen.getByText('₱1,250.00')).toBeInTheDocument(); // ARPU
    expect(screen.getByText('33.3%')).toBeInTheDocument();     // churn
    expect(container.textContent).toMatch(/3 new · 1 churned/);
    // Trend rows for both months, with peso amounts.
    expect(screen.getByText('2027-05')).toBeInTheDocument();
    expect(screen.getByText('₱2,000.00')).toBeInTheDocument(); // June collected
  });

  it('renders nothing when disabled', () => {
    const { container } = render(<GrowthPanel enabled={false} />);
    expect(container.textContent).toBe('');
  });
});
