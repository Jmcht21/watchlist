import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Tv, Calendar, Star, UserPlus, UserMinus, Pin } from 'lucide-react';
import { getUserProfile, getUserPublicWatchlist, WatchlistItem, followUser, unfollowUser, isFollowing, UserProfile as UserProfileType } from '../services/db';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowingUser, setIsFollowingUser] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!uid) return;
      setLoading(true);
      
      const userProfile = await getUserProfile(uid);
      if (userProfile) {
        setProfile(userProfile);
        const items = await getUserPublicWatchlist(uid);
        setWatchlist(items);
        
        if (user && user.uid !== uid) {
          const following = await isFollowing(user.uid, uid);
          setIsFollowingUser(following);
        }
      }
      
      setLoading(false);
    };
    
    fetchUserData();
  }, [uid, user]);

  const handleToggleFollow = async () => {
    if (!user || !uid) return;
    
    if (isFollowingUser) {
      await unfollowUser(user.uid, uid);
    } else {
      await followUser(user.uid, uid);
    }
    
    setIsFollowingUser(!isFollowingUser);
    
    // Refresh profile to update stats
    const updatedProfile = await getUserProfile(uid);
    if (updatedProfile) setProfile(updatedProfile);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Chargement...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
        <h2 className="text-2xl font-bold mb-4">Utilisateur introuvable</h2>
        <button 
          onClick={() => navigate(-1)}
          className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-[0_0_15px_var(--theme-shadow)] hover:scale-105 transition-transform"
        >
          Retour
        </button>
      </div>
    );
  }

  const completedItems = watchlist.filter(item => item.status === 'completed');
  const watchingItems = watchlist.filter(item => item.status === 'watching');
  const favoriteItems = watchlist.filter(item => item.isFavorite);
  const pinnedItems = watchlist.filter(item => profile.pinnedMediaIds?.includes(item.mediaId.toString()));

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar relative">
      <div className="fixed inset-0 z-[-1] bg-[var(--theme-bg-glow)] opacity-30 blur-[120px] pointer-events-none"></div>

      <div className="p-4 flex items-center justify-between sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-heading font-bold text-white">Profil de {profile.displayName?.split(' ')[0]}</h1>
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
          <span className="text-xl font-heading font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/80 to-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            Watchlist
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-surface-dark shadow-[0_0_20px_var(--theme-shadow)] mb-4 relative">
            <img 
              src={profile.photoURL || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop'} 
              alt={profile.displayName} 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{profile.displayName}</h2>
          <p className="text-muted text-sm mb-4">{profile.email}</p>

          {user && user.uid !== uid && (
            <button 
              onClick={handleToggleFollow}
              className={`mb-6 px-8 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${
                isFollowingUser 
                  ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50' 
                  : 'bg-primary text-white shadow-[0_0_15px_var(--theme-shadow)] hover:scale-105'
              }`}
            >
              {isFollowingUser ? (
                <><UserMinus size={18} /> Ne plus suivre</>
              ) : (
                <><UserPlus size={18} /> Suivre</>
              )}
            </button>
          )}

          <div className="flex gap-4 justify-center w-full max-w-sm">
            <div className="flex flex-col items-center bg-surface-dark/50 p-3 rounded-2xl border border-white/5 flex-1">
              <span className="text-2xl font-heading font-bold text-white mb-0.5">{profile.stats?.followers || 0}</span>
              <span className="text-[10px] text-muted uppercase tracking-wider font-bold">Abonnés</span>
            </div>
            <div className="flex flex-col items-center bg-surface-dark/50 p-3 rounded-2xl border border-white/5 flex-1">
              <span className="text-2xl font-heading font-bold text-white mb-0.5">{profile.stats?.following || 0}</span>
              <span className="text-[10px] text-muted uppercase tracking-wider font-bold">Suivis</span>
            </div>
            <div className="flex flex-col items-center bg-surface-dark/50 p-3 rounded-2xl border border-white/5 flex-1">
              <span className="text-2xl font-heading font-bold text-white mb-0.5">{completedItems.length}</span>
              <span className="text-[10px] text-muted uppercase tracking-wider font-bold">Vus</span>
            </div>
          </div>
        </div>

        {pinnedItems.length > 0 && (
          <div className="mb-10">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Pin className="text-primary" size={20} /> 
              Épinglés
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {pinnedItems.map(item => (
                <div 
                  key={item.id} 
                  className="bg-surface-dark rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-primary/30 transition-colors group"
                  onClick={() => navigate(`/media/${item.type === 'series' ? 'tv' : 'movie'}/${item.mediaId}`)}
                >
                  <div className="relative aspect-[16/9]">
                    <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-transparent to-transparent"></div>
                    <div className="absolute bottom-2 left-3 right-3">
                      <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {favoriteItems.length > 0 && (
          <div className="mb-10">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="text-primary" size={20} fill="currentColor" /> 
              Favoris
            </h3>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-6 px-6">
              {favoriteItems.map(item => (
                <div 
                  key={item.id} 
                  className="snap-start flex-shrink-0 w-[140px] cursor-pointer"
                  onClick={() => navigate(`/media/${item.type === 'series' ? 'tv' : 'movie'}/${item.mediaId}`)}
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 mb-2 shadow-lg">
                    <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="text-sm font-medium text-white/90 truncate">{item.title}</h4>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xl font-bold text-white mb-4">Dernières activités</h3>
          <div className="space-y-4">
            {watchlist.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10).map(item => (
              <div 
                key={item.id} 
                className="bg-surface-dark rounded-xl p-4 border border-white/5 flex gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => navigate(`/media/${item.type === 'series' ? 'tv' : 'movie'}/${item.mediaId}`)}
              >
                <img src={item.posterUrl} alt={item.title} className="w-16 h-24 object-cover rounded-lg shadow-md" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/20 px-2 py-0.5 rounded">
                      {item.type === 'series' ? 'Série' : 'Film'}
                    </span>
                    <span className="text-[10px] text-muted">{new Date(item.updatedAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <h4 className="font-bold text-white mb-1 line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-muted">
                    {item.status === 'completed' ? 'A terminé de regarder' : 
                     item.status === 'watching' ? 'Regarde actuellement' : 'A ajouté à sa liste'}
                  </p>
                  
                  {item.review && (
                    <div className="mt-2 p-2 bg-black/30 rounded-lg border border-white/5">
                      <p className="text-xs text-white/80 italic line-clamp-2">"{item.review}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {watchlist.length === 0 && (
              <p className="text-center text-muted py-8">Aucune activité récente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
