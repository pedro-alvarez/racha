import { initials } from '../lib/format';

/** Avatar circular: foto (se houver) ou iniciais sobre a cor do usuário. */
export default function Avatar({ user, size = 'md', ring = false, className = '', onClick }) {
  const sizes = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`${sizes[size]} ${ring ? 'ring-2 ring-ink' : ''} rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0 ${onClick ? 'cursor-pointer hover:brightness-110 transition' : ''} ${className}`}
      style={{ background: `linear-gradient(135deg, ${user?.color ?? '#666'}, ${user?.color ?? '#666'}88)` }}
      title={user?.name}
    >
      {user?.photo ? (
        <img src={user.photo} alt={user?.name} className="w-full h-full object-cover" />
      ) : (
        initials(user?.name)
      )}
    </Tag>
  );
}
