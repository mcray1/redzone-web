import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Regression guard for the P1.9 consent contract: the backend 400s any public
// signup without consent:true, so the form MUST gate submit on the checkbox and
// send the flag. (The original deploy shipped the backend requirement without
// this checkbox, breaking live signups.)
const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('../hooks/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/queries')>();
  return { ...actual, useSubmitRegistration: () => ({ mutateAsync, isPending: false }) };
});

import Register from './Register';

function renderPage() {
  return render(<MemoryRouter><Register /></MemoryRouter>);
}

beforeEach(() => { mutateAsync.mockReset(); mutateAsync.mockResolvedValue({ ok: true }); });

describe('Register — Data Privacy Act consent', () => {
  it('keeps Submit disabled until the consent box is ticked', async () => {
    const user = userEvent.setup();
    renderPage();
    const btn = screen.getByRole('button', { name: /submit application/i });
    expect(btn).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(btn).toBeEnabled();
  });

  it('sends consent: true with the submission', async () => {
    const user = userEvent.setup();
    renderPage();
    // Minimal required fields (name, phone, email, password).
    await user.type(screen.getByPlaceholderText('Juan Dela Cruz'), 'Test Applicant');
    await user.type(screen.getByPlaceholderText('0917xxxxxxx'), '09171234567');
    await user.type(screen.getByPlaceholderText('you@email.com'), 'applicant@test.local');
    await user.type(screen.getByPlaceholderText('at least 8 characters'), 'Passw0rd!');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /submit application/i }));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ consent: true });
  });
});
