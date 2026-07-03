import { useEffect, useState } from 'react';
import { Signal, Wifi, BatteryFull } from 'lucide-react';

/** Barra de status simulada (só aparece no mobile, reforça o clima de app). */
export default function StatusBar() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="md:hidden flex items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold text-white/90 select-none">
      <span>{time}</span>
      <div className="flex items-center gap-1.5">
        <Signal size={13} strokeWidth={2.5} />
        <Wifi size={14} strokeWidth={2.5} />
        <BatteryFull size={16} strokeWidth={2} />
      </div>
    </div>
  );
}
