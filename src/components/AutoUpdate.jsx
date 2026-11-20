/**
 * AutoUpdate - quando sai versão nova do app, ele se atualiza sozinho.
 *
 * O celular guarda o app antigo (principalmente instalado na tela de início),
 * então de tempos em tempos o app lê /version.json sem cache. Se a versão
 * mudou, recarrega pedindo o endereço com ?v=<versão> (endereço novo = o
 * navegador não usa o index.html guardado). Espera a pessoa sair de um
 * formulário ou de uma janela aberta para não perder o que ela digitou.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const BASE = import.meta.env.BASE_URL;
const A_CADA = 60 * 1000;
const ROTA_COM_FORMULARIO = /nova-despesa|editar|criar-conta|bem-vindo|viagens\/nova|login|esqueci-senha|seguranca/;

async function versaoNoServidor() {
  try {
    const r = await fetch(`${BASE}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).versao ?? null;
  } catch {
    return null; // sem internet: tenta depois
  }
}

export default function AutoUpdate() {
  const { pathname } = useLocation();
  const nova = useRef(null);
  const rota = useRef(pathname);
  rota.current = pathname;

  // recarrega se houver versão nova e der para recarregar sem atrapalhar
  const tentar = () => {
    const v = nova.current;
    if (!v) return;
    // nunca no meio de um formulário ou com uma janela aberta: tenta ao mudar de tela
    if (ROTA_COM_FORMULARIO.test(rota.current) || document.querySelector('.sheet-up')) return;
    // evita laço: uma tentativa por versão nesta aba
    try {
      if (sessionStorage.getItem('racha-atualizou') === v) return;
      sessionStorage.setItem('racha-atualizou', v);
    } catch {
      /* sem sessionStorage: segue */
    }
    window.location.replace(`${BASE}?v=${encodeURIComponent(v)}${window.location.hash}`);
  };

  useEffect(() => {
    if (import.meta.env.DEV) return undefined;
    let vivo = true;
    const conferir = async () => {
      const v = await versaoNoServidor();
      if (!vivo) return;
      if (v && v !== __APP_VERSION__) {
        nova.current = v;
        tentar();
      }
    };
    conferir();
    const timer = setInterval(() => document.visibilityState === 'visible' && conferir(), A_CADA);
    const aoVoltar = () => document.visibilityState === 'visible' && conferir();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      vivo = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // saiu do formulário (mudou de tela): tenta de novo
  useEffect(() => {
    tentar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
