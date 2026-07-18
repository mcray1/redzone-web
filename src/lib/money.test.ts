import { describe, it, expect } from 'vitest';
import { peso, pesosToCentavos } from './money';

describe('peso (centavos → display)', () => {
  it('formats whole and fractional pesos with a ₱ sign and 2 decimals', () => {
    expect(peso(0)).toBe('₱0.00');
    expect(peso(5)).toBe('₱0.05');
    expect(peso(150)).toBe('₱1.50');
    expect(peso(100_000)).toBe('₱1,000.00');
    expect(peso(1_234_567)).toBe('₱12,345.67');
  });

  it('groups thousands and always shows exactly 2 decimals', () => {
    expect(peso(199)).toBe('₱1.99');
    expect(peso(1_000_000_00)).toBe('₱1,000,000.00');
  });

  it('is defensive against non-finite input (treats it as 0)', () => {
    expect(peso(NaN)).toBe('₱0.00');
    // @ts-expect-error — guarding runtime misuse
    expect(peso(undefined)).toBe('₱0.00');
  });
});

describe('pesosToCentavos (input → centavos)', () => {
  it('converts a peso amount to integer centavos (no ×100 drift)', () => {
    expect(pesosToCentavos(1000)).toBe(100_000);
    expect(pesosToCentavos('1000')).toBe(100_000);
    expect(pesosToCentavos('1.50')).toBe(150);
    expect(pesosToCentavos('0.05')).toBe(5);
    expect(pesosToCentavos(12_345.67)).toBe(1_234_567);
  });

  it('rounds to the nearest centavo (float safety)', () => {
    expect(pesosToCentavos('19.999')).toBe(2000);
    expect(pesosToCentavos('0.014')).toBe(1);
    expect(pesosToCentavos(0.1 + 0.2)).toBe(30); // 0.30000000000000004 → 30
  });

  it('strips thousands separators from typed input', () => {
    expect(pesosToCentavos('1,000')).toBe(100_000);
    expect(pesosToCentavos('12,345.67')).toBe(1_234_567);
  });

  it('treats blank / invalid input as 0 and never returns a negative', () => {
    expect(pesosToCentavos('')).toBe(0);
    expect(pesosToCentavos(null)).toBe(0);
    expect(pesosToCentavos(undefined)).toBe(0);
    expect(pesosToCentavos('abc')).toBe(0);
    expect(pesosToCentavos(-50)).toBe(0);
  });

  it('round-trips with peso for whole-centavo values', () => {
    for (const c of [0, 5, 150, 100_000, 1_234_567]) {
      expect(pesosToCentavos(c / 100)).toBe(c);
    }
  });
});
