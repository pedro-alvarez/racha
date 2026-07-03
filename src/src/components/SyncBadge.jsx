/** Badge verde "Sincronizado" do header. */
export default function SyncBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-positive bg-positive/15">
      <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
      Sincronizado
    </span>
  );
}
