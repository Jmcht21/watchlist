import React, { useEffect, useState } from 'react';
import { Bell, Search, Plus, Check, PlayCircle, TrendingUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTrending, TMDBMedia, getImageUrl, getMediaDetails } from '../services/tmdb';
import { subscribeToWatchlist, WatchlistItem, addToWatchlist, incrementEpisode, getGroupActivities, GroupActivity } from '../services/db';

const Home = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [trending, setTrending] = useState<TMDBMedia[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    const fetchTrending = async () => {
      const data = await getTrending();
      setTrending(data.slice(0, 10));
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToWatchlist(user.uid, (items) => {
        setWatchlist(items.filter(i => i.status !== 'completed'));
      });
      
      return () => unsubscribe();
    } else {
      setWatchlist([]);
    }
  }, [user]);

  const handleAddEpisode = async (e: React.MouseEvent, media: TMDBMedia | WatchlistItem) => {
    e.stopPropagation();
    if (!user) {
      login();
      return;
    }
    
    // If it's a TMDBMedia, add it to watchlist
    if ('media_type' in media) {
      const fullMedia = await getMediaDetails(String(media.id), media.media_type as 'movie' | 'tv');
      if (fullMedia) {
        await addToWatchlist(user.uid, fullMedia, 'watching');
      } else {
        await addToWatchlist(user.uid, media as TMDBMedia, 'watching');
      }
    } else {
      // It's already in watchlist, update progress
      await incrementEpisode(media as WatchlistItem);
    }
  };

  const displayItems = user && watchlist.length > 0 
    ? watchlist 
    : trending;

  const heroImage = displayItems.length > 0 
    ? ('posterUrl' in displayItems[0] ? displayItems[0].posterUrl : getImageUrl(displayItems[0].backdrop_path, 'original'))
    : 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop';

  const watchingSeries = watchlist.filter(item => item.type === 'series' && item.status === 'watching');

  if (!user) {
    return (
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 h-full overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full z-[-1]">
          <div 
            className="w-full h-full bg-cover bg-center transition-all duration-1000 opacity-40" 
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent"></div>
        </div>
        
        <div className="text-center max-w-md mx-auto flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center glow-primary mb-4">
            <Search className="text-primary" size={40} />
          </div>
          <h1 className="text-4xl font-heading font-bold text-white drop-shadow-lg uppercase tracking-wide">
            Votre Univers<br/><span className="text-primary">Cinématographique</span>
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            Suivez vos films et séries, découvrez les tendances, et partagez vos critiques avec vos amis.
          </p>
          <button 
            onClick={login}
            className="mt-4 bg-primary text-white font-bold py-4 px-10 rounded-full shadow-[0_0_20px_var(--theme-shadow)] hover:scale-105 transition-transform uppercase tracking-wider text-sm"
          >
            Commencer l'expérience
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex-1 flex flex-col pt-12 pb-24 px-4 h-full overflow-y-auto no-scrollbar">
      <div className="absolute top-0 left-0 w-full h-[60vh] z-[-1]">
        <div 
          className="w-full h-full bg-cover bg-center transition-all duration-1000" 
          style={{ backgroundImage: `url('${heroImage}')` }}
        ></div>
        <div className="absolute inset-0 hero-gradient"></div>
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      <header className="flex flex-col gap-6 mb-10">
        <div className="flex justify-center">
          <span className="text-2xl font-heading font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/80 to-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            Watchlist
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white drop-shadow-md">
              {user ? `Bonjour, ${user.displayName?.split(' ')[0] || 'Cinéphile'}` : 'Bonjour, Cinéphile'}
            </h1>
            <p className="text-xs text-muted drop-shadow-md">Prêt pour une nouvelle séance ?</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center my-12 text-center">
        <h2 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">Qu'avez-vous vu aujourd'hui ?</h2>
        <div 
          className="w-full max-w-md h-14 bg-surface/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-6 shadow-2xl cursor-text ring-1 ring-white/5"
          onClick={() => navigate('/search')}
        >
          <Search className="text-primary mr-3 neon-shadow" size={24} />
          <input 
            className="bg-transparent border-none focus:ring-0 text-white placeholder-muted w-full font-medium text-[15px] outline-none pointer-events-none" 
            placeholder="Rechercher un film, une série..." 
            readOnly 
            type="text" 
          />
        </div>
      </div>

      <section className="mt-auto mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4 uppercase drop-shadow-md text-white">
          {user && watchlist.length > 0 ? "Reprenez où vous en étiez" : "Tendances du moment"}
        </h2>
        
        {!import.meta.env.VITE_TMDB_API_KEY && !user && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm mb-4">
            Clé API TMDB manquante. Veuillez configurer VITE_TMDB_API_KEY.
          </div>
        )}

        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-4 px-4">
          {displayItems.map((item: any) => {
            const isWatchlistItem = 'status' in item;
            const id = isWatchlistItem ? item.mediaId : item.id;
            const type = isWatchlistItem ? item.type : (item.media_type === 'tv' ? 'series' : 'movie');
            const title = item.title || item.name;
            const poster = isWatchlistItem ? item.posterUrl : getImageUrl(item.poster_path, 'w500');
            const isSeries = type === 'series' || type === 'tv';
            
            return (
              <div 
                key={isWatchlistItem ? item.id : id} 
                className="snap-start flex-shrink-0 w-[160px] flex flex-col gap-2 cursor-pointer" 
                onClick={() => navigate(`/media/${type === 'series' ? 'tv' : 'movie'}/${id}`)}
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 group bg-surface">
                  <img alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={poster} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  
                  {isWatchlistItem && isSeries && (
                    <div className="absolute bottom-2 left-0 w-full px-2">
                      <div className="flex justify-between text-[10px] font-bold text-white mb-1 drop-shadow-md">
                        <span>EP {item.episodesWatched || 0}</span>
                        <span>/ {item.totalEpisodes || '?'}</span>
                      </div>
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary shadow-[0_0_8px_var(--theme-shadow)]" 
                          style={{ width: `${item.totalEpisodes ? Math.min(100, ((item.episodesWatched || 0) / item.totalEpisodes) * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-bold bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-full">
                      {isSeries ? 'Série' : 'Film'}
                    </span>
                  </div>
                </div>
                
                {(!isWatchlistItem || isSeries) && (
                  <button 
                    onClick={(e) => handleAddEpisode(e, item)}
                    className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border border-white/5 text-white"
                  >
                    {isWatchlistItem && isSeries ? (
                      <><Plus size={14} /> +1 ÉPISODE</>
                    ) : (
                      <><Plus size={14} /> AJOUTER</>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Suivi Modal */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background-dark/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="pt-12 px-6 pb-4 border-b border-white/10 bg-[var(--theme-bg-glow)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold text-white">Suivi des séries</h2>
              <button onClick={() => setIsNotifOpen(false)} className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-4">
              {watchingSeries.length === 0 ? (
                <div className="text-center py-10 text-muted">
                  Vous n'avez aucune série en cours.
                </div>
              ) : (
                watchingSeries.map(item => {
                  const progressPercent = item.totalEpisodes ? Math.min(100, Math.round(((item.episodesWatched || 0) / item.totalEpisodes) * 100)) : 0;
                  
                  return (
                    <div key={item.id} className="bg-surface-dark rounded-xl p-4 border border-white/5 flex gap-4 items-center">
                      <img src={item.posterUrl} alt={item.title} className="w-16 h-24 object-cover rounded-lg shadow-md cursor-pointer" onClick={() => { setIsNotifOpen(false); navigate(`/media/tv/${item.mediaId}`); }} />
                      <div className="flex-1">
                        <h4 className="font-bold text-white mb-1 line-clamp-1">{item.title}</h4>
                        <div className="flex justify-between text-xs text-muted mb-2 font-medium">
                          <span>Progression</span>
                          <span className="text-primary">{item.episodesWatched || 0} / {item.totalEpisodes || '?'} épisodes</span>
                        </div>
                        <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden mb-3">
                          <div className="h-full bg-primary shadow-[0_0_10px_var(--theme-shadow)] transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <button 
                          onClick={() => handleAddEpisode({ stopPropagation: () => {} } as any, item)}
                          className="w-full py-2 rounded-lg bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider hover:bg-primary/30 transition-colors border border-primary/20"
                        >
                          +1 Épisode
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
