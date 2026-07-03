/** Categorias de despesa com ícone (lucide) e rótulo pt-BR. */
import {
  Car,
  BedDouble,
  UtensilsCrossed,
  PartyPopper,
  Beer,
  ShoppingBag,
  Receipt,
  HandCoins,
} from 'lucide-react';

export const CATEGORIES = {
  transporte: { label: 'Transporte', Icon: Car },
  hospedagem: { label: 'Hospedagem', Icon: BedDouble },
  comida: { label: 'Comida', Icon: UtensilsCrossed },
  lazer: { label: 'Lazer', Icon: PartyPopper },
  bebidas: { label: 'Bebidas', Icon: Beer },
  compras: { label: 'Compras', Icon: ShoppingBag },
  outros: { label: 'Outros', Icon: Receipt },
};

export const PAYMENT_ICON = HandCoins;

export function categoryOf(key) {
  return CATEGORIES[key] ?? CATEGORIES.outros;
}
