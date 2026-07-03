/** Categorias de despesa: ícone (lucide), rótulo pt-BR e cor própria. */
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
  transporte: { label: 'Transporte', Icon: Car, color: '#3B82F6' },
  hospedagem: { label: 'Hospedagem', Icon: BedDouble, color: '#8B5CF6' },
  comida: { label: 'Comida', Icon: UtensilsCrossed, color: '#F97316' },
  lazer: { label: 'Lazer', Icon: PartyPopper, color: '#EC4899' },
  bebidas: { label: 'Bebidas', Icon: Beer, color: '#EAB308' },
  compras: { label: 'Compras', Icon: ShoppingBag, color: '#06B6D4' },
  outros: { label: 'Outros', Icon: Receipt, color: '#9A93A8' },
};

export const PAYMENT_ICON = HandCoins;

export function categoryOf(key) {
  return CATEGORIES[key] ?? CATEGORIES.outros;
}
