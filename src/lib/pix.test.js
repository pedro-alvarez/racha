import { describe, expect, it } from 'vitest';
import { chavePix, crc16, pixCopiaECola, textoPix } from './pix';

describe('Pix copia e cola', () => {
  it('bate com o exemplo do manual do Banco Central', () => {
    const codigo = pixCopiaECola({ key: '123e4567-e12b-12d1-a456-426655440000', name: 'Fulano de Tal', city: 'BRASILIA' });
    expect(codigo).toBe(
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
    );
  });

  it('coloca o valor e fecha o CRC', () => {
    const codigo = pixCopiaECola({ key: 'natan@email.com', name: 'Natan Shulman', amount: 6508, info: 'Racha' });
    expect(codigo).toContain('540565.08');
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });

  it('tira acentos do nome e corta em 25 caracteres', () => {
    const codigo = pixCopiaECola({ key: 'x@y.com', name: 'João Antônio da Conceição Mendes', amount: 100 });
    expect(codigo).toContain('5925Joao Antonio da Conceica');
  });

  it('normaliza as chaves', () => {
    expect(chavePix('cpf', '123.456.789-09')).toBe('12345678909');
    expect(chavePix('celular', '(11) 98888-7766')).toBe('+5511988887766');
    expect(chavePix('email', 'Pedro@Email.COM ')).toBe('pedro@email.com');
  });
});

describe('textoPix', () => {
  it('junta quem recebe, a chave e o valor num texto só', () => {
    expect(textoPix({ name: 'Natan Shulman', type: 'celular', key: '(11) 98888-7766', amount: 6500 })).toBe(
      'Pix de R$\u00a065,00 para Natan Shulman. Chave Pix (celular): (11) 98888-7766'
    );
  });
});
