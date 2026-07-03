/** Indicador de páginas (carrossel entre viagens). */
export default function TripDots({ trips, selectedId, onSelect }) {
  if (trips.length <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      {trips.map((t) => (
        <button
          key={t.id}
          aria-label={t.name}
          onClick={() => onSelect(t.id)}
          className={`h-1.5 rounded-full transition-all ${
            t.id === selectedId ? 'w-5 bg-accent' : 'w-1.5 bg-white/20 hover:bg-white/40'
          }`}
        />
      ))}
    </div>
  );
}
