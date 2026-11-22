/**
 * Gaveta que sobe de baixo (no computador, janela no centro): fundo escuro,
 * alça, botão de fechar e Esc num lugar só.
 * Fechar pelo fundo, pelo X ou pelo Esc desce a gaveta antes de sumir.
 * A rolagem fica presa dentro dela (não arrasta a tela de trás) e o fim
 * respeita a área segura do iPhone.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SAIDA_MS = 200; // igual à animação .sheet-down

export default function Sheet({ onClose, children }) {
  const [saindo, setSaindo] = useState(false);
  const timer = useRef(null);

  const fechar = useCallback(() => {
    if (timer.current) return;
    setSaindo(true);
    timer.current = setTimeout(onClose, SAIDA_MS);
  }, [onClose]);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && fechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fechar]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <button
        aria-label="Fechar"
        onClick={fechar}
        className={`no-press absolute inset-0 bg-black/65 backdrop-blur-sm ${saindo ? 'overlay-out' : 'overlay-in'}`}
      />
      <div
        className={`sheet relative w-full max-w-lg overflow-y-auto overscroll-contain bg-ink-soft border border-white/10 rounded-t-3xl md:rounded-3xl p-6 ${
          saindo ? 'sheet-down pointer-events-none' : 'sheet-up'
        }`}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-white/15 mb-5 md:hidden" />
        <button
          onClick={fechar}
          className="hit-area absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white"
          aria-label="Fechar"
        >
          <X size={15} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
