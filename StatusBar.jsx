import Avatar from './Avatar';

/** Avatares sobrepostos + badge "+N" para os que não couberam. */
export default function AvatarStack({ users = [], max = 4, size = 'sm' }) {
  const visible = users.slice(0, max);
  const rest = users.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((u) => (
        <Avatar key={u.id} user={u} size={size} ring />
      ))}
      {rest > 0 && (
        <div className="w-8 h-8 rounded-full bg-white/10 ring-2 ring-ink flex items-center justify-center text-[11px] font-semibold text-muted-light">
          +{rest}
        </div>
      )}
    </div>
  );
}
