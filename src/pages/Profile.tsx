import React, { useState, useEffect, useMemo } from 'react';
import { Settings, SortDesc, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subscribeToWatchlist, WatchlistItem } from '../services/db';

const Profile = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Mon Coffre');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series'>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToWatchlist(user.uid, (items) => {
        setWatchlist(items);
      });
      return () => unsubscribe();
    } else {
      setWatchlist([]);
    }
  }, [user]);

  const watchedItems = useMemo(
    () => watchlist.filter(item => item.status === 'completed' || item.status === 'watching'),
    [watchlist]
  );

  const planToWatch = useMemo(
    () => watchlist.filter(item => item.status === 'plan_to_watch'),
    [watchlist]
  );

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    watchlist.forEach(item => {
      if (typeof item.genres === 'string') {
        item.genres.split(', ').forEach(g => { if (g) genres.add(g); });
      }
    });
    return Array.from(genres).sort();
  }, [watchlist]);

  const filteredAndSortedWatchedItems = useMemo(() => {
    let result = [...watchedItems];
    if (searchQuery) {
      result = result.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }
    if (filterGenre !== 'all') {
      result = result.filter(item => typeof item.genres === 'string' && item.genres.includes(filterGenre));
    }
    result.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      const dateA = a.watchedDate ? new Date(a.watchedDate).getTime() : new Date(a.updatedAt).getTime();
      const dateB = b.watchedDate ? new Date(b.watchedDate).getTime() : new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });
    return result;
  }, [watchedItems, searchQuery, sortBy, filterType, filterGenre]);

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold mb-4 text-center text-white">Connectez-vous pour accéder à votre coffre</h2>
        <button
          onClick={login}
          className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-[0_0_15px_var(--theme-shadow)]"
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-background-dark/90 backdrop-blur-xl border-b border-white/5 px-4 pt-12 pb-0">
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-heading font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/80 to-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            Watchlist
          </span>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-muted hover:text-primary hover:border-primary/40 transition-colors"
            aria-label="Paramètres"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="flex gap-6">
          {['Mon Coffre', 'Critiques'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-heading tracking-widest uppercase text-base whitespace-nowrap transition-colors relative ${
                activeTab === tab ? 'text-primary' : 'text-muted hover:text-text-light'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_8px_var(--theme-shadow)]"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-28">

        {/* ── CRITIQUES ── */}
        {activeTab === 'Critiques' && (
          <section className="flex flex-col gap-4">
            {watchlist.filter(item => item.review && item.review.trim() !== '').length === 0 ? (
              <div className="text-center py-16 bg-surface-dark/30 rounded-xl border border-dashed border-white/10">
                <p className="text-muted">Vous n'avez écrit aucune critique.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {watchlist
                  .filter(item => item.review && item.review.trim() !== '')
                  .map(item => (
                    <div key={`${item.mediaId}-${item.type}`} className="bg-surface-dark rounded-xl p-4 border border-white/5">
                      <div
                        className="flex items-center gap-3 mb-3 cursor-pointer"
                        onClick={() => navigate(`/media/${item.type === 'series' ? 'tv' : 'movie'}/${item.mediaId}`)}
                      >
                        <img
                          src={item.posterUrl || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1974&auto=format&fit=crop'}
                          alt={item.title}
                          className="w-10 h-14 rounded object-cover border border-white/10"
                        />
                        <div>
                          <p className="text-sm font-bold text-white hover:text-primary transition-colors">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-muted">{new Date(item.updatedAt).toLocaleDateString('fr-FR')}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.isReviewPublic !== false ? 'bg-green-500/20 text-green-400' : 'bg-surface text-muted'}`}>
                              {item.isReviewPublic !== false ? 'Publique' : 'Privée'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{item.review}</p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}

        {/* ── MON COFFRE ── */}
        {activeTab === 'Mon Coffre' && (
          <section className="flex flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher dans le coffre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-xl py-2 pl-9 pr-4 text-white placeholder-muted focus:outline-none focus:border-primary/50 text-sm"
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {(['all', 'movie', 'series'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${filterType === type ? 'bg-primary text-white' : 'bg-surface-dark text-muted hover:text-white'}`}
                    >
                      {type === 'all' ? 'Tout' : type === 'movie' ? 'Films' : 'Séries'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSortBy(sortBy === 'date' ? 'title' : 'date')}
                  className="text-primary text-xs uppercase tracking-wider font-bold flex items-center gap-1 hover:text-white transition-colors ml-4 whitespace-nowrap"
                >
                  <SortDesc size={14} /> {sortBy === 'date' ? 'Date' : 'Titre'}
                </button>
              </div>
              {allGenres.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setFilterGenre('all')}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-colors ${filterGenre === 'all' ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-transparent border-white/10 text-muted hover:text-white'}`}
                  >Tous</button>
                  {allGenres.map(genre => (
                    <button
                      key={genre}
                      onClick={() => setFilterGenre(genre)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-colors ${filterGenre === genre ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-transparent border-white/10 text-muted hover:text-white'}`}
                    >{genre}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Grid imposant – vus / en cours */}
            <div>
              <p className="text-xs text-muted uppercase tracking-widest font-heading mb-3">
                {filteredAndSortedWatchedItems.length} titre{filteredAndSortedWatchedItems.length !== 1 ? 's' : ''} vu{filteredAndSortedWatchedItems.length !== 1 ? 's' : ''} ou en cours
              </p>
              {filteredAndSortedWatchedItems.length === 0 ? (
                <div className="text-center py-16 text-muted bg-surface-dark/50 rounded-xl border border-white/5">
                  Aucun résultat.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredAndSortedWatchedItems.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden group relative cursor-pointer aspect-[2/3] border border-white/5 hover:border-primary/50 transition-all hover:scale-[1.02]"
                      onClick={() => navigate(`/media/${item.type === 'series' ? 'tv' : 'movie'}/${item.mediaId}`)}
                    >
                      <img
                        alt={item.title}
                        className="w-full h-full object-cover"
                        src={item.posterUrl || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1974&auto=format&fit=crop'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-xs font-bold text-white line-clamp-2 leading-tight">{item.title}</p>
                        {item.status === 'watching' && (
                          <span className="text-[10px] text-primary font-bold uppercase mt-1">En cours</span>
                        )}
                      </div>
                      {item.status === 'watching' && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--theme-shadow)]"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* À voir */}
            {planToWatch.length > 0 && (
              <div className="mt-2 pt-4 border-t border-white/5">
                <p className="text-xs text-muted uppercase tracking-widest font-heading mb-3">À voir ({planToWatch.length})</p>
                <div className="grid grid-cols-4 gap-2 opacity-60 hover:opacity-90 transition-opacity">
                  {planToWatch.map(item => (
                    <div
                      key={item.id}
                      className="rounded-lg overflow-hidden cursor-pointer aspect-[2/3]"
                      onClick={() => navigate(`/media/${item.type === 'series' ? 'tv' : 'movie'}/${item.mediaId}`)}
                    >
                      <img
                        alt={item.title}
                        className="w-full h-full object-cover"
                        src={item.posterUrl || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1974&auto=format&fit=crop'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
};

export default Profile;
