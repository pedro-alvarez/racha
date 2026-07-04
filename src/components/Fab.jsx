import { Plus } from 'lucide-react';

/** Botão de ação flutuante rosa. */
export default function Fab({ onClick, label = 'Adicionar despesa' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-24 right-5 md:bottom-10 md:right-10 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-bright text-white flex items-center justify-center shadow-fab active:scale-95 transition-transform fab-pop hover:scale-105"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}
