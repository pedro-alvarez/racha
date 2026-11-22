/**
 * Botões para pagar sem digitar nada: copiar "chave + valor" (texto que a IA
 * do Nubank e outros assistentes entendem) ou o Pix copia e cola (código com
 * chave e valor, para a opção "Pix Copia e Cola" de qualquer banco).
 */
import { useState } from 'react';
import { Check, ClipboardCopy, QrCode } from 'lucide-react';
import { chavePix, pixCopiaECola, textoPix } from '../lib/pix';

export default function PixCopy({ to, amount, className = '' }) {
  const [copiado, setCopiado] = useState(null);
  if (!to?.pix?.key || !(amount > 0)) return null;

  const copiar = async (qual) => {
    const texto =
      qual === 'texto'
        ? textoPix({ name: to.name, type: to.pix.type, key: to.pix.key, amount })
        : pixCopiaECola({ key: chavePix(to.pix.type, to.pix.key), name: to.name, amount, info: 'Racha' });
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      /* sem área de transferência */
    }
  };

  const botao = (qual, Icone, rotulo) => (
    <button
      type="button"
      onClick={() => copiar(qual)}
      className={`flex-1 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
        copiado === qual ? 'bg-positive/20 text-positive' : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      {copiado === qual ? <Check size={14} /> : <Icone size={14} />}
      {copiado === qual ? 'Copiado!' : rotulo}
    </button>
  );

  return (
    <div className={`flex gap-2 ${className}`}>
      {botao('texto', ClipboardCopy, 'Chave + valor')}
      {botao('codigo', QrCode, 'Copia e cola')}
    </div>
  );
}
