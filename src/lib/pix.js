/**
 * Pix copia e cola (BR Code estático, padrão EMV do Banco Central).
 * Gera o texto que a pessoa cola no app do banco (Pix → Copia e Cola): a chave
 * de quem recebe e o valor já vêm preenchidos. Não precisa de API nem de banco.
 */

const campo = (id, valor) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do BR Code. */
export function crc16(texto) {
  let crc = 0xffff;
  for (const ch of new TextEncoder().encode(texto)) {
    crc ^= ch << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Texto sem acento, só caracteres aceitos, cortado no tamanho máximo. */
const limpo = (texto, max) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .,-]/g, '')
    .trim()
    .slice(0, max);

/** Chave no formato que o Pix espera (CPF só números, celular com +55, e-mail minúsculo). */
export function chavePix(type, key) {
  const k = String(key ?? '').trim();
  if (type === 'cpf') return k.replace(/\D/g, '');
  if (type === 'celular') {
    const d = k.replace(/\D/g, '');
    return d.startsWith('55') && d.length > 11 ? `+${d}` : `+55${d}`;
  }
  if (type === 'email') return k.toLowerCase();
  return k; // aleatória
}

/**
 * @param {Object} p
 * @param {string} p.key     chave Pix já no formato (use chavePix)
 * @param {string} p.name    nome de quem recebe
 * @param {string} [p.city]  cidade (obrigatória no padrão; não é conferida pelos bancos)
 * @param {number} [p.amount] valor em centavos (sem valor = a pessoa digita)
 * @param {string} [p.info]  mensagem curta para quem recebe
 */
export function pixCopiaECola({ key, name, city = 'Sao Paulo', amount, info }) {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', key) + (info ? campo('02', limpo(info, 40)) : '');
  const partes = [
    campo('00', '01'),
    campo('26', conta),
    campo('52', '0000'),
    campo('53', '986'),
    amount > 0 ? campo('54', (amount / 100).toFixed(2)) : '',
    campo('58', 'BR'),
    campo('59', limpo(name, 25) || 'Racha'),
    campo('60', limpo(city, 15) || 'Sao Paulo'),
    campo('62', campo('05', '***')),
  ].join('');
  const semCrc = `${partes}6304`;
  return semCrc + crc16(semCrc);
}
