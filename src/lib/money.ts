// Canonical money helpers. Money is handled as INTEGER CENTAVOS everywhere; the
// UI only ever shows/accepts pesos. Centralized here because the peso→centavo
// conversion was previously copy-pasted (`Math.round(Number(x) * 100)`) across
// ~9 components, where a stray ×100 or rounding bug would mis-charge customers.

// Format integer centavos as a Philippine-peso string, e.g. 150000 → "₱1,500.00".
export function peso(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return '₱' + (n / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse a user-entered peso amount (string or number) into integer centavos.
// Returns 0 for blank/invalid input, rounds to the nearest centavo, and never
// returns a negative (a payment/expense amount is non-negative).
export function pesosToCentavos(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === '') return 0;
  const pesos = typeof input === 'number' ? input : Number(String(input).replace(/,/g, '').trim());
  if (!Number.isFinite(pesos)) return 0;
  return Math.max(0, Math.round(pesos * 100));
}
