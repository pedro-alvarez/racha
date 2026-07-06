/**
 * seedData.js - dados fake para o protótipo nascer navegável.
 * Valores monetários em CENTAVOS.
 * Quando o backend real existir, este arquivo deixa de ser usado
 * (o dataService passa a buscar tudo da API).
 */

export const CURRENT_USER_ID = 'u-pedro';

export const seedUsers = [
  { id: 'u-pedro', name: 'Pedro Certo', email: 'pedro.a.certo@gmail.com', color: '#F0146B', role: 'admin' , photo: null, pix: { type: 'email', key: 'pedro.a.certo@gmail.com' } },
  { id: 'u-marina', name: 'Marina Lopes', email: 'marina.lopes@gmail.com', color: '#8B5CF6' , photo: null, pix: { type: 'cpf', key: '123.456.789-00' } },
  { id: 'u-lucas', name: 'Lucas Ferreira', email: 'lucas.fe@gmail.com', color: '#06B6D4' , photo: null, pix: { type: 'celular', key: '(11) 98888-1234' } },
  { id: 'u-fernanda', name: 'Fernanda Dias', email: 'fe.dias@gmail.com', color: '#F59E0B' , photo: null, pix: { type: 'aleatoria', key: 'f3d1c2b4-9a87-4e21-b0aa-5d6e7f8a9b0c' } },
  { id: 'u-rafa', name: 'Rafa Souza', email: 'rafa.souza@gmail.com', color: '#22C55E' , photo: null, pix: { type: 'email', key: 'rafa.souza@gmail.com' } },
  { id: 'u-bia', name: 'Bia Martins', email: 'bia.martins@gmail.com', color: '#EC4899' , photo: null, pix: { type: 'cpf', key: '987.654.321-00' } },
  { id: 'u-thiago', name: 'Thiago Nunes', email: 'thiago.n@gmail.com', color: '#3B82F6' , photo: null, pix: { type: 'celular', key: '(21) 97777-4321' } },
];

export const seedTrips = [
  {
    id: 't-ubatuba',
    name: 'Ubatuba 2026',
    emoji: '🏖️',
    type: 'viagem',
    startDate: '2026-07-10',
    endDate: '2026-07-14',
    members: ['u-pedro', 'u-marina', 'u-lucas', 'u-fernanda', 'u-rafa'],
    createdAt: '2026-06-20T14:00:00Z',
  },
  {
    id: 't-monteverde',
    name: 'Chalé em Monte Verde',
    emoji: '🏔️',
    type: 'viagem',
    startDate: '2026-08-21',
    endDate: '2026-08-23',
    members: ['u-pedro', 'u-bia', 'u-thiago', 'u-marina'],
    createdAt: '2026-06-28T10:00:00Z',
  },
  {
    id: 't-churras',
    name: 'Churras de Julho',
    emoji: '🍖',
    type: 'role',
    startDate: '2026-07-05',
    endDate: '2026-07-05',
    members: ['u-pedro', 'u-lucas', 'u-rafa', 'u-thiago'],
    createdAt: '2026-07-01T09:00:00Z',
  },
];

export const seedExpenses = [
  // ---- Ubatuba 2026 ----
  {
    id: 'e-1',
    tripId: 't-ubatuba',
    description: 'Airbnb: casa pé na areia (4 noites)',
    category: 'hospedagem',
    amount: 240000,
    paidBy: 'u-marina',
    splitType: 'equal',
    participants: ['u-pedro', 'u-marina', 'u-lucas', 'u-fernanda', 'u-rafa'],
    createdAt: '2026-06-22T18:30:00Z',
  },
  {
    id: 'e-2',
    tripId: 't-ubatuba',
    description: 'Gasolina + pedágio (ida)',
    category: 'transporte',
    amount: 38000,
    paidBy: 'u-pedro',
    splitType: 'equal',
    participants: ['u-pedro', 'u-marina', 'u-lucas', 'u-fernanda', 'u-rafa'],
    createdAt: '2026-07-10T08:15:00Z',
  },
  {
    id: 'e-3',
    tripId: 't-ubatuba',
    description: 'Mercado: compra da semana',
    category: 'comida',
    amount: 62350,
    paidBy: 'u-lucas',
    splitType: 'equal',
    participants: ['u-pedro', 'u-marina', 'u-lucas', 'u-fernanda', 'u-rafa'],
    createdAt: '2026-07-10T16:40:00Z',
  },
  {
    id: 'e-4',
    tripId: 't-ubatuba',
    description: 'Passeio de barco (Ilha das Couves)',
    category: 'lazer',
    amount: 90000,
    paidBy: 'u-fernanda',
    splitType: 'fixed',
    participants: ['u-pedro', 'u-marina', 'u-fernanda', 'u-rafa'],
    shares: { 'u-pedro': 22500, 'u-marina': 22500, 'u-fernanda': 22500, 'u-rafa': 22500 },
    createdAt: '2026-07-11T11:00:00Z',
  },
  {
    id: 'e-5',
    tripId: 't-ubatuba',
    description: 'Jantar no quiosque',
    category: 'comida',
    amount: 41780,
    paidBy: 'u-rafa',
    splitType: 'equal',
    participants: ['u-pedro', 'u-marina', 'u-lucas', 'u-rafa'],
    createdAt: '2026-07-11T21:20:00Z',
  },
  {
    id: 'e-6',
    tripId: 't-ubatuba',
    description: 'Aluguel de pranchas de stand-up',
    category: 'lazer',
    amount: 16000,
    paidBy: 'u-pedro',
    splitType: 'percent',
    participants: ['u-pedro', 'u-lucas'],
    shares: { 'u-pedro': 50, 'u-lucas': 50 },
    createdAt: '2026-07-12T10:05:00Z',
  },

  // ---- Monte Verde ----
  {
    id: 'e-7',
    tripId: 't-monteverde',
    description: 'Reserva do chalé (sinal 50%)',
    category: 'hospedagem',
    amount: 84000,
    paidBy: 'u-pedro',
    splitType: 'equal',
    participants: ['u-pedro', 'u-bia', 'u-thiago', 'u-marina'],
    createdAt: '2026-06-29T12:00:00Z',
  },
  {
    id: 'e-8',
    tripId: 't-monteverde',
    description: 'Fondue no centrinho',
    category: 'comida',
    amount: 52000,
    paidBy: 'u-bia',
    splitType: 'equal',
    participants: ['u-pedro', 'u-bia', 'u-thiago', 'u-marina'],
    createdAt: '2026-07-01T20:30:00Z',
  },

  // ---- Churras ----
  {
    id: 'e-9',
    tripId: 't-churras',
    description: 'Carnes e carvão',
    category: 'comida',
    amount: 28900,
    paidBy: 'u-thiago',
    splitType: 'equal',
    participants: ['u-pedro', 'u-lucas', 'u-rafa', 'u-thiago'],
    createdAt: '2026-07-02T17:00:00Z',
  },
  {
    id: 'e-10',
    tripId: 't-churras',
    description: 'Bebidas e gelo',
    category: 'bebidas',
    amount: 15600,
    paidBy: 'u-pedro',
    splitType: 'equal',
    participants: ['u-pedro', 'u-lucas', 'u-rafa', 'u-thiago'],
    createdAt: '2026-07-02T17:30:00Z',
  },
];

export const seedPayments = [
  {
    id: 'p-1',
    tripId: 't-ubatuba',
    from: 'u-lucas',
    to: 'u-marina',
    amount: 30000,
    note: 'Pix (parte do Airbnb)',
    createdAt: '2026-07-01T09:12:00Z',
  },
];

export const seedFriends = ['u-marina', 'u-lucas', 'u-fernanda', 'u-rafa', 'u-bia', 'u-thiago'];
