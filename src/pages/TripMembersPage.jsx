/**
 * Membros da viagem/rolê - ver quem está dentro e (criador ou admin)
 * adicionar gente depois da criação.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { firstName } from '../lib/format';

export default function TripMembersPage() {
  const { tripId } = useParams();
  const { trips, users, friends, userById, currentUser, addTripMembers } = useApp();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState('');

  const trip = trips.find((t) => t.id === tripId);
  if (!trip) return null;

  const isAdmin = currentUser?.role === 'admin';
  const canManage = isAdmin || trip.createdBy === currentUser?.id;

  // candidatos: amigos (ou todo mundo, se admin) que ainda não são membros
  const pool = isAdmin ? users : friends;
  const candidates = pool.filter(
    (u) => !trip.members.includes(u.id) && u.id !== currentUser?.id
  );

  const handleAdd = async (user) => {
    setAdding(user.id);
    setError('');
    try {
      await addTripMembers(trip.id, [user.id]);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="pt-4 md:pt-0">
      <button
        onClick={() => navigate(`/viagem/${trip.id}`)}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-white"
      >
        <ArrowLeft size={16} /> {trip.emoji} {trip.name}
      </button>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Membros</h1>

      <p className="label-caps mt-6">No grupo ({trip.members.length})</p>
      <ul className="mt-3 space-y-2.5 stagger">
        {trip.members.map((id) => {
          const member = userById(id);
          const isCreator = id === trip.createdBy;
          return (
            <li key={id}>
              <button
                onClick={() => navigate(`/perfil/${id}`)}
                className="w-full card-flat p-4 flex items-center gap-3 text-left hover:bg-white/5 transition"
              >
                <Avatar user={member} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {id === currentUser?.id ? 'Você' : member.name}
                  </p>
                  <p className="text-xs text-muted truncate">{member.email}</p>
                </div>
                {isCreator && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/15 text-amber-300">
                    <Crown size={11} /> Criador
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {canManage && (
        <>
          <p className="label-caps mt-7">Adicionar pessoas</p>
          {candidates.length === 0 ? (
            <div className="card-flat p-5 mt-3 text-sm text-muted text-center">
              Todo mundo que você conhece já está no grupo 🎉
            </div>
          ) : (
            <ul className="mt-3 space-y-2.5 stagger">
              {candidates.map((u) => (
                <li key={u.id} className="card-flat p-4 flex items-center gap-3">
                  <Avatar user={u} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{u.name}</p>
                    <p className="text-xs text-muted truncate">{u.email}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(u)}
                    disabled={adding === u.id}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-br from-accent to-accent-bright text-xs font-bold disabled:opacity-50 shrink-0"
                  >
                    <UserPlus size={13} />
                    {adding === u.id ? 'Adicionando…' : 'Adicionar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-3 text-sm text-accent-bright">{error}</p>}
        </>
      )}
    </div>
  );
}
