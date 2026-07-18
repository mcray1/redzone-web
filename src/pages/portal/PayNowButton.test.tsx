import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Portal "Pay now": clicking starts a checkout and redirects to the gateway's
// hosted URL. The checkout mutation is mocked (no real API/payment), and
// window.location is stubbed so the redirect is observable, not actually followed.
const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('../../hooks/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/queries')>();
  return { ...actual, useOnlineCheckout: () => ({ mutateAsync, isPending: false }) };
});

import { PayNowButton } from './Portal';

const realLocation = window.location;
beforeEach(() => {
  mutateAsync.mockReset();
  Object.defineProperty(window, 'location', { value: { href: '' }, writable: true, configurable: true });
});
afterEach(() => {
  Object.defineProperty(window, 'location', { value: realLocation, writable: true, configurable: true });
});

describe('PayNowButton', () => {
  it('labels the button with the peso amount', () => {
    render(<PayNowButton subscriberId="sub-1" amountCents={150_000} />);
    expect(screen.getByRole('button', { name: /Pay ₱1,500\.00 now/ })).toBeInTheDocument();
  });

  it('starts a checkout for the balance and redirects to the hosted URL', async () => {
    mutateAsync.mockResolvedValue({ intentId: 'pi_1', provider: 'hmac', checkoutUrl: 'https://pay.test/checkout/abc' });
    const user = userEvent.setup();
    render(<PayNowButton subscriberId="sub-1" amountCents={150_000} />);

    await user.click(screen.getByRole('button', { name: /Pay .* now/ }));

    expect(mutateAsync).toHaveBeenCalledWith({ subscriberId: 'sub-1', amountCents: 150_000 });
    expect(window.location.href).toBe('https://pay.test/checkout/abc');
  });

  it('shows an error and does not redirect when checkout fails', async () => {
    mutateAsync.mockRejectedValue(new Error('501'));
    const user = userEvent.setup();
    render(<PayNowButton subscriberId="sub-1" amountCents={150_000} />);

    await user.click(screen.getByRole('button', { name: /Pay .* now/ }));

    expect(await screen.findByText(/could not start the payment/i)).toBeInTheDocument();
    expect(window.location.href).toBe(''); // no redirect
  });
});
