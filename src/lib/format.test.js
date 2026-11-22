import { describe, expect, it } from 'vitest';
import { dayLabel, maskCents, maskPercent, parseToCents, todayISO } from './format';

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

describe('maskPercent', () => {
  it('aceita uma vírgula e até 2 casas', () => {
    expect(maskPercent('33.333')).toBe('33,33');
    expect(maskPercent('12,5,0')).toBe('12,50');
    expect(maskPercent(',5')).toBe('0,5');
    expect(maskPercent('05')).toBe('5');
    expect(maskPercent('25%')).toBe('25');
    expect(maskPercent('')).toBe('');
  });

  it('não passa de 100', () => {
    expect(maskPercent('150')).toBe('100');
    expect(maskPercent('100')).toBe('100');
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
