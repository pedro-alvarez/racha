/**
 * Texto numa linha só que diminui a letra até caber na largura disponível
 * (valores grandes como "R$ 12.345,67" em cards de duas colunas).
 * O tamanho de partida vem das classes (ex.: text-3xl md:text-4xl); só encolhe
 * quando não cabe, até o mínimo.
 */
import { useLayoutEffect, useRef } from 'react';

export default function FitText({ as: Tag = 'p', className = '', min = 16, children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const caber = () => {
      el.style.fontSize = '';
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (size > min && el.scrollWidth > el.clientWidth + 0.5) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };
    caber();
    const obs = new ResizeObserver(caber);
    obs.observe(el);
    document.fonts?.ready.then(caber).catch(() => {});
    return () => obs.disconnect();
  }, [children, min]);

  return (
    <Tag ref={ref} className={`whitespace-nowrap overflow-hidden ${className}`}>
      {children}
    </Tag>
  );
}
