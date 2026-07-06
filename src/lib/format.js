/** Helpers de formatação (pt-BR). Valores monetários em centavos. */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCents(cents) {
  return brl.format((cents ?? 0) / 100);
}

/** "R$ 1.234,56" sem sinal, para exibir com cor indicando o sinal. */
export function formatCentsAbs(cents) {
  return brl.format(Math.abs(cents ?? 0) / 100);
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}`;
}

export function formatDateFull(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateRange(start, end) {
  if (!start) return '';
  if (!end || start === end) return formatDateFull(start);
  return `${formatDate(start)} a ${formatDate(end)} de ${end.slice(0, 4)}`;
}

export function formatRelative(iso) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  return date.toLocaleDateString('pt-BR');
}

/** Converte string digitada ("123,45") para centavos. */
export function parseToCents(text) {
  if (text == null || text === '') return 0;
  const clean = String(text).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const value = parseFloat(clean);
  return Number.isNaN(value) ? 0 : Math.round(value * 100);
}

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export const firstName = (name = '') => name.split(' ')[0];

/** Rótulo de agrupamento por dia: Hoje / Ontem / "12 jul". */
export function dayLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Hora local HH:MM. */
export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Chave Pix mascarada para listas: "cpf***". */
export function maskPix(pix) {
  if (!pix) return null;
  return `${pix.type}***`;
}

/** Rótulo do tipo de grupo. */
export const tripTypeLabel = (type) => (type === 'role' ? 'Rolê' : 'Viagem');

/** Máscara de digitação para chave Pix conforme o tipo. */
export function formatPixKey(type, value) {
  if (type === 'cpf') {
    const d = value.replace(/\D/g, '').slice(0, 11);
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2}).*/, '$1.$2.$3-$4');
  }
  if (type === 'celular') {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (type === 'email') return value.trim().toLowerCase();
  return value; // aleatória: livre
}

/** Valida a chave Pix; retorna mensagem de erro ou null se ok. */
export function validatePixKey(type, key) {
  if (!key) return null; // vazio = sem chave, permitido
  const digits = key.replace(/\D/g, '');
  if (type === 'cpf' && digits.length !== 11) return 'CPF incompleto: são 11 dígitos.';
  if (type === 'celular' && digits.length < 10) return 'Celular incompleto: inclua o DDD.';
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return 'E-mail inválido.';
  if (type === 'aleatoria' && key.trim().length < 8) return 'Chave aleatória muito curta.';
  return null;
}

/** Placeholder do campo de chave Pix conforme o tipo. */
export const pixPlaceholder = (type) =>
  ({
    cpf: '000.000.000-00',
    celular: '(11) 98888-7766',
    email: 'voce@email.com',
    aleatoria: 'cole a chave gerada pelo banco',
  })[type] ?? 'Sua chave';
