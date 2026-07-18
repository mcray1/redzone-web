import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Self-service plan change: picking a plan shows the prorated quote (preview),
// confirming applies it. The change mutation is mocked (no real API).
const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('../../hooks/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/queries')>();
  return {
    ...actual,
    usePlans: () => ({ data: [
      { id: 'A', name: 'Basic', priceCents: 100_000, downloadKbps: 10_000, uploadKbps: 5_000, active: true },
      { id: 'B', name: 'Fast', priceCents: 160_000, downloadKbps: 20_000, uploadKbps: 10_000, active: true },
    ] }),
    useChangePlan: () => ({ mutateAsync, isPending: false }),
  };
});

import { PortalPlanChange } from './Portal';

const CURRENT = { id: 'A', name: 'Basic', priceCents: 100_000, downloadKbps: 10_000, uploadKbps: 5_000, active: true };

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockImplementation(async (p: { preview?: boolean }) =>
    p.preview
      ? { preview: true, adjustmentCents: 32_000, daysRemaining: 16, newPlan: { id: 'B', name: 'Fast', priceCents: 160_000 } }
      : { adjustmentCents: 32_000, daysRemaining: 16, balanceCents: 132_000, newPlan: { id: 'B', name: 'Fast', priceCents: 160_000 } });
});

describe('PortalPlanChange', () => {
  it('lists other active plans (not the current one) and shows the current plan', () => {
    render(<PortalPlanChange subscriberId="sub-1" current={CURRENT} />);
    expect(screen.getByText(/currently on/i)).toHaveTextContent('Basic');
    expect(screen.getByRole('button', { name: /Fast/ })).toBeInTheDocument();
    // The current plan is not offered as a switch target.
    expect(screen.queryByRole('button', { name: /^Basic/ })).toBeNull();
  });

  it('previews the prorated charge, then applies on confirm', async () => {
    const user = userEvent.setup();
    const { container } = render(<PortalPlanChange subscriberId="sub-1" current={CURRENT} />);

    await user.click(screen.getByRole('button', { name: /Fast/ }));
    expect(mutateAsync).toHaveBeenCalledWith({ subscriberId: 'sub-1', servicePlanId: 'B', preview: true });
    // Quote shown (₱320.00 = 32,000 centavos over the remaining days). The amount
    // sits in its own <b>, so assert on the paragraph's combined text.
    await screen.findByText('₱320.00');
    expect(container.textContent).toMatch(/adds ₱320\.00/);

    await user.click(screen.getByRole('button', { name: /confirm switch to Fast/i }));
    expect(mutateAsync).toHaveBeenLastCalledWith({ subscriberId: 'sub-1', servicePlanId: 'B' });
    expect(await screen.findByText(/you're now on Fast/i)).toBeInTheDocument();
  });

  it('frames a downgrade as a credit', async () => {
    mutateAsync.mockImplementation(async () => ({ preview: true, adjustmentCents: -32_000, daysRemaining: 16, newPlan: { id: 'B', name: 'Fast', priceCents: 60_000 } }));
    const user = userEvent.setup();
    const { container } = render(<PortalPlanChange subscriberId="sub-1" current={CURRENT} />);
    await user.click(screen.getByRole('button', { name: /Fast/ }));
    await screen.findByText('₱320.00');
    expect(container.textContent).toMatch(/credits ₱320\.00/);
  });
});
