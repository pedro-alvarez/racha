import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';

/**
 * Botão de ação flutuante rosa.
 * Renderizado via portal direto no <body>: ancestrais com transform/animação
 * (ex.: transição de página) "capturam" position:fixed — o portal evita isso.
 */
export default function Fab({ onClick, label = 'Adicionar despesa' }) {
  return createPortal(
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-24 right-5 md:bottom-10 md:right-10 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-bright text-white flex items-center justify-center shadow-fab active:scale-95 hover:scale-105 transition-transform fab-pop"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>,
    document.body
  );
}
