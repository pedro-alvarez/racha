import { describe, expect, it } from 'vitest';
import { dayLabel, maskCents, parseToCents, todayISO } from './format';

describe('maskCents', () => {
  it('preenche a partir dos centavos', () => {
    expect(maskCents('1')).toBe('0,01');
    expect(maskCents('12')).toBe('0,12');
    expect(maskCents('1234')).toBe('12,34');
    expect(maskCents('123456')).toBe('1.234,56');
  });

  it('ignora o que não é dígito e zeros à esquerda', () => {
    expect(maskCents('R$ 0,012')).toBe('0,12');
    expect(maskCents('12,345')).toBe('123,45');
    expect(maskCents('')).toBe('');
    expect(maskCents('0,00')).toBe('');
  });

  it('volta a ser lido em centavos', () => {
    expect(parseToCents(maskCents('123456'))).toBe(123456);
  });
});

describe('dayLabel', () => {
  it('lê "AAAA-MM-DD" como dia local, sem cair no dia anterior', () => {
    const d = new Date();
    expect(dayLabel(todayISO())).toBe('Hoje');
    d.setDate(d.getDate() - 1);
    expect(dayLabel(todayISO(d.toISOString()))).toBe('Ontem');
  });
});
