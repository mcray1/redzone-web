import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Login flow: mock the auth context + navigation so no real API is hit; assert
// the happy path routes by role, a wrong password surfaces an error, and an
// MFA-required response shows the code step instead of navigating.
const { login, navigate, verifyMfa } = vi.hoisted(() => ({ login: vi.fn(), navigate: vi.fn(), verifyMfa: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ login, verifyMfa, selectWorkspace: vi.fn() }) }));

import Login from './Login';
import { MemoryRouter } from 'react-router-dom';

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>);
}
async function signIn(user: ReturnType<typeof userEvent.setup>, email = 'owner@redzone.com.ph', pw = 'Passw0rd!') {
  await user.type(screen.getByPlaceholderText('you@redzone.com.ph'), email);
  await user.type(screen.getByPlaceholderText('••••••••'), pw);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

beforeEach(() => { login.mockReset(); navigate.mockReset(); });

describe('Login', () => {
  it('signs in and routes an OWNER to /owner', async () => {
    login.mockResolvedValue({ mfaRequired: false, user: { role: 'OWNER', memberships: [] } });
    const user = userEvent.setup();
    renderLogin();
    await signIn(user);
    expect(login).toHaveBeenCalledWith('owner@redzone.com.ph', 'Passw0rd!');
    expect(navigate).toHaveBeenCalledWith('/owner', { replace: true });
  });

  it('shows an error on a wrong password and does not navigate', async () => {
    login.mockRejectedValue(new Error('401'));
    const user = userEvent.setup();
    renderLogin();
    await signIn(user, 'owner@redzone.com.ph', 'wrong');
    expect(await screen.findByText(/wrong email or password/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('prompts for the 2FA code when MFA is required (no navigation yet)', async () => {
    login.mockResolvedValue({ mfaRequired: true, mfaToken: 'mfa-tok' });
    const user = userEvent.setup();
    renderLogin();
    await signIn(user);
    expect(await screen.findByText(/6-digit code/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
