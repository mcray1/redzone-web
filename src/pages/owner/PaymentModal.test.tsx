import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Record-payment "smoke": drive the real PaymentModal form and assert it (a)
// converts the typed peso amount to the correct integer centavos (the ×100 path
// that mis-charges customers if wrong) and (b) shows the success/receipt state.
// The mutation is mocked, so NO real API/payment is ever hit.
const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('../../hooks/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/queries')>();
  return { ...actual, useRecordPayment: () => ({ mutateAsync, isPending: false }) };
});
// FileUpload isn't relevant to the money path; stub it to keep the DOM simple.
vi.mock('../../components/FileUpload', () => ({ FileUpload: () => null }));

import { PaymentModal } from './SubscriberDetail';

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue({ receiptNo: 'OR-0007', restored: true, enforcement: { method: 'queued' } });
});

describe('PaymentModal — record-payment flow', () => {
  it('defaults the amount to the outstanding balance in pesos', () => {
    render(<PaymentModal subscriberId="sub-1" balanceCents={150_000} onClose={() => {}} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(1500); // ₱1,500.00 balance
  });

  it('posts the typed amount as integer centavos and shows the receipt', async () => {
    const user = userEvent.setup();
    render(<PaymentModal subscriberId="sub-1" balanceCents={0} onClose={() => {}} />);

    const amount = screen.getByRole('spinbutton');
    await user.clear(amount);
    await user.type(amount, '250.50');
    await user.selectOptions(screen.getByRole('combobox'), 'GCASH');
    await user.click(screen.getByRole('button', { name: 'Record' }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ subscriberId: 'sub-1', amountCents: 25_050, method: 'GCASH' }),
    );

    // Success view with the returned receipt number.
    expect(await screen.findByText(/payment recorded/i)).toBeInTheDocument();
    expect(screen.getByText('OR-0007')).toBeInTheDocument();
    // Queued-restore hint is surfaced (enforcement.method === 'queued').
    expect(screen.getByText(/restore queued/i)).toBeInTheDocument();
  });

  it('rounds a valid fractional peso amount to exact centavos (no float drift)', async () => {
    // 0.29 * 100 === 28.999999999999996 in IEEE-754 — Math.round must yield 29.
    const user = userEvent.setup();
    render(<PaymentModal subscriberId="sub-2" balanceCents={0} onClose={() => {}} />);
    await user.type(screen.getByRole('spinbutton'), '0.29');
    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 29 }));
  });
});
