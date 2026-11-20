/**
 * Comprovante de pagamento: escolher o arquivo (foto, print ou PDF), ver um
 * comprovante já enviado (link temporário, o bucket é privado) e anexar a um
 * pagamento já registrado.
 */
import { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, ReceiptText, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as dataService from '../lib/dataService';

const ACCEPT = 'image/*,application/pdf';

/** Botão "Ver comprovante". Abre a aba antes do await para o navegador não bloquear. */
export function ReceiptLink({ path, className = '', label = 'Ver comprovante' }) {
  const [busy, setBusy] = useState(false);
  if (!path) return null;
  const open = async () => {
    const tab = window.open('', '_blank');
    setBusy(true);
    try {
      const url = await dataService.getReceiptUrl(path);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (err) {
      tab?.close();
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 text-xs font-bold text-accent-bright hover:text-white transition disabled:opacity-50 ${className}`}
    >
      <ReceiptText size={14} /> {busy ? 'Abrindo…' : label}
    </button>
  );
}

/**
 * Campo para escolher o comprovante (pagamento) ou a nota fiscal (despesa).
 * existingPath: anexo já salvo (na edição), com ver e tirar.
 */
export function ReceiptPicker({ file, onChange, label = 'Anexar comprovante (opcional)', existingPath, onRemoveExisting }) {
  const input = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="mt-4 first:mt-0">
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      {file ? (
        <div className="card-flat p-3 flex items-center gap-3">
          {preview ? (
            <img src={preview} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <span className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-muted-light" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{file.name}</p>
            <p className="text-[11px] text-muted">Comprovante anexado</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Tirar comprovante"
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      ) : existingPath ? (
        <div className="card-flat p-3 flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <FileText size={20} className="text-muted-light" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Anexo salvo</p>
            <ReceiptLink path={existingPath} label="Ver" />
          </div>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="px-3 py-2 rounded-xl bg-white/5 text-xs font-bold text-muted-light hover:text-white"
          >
            Trocar
          </button>
          <button
            type="button"
            onClick={onRemoveExisting}
            aria-label="Tirar anexo"
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="w-full py-3 rounded-2xl border border-dashed border-white/15 text-sm font-semibold text-muted-light hover:text-white hover:border-white/30 transition flex items-center justify-center gap-2"
        >
          <Paperclip size={16} /> {label}
        </button>
      )}
    </div>
  );
}

/** Anexar comprovante a um pagamento que já foi registrado sem ele. */
export function AttachReceiptButton({ payment, className = '' }) {
  const { attachReceipt } = useApp();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          try {
            await attachReceipt(payment.id, payment.tripId, file);
          } catch (err) {
            alert(err.message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 text-xs font-bold text-muted-light hover:text-white transition disabled:opacity-50 ${className}`}
      >
        <Paperclip size={14} /> {busy ? 'Enviando…' : 'Anexar comprovante'}
      </button>
    </>
  );
}
