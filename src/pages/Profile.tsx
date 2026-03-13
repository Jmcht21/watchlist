import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Cloud, Upload, Download, SortDesc, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { subscribeToWatchlist, WatchlistItem, addToWatchlist, updateWatchlistStatus } from '../services/db';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Profile = () => {
  const { user, login, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Mon Coffre');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series'>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleExport = () => {
    if (!watchlist.length) return;
    const dataStr = JSON.stringify(watchlist, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const exportFileDefaultName = `watchlist_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          let importedCount = 0;
          for (const item of importedData) {
            // Basic validation
            if (item.mediaId && item.type) {
              const docId = `${user.uid}_${item.type}_${item.mediaId}`;
              
              // Ensure we don't overwrite the user ID
              const newItem = { 
                ...item, 
                id: docId, 
                userId: user.uid,
                updatedAt: new Date().toISOString()
              };
              
              await setDoc(doc(db, 'watchlist', docId), newItem, { merge: true });
              importedCount++;
            }
          }
          alert(`Importation réussie ! ${importedCount} éléments importés.`);
        } else {
          alert('Format de fichier invalide. Le fichier doit contenir un tableau JSON.');
        }
      } catch (error) {
        console.error("Error importing data:", error);
        alert('Erreur lors de l\'importation. Vérifiez que le fichier est un JSON valide.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold mb-4 text-center text-white">Connectez-vous pour accéder à votre profil</h2>
        <button 
          onClick={login}
          className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-[0_0_15px_var(--theme-shadow)]"
        >
          Se connecter
        </button>
      </div>
    );
  }

  const planToWatch = watchlist.filter(item => item.status === 'plan_to_watch');
  const watchedItems = watchlist.filter(item => item.status === 'completed' || item.status === 'watching');
  
  const watchedCount = watchlist.filter(item => item.status === 'completed').length;
  const moviesCount = watchlist.filter(item => item.type === 'movie').length;
  const seriesCount = watchlist.filter(item => item.type === 'series').length;

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    watchlist.forEach(item => {
      if (item.genres) {
        if (typeof item.genres === 'string') {
          item.genres.split(', ').forEach(g => genres.add(g));
        } else if (Array.isArray(item.genres)) {
          // If it's an array of numbers, we can't easily get the names here,
          // but we can at least prevent the crash.
          // If it's an array of strings, we can add them.
          item.genres.forEach(g => {
            if (typeof g === 'string') genres.add(g);
          });
        }
      }
    });
    return Array.from(genres).sort();
  }, [watchlist]);

  const filteredAndSortedWatchedItems = useMemo(() => {
    let result = [...watchedItems];

    // Filter by search query
    if (searchQuery) {
      result = result.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }

    // Filter by genre
    if (filterGenre !== 'all') {
      result = result.filter(item => {
        if (typeof item.genres === 'string') {
          return item.genres.includes(filterGenre);
        } else if (Array.isArray(item.genres)) {
          return item.genres.includes(filterGenre as any);
        }
        return false;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else {
        // Sort by date (newest first)
        const dateA = a.watchedDate ? new Date(a.watchedDate).getTime() : new Date(a.updatedAt).getTime();
        const dateB = b.watchedDate ? new Date(b.watchedDate).getTime() : new Date(b.updatedAt).getTime();
        return dateB - dateA;
      }
    });

    return result;
  }, [watchedItems, searchQuery, sortBy, filterType, filterGenre]);

  return (
    <main className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto flex flex-col pt-8 pb-6 px-4 gap-8">
      <div className="flex flex-col gap-6 items-center w-full relative">
        <div className="absolute left-1/2 -translate-x-1/2 -top-4">
          <span className="text-2xl font-heading font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/80 to-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            Watchlist
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="relative">
            <div 
              className="bg-center bg-no-repeat bg-cover rounded-full h-28 w-28 ring-2 ring-surface-dark glow-primary" 
              style={{ backgroundImage: `url('${user.photoURL || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop'}')` }}
            ></div>
            <div className="absolute -bottom-1 -right-1 bg-accent text-black font-heading text-xs px-2 py-0.5 rounded uppercase tracking-wider font-bold">PRO</div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-text-light text-3xl font-heading font-bold leading-tight tracking-wide text-center uppercase">{user.displayName}</h1>
            <p className="text-muted text-sm font-medium leading-normal text-center mt-1">Inscrit(e) récemment</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-xs text-muted uppercase tracking-widest font-heading">Thème</p>
          <div className="flex gap-4 p-2 bg-surface-dark rounded-full">
            <button 
              onClick={() => setTheme('cyan')}
              aria-label="Thème Cyan" 
              className={`w-8 h-8 rounded-full bg-[#0a06f9] ${theme === 'cyan' ? 'ring-2 ring-text-light ring-offset-2 ring-offset-background-dark' : ''}`}
            ></button>
            <button 
              onClick={() => setTheme('matrix')}
              aria-label="Thème Matrix" 
              className={`w-8 h-8 rounded-full bg-[#00FF41] ${theme === 'matrix' ? 'ring-2 ring-text-light ring-offset-2 ring-offset-background-dark' : ''}`}
            ></button>
            <button 
              onClick={() => setTheme('pink')}
              aria-label="Thème Pink" 
              className={`w-8 h-8 rounded-full bg-[#FF00FF] ${theme === 'pink' ? 'ring-2 ring-text-light ring-offset-2 ring-offset-background-dark' : ''}`}
            ></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full">
        <div className="bg-surface-dark rounded-lg p-4 flex flex-col items-center justify-center gap-1 border border-surface-dark/50 hover:border-primary/30 transition-colors">
          <span className="text-primary font-heading text-3xl font-bold tracking-tight">{moviesCount}</span>
          <span className="text-muted text-xs uppercase tracking-wider font-semibold">Films</span>
        </div>
        <div className="bg-surface-dark rounded-lg p-4 flex flex-col items-center justify-center gap-1 border border-surface-dark/50 hover:border-primary/30 transition-colors">
          <span className="text-primary font-heading text-3xl font-bold tracking-tight">{seriesCount}</span>
          <span className="text-muted text-xs uppercase tracking-wider font-semibold">Séries</span>
        </div>
        <div className="bg-surface-dark rounded-lg p-4 flex flex-col items-center justify-center gap-1 border border-surface-dark/50 hover:border-primary/30 transition-colors">
          <span className="text-primary font-heading text-3xl font-bold tracking-tight">{watchedCount}</span>
          <span className="text-muted text-xs uppercase tracking-wider font-semibold">Terminés</span>
        </div>
      </div>

      <div className="w-full border-b border-surface-dark">
        <div className="flex gap-6 overflow-x-auto no-scrollbar w-full">
          {['Mon Coffre', 'Critiques', 'Paramètres'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-heading tracking-widest uppercase text-lg whitespace-nowrap transition-colors ${
                activeTab === tab 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted hover:text-text-light'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Critiques' && (
        <section className="flex flex-col gap-4 w-full mt-2">
          {watchlist.filter(item => item.review && item.review.trim() !== '').length === 0 ? (
            <div className="text-center py-12 bg-surface-dark/30 rounded-xl border border-dashed border-white/10">
              <p className="text-muted mb-2">Vous n'avez écrit aucune critique.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {watchlist.filter(item => item.review && item.review.trim() !== '').map(item => (
                <div key={`${item.mediaId}-${item.type}`} className="bg-surface-dark rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => navigate(`/media/${item.type === 'series' ? 'tv' : 'movie'}/${item.mediaId}`)}>
                    <img 
                      src={item.posterPath ? `https://image.tmdb.org/t/p/w92${item.posterPath}` : 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1974&auto=format&fit=crop'} 
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

      {activeTab === 'Paramètres' && (
        <section className="flex flex-col gap-4 w-full">
          <h2 className="text-sm text-muted uppercase tracking-widest font-heading mb-2">Gestion des données</h2>
          <div className="bg-surface-dark rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="text-muted" size={24} />
              <div>
                <p className="text-text-light font-semibold text-sm">Synchronisation Cloud</p>
                <p className="text-muted text-xs">Sauvegarde automatique</p>
              </div>
            </div>
            <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
              <input defaultChecked className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-text-light border-4 border-primary appearance-none cursor-pointer checked:right-0 right-6 z-10" id="sync-toggle" name="toggle" type="checkbox" />
              <label className="toggle-label block overflow-hidden h-6 rounded-full bg-primary/30 cursor-pointer" htmlFor="sync-toggle"></label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button 
              onClick={handleExport}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded border border-muted/30 text-text-light hover:bg-surface-dark hover:border-primary/50 transition-all font-heading tracking-wider uppercase text-sm"
            >
              <Upload size={20} /> Exporter JSON
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded border border-muted/30 text-text-light hover:bg-surface-dark hover:border-primary/50 transition-all font-heading tracking-wider uppercase text-sm"
            >
              <Download size={20} /> Importer JSON
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
            />
          </div>
          <button 
            onClick={handleLogout}
            className="mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded border border-danger/30 text-danger hover:bg-danger/10 transition-all font-heading tracking-wider uppercase text-sm"
          >
            Se déconnecter
          </button>
        </section>
      )}

      {activeTab === 'Mon Coffre' && (
        <section className="flex flex-col gap-6 w-full mt-2">
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher dans mon coffre..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-dark border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-muted focus:outline-none focus:border-primary/50 text-sm"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${filterType === 'all' ? 'bg-primary text-white' : 'bg-surface-dark text-muted hover:text-white'}`}
                >Tout</button>
                <button 
                  onClick={() => setFilterType('movie')}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${filterType === 'movie' ? 'bg-primary text-white' : 'bg-surface-dark text-muted hover:text-white'}`}
                >Films</button>
                <button 
                  onClick={() => setFilterType('series')}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${filterType === 'series' ? 'bg-primary text-white' : 'bg-surface-dark text-muted hover:text-white'}`}
                >Séries</button>
              </div>
              
              <button 
                onClick={() => setSortBy(sortBy === 'date' ? 'title' : 'date')}
                className="text-primary text-xs uppercase tracking-wider font-bold flex items-center gap-1 hover:text-white transition-colors ml-4 whitespace-nowrap"
                title={`Trier par ${sortBy === 'date' ? 'titre' : 'date'}`}
              >
                <SortDesc size={16} /> {sortBy === 'date' ? 'Date' : 'Titre'}
              </button>
            </div>

            {allGenres.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                  onClick={() => setFilterGenre('all')}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap border ${filterGenre === 'all' ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-transparent border-white/10 text-muted hover:text-white'}`}
                >Tous les genres</button>
                {allGenres.map(genre => (
                  <button 
                    key={genre}
                    onClick={() => setFilterGenre(genre)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap border ${filterGenre === genre ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-transparent border-white/10 text-muted hover:text-white'}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Watched Items Grid */}
          <div>
            <h2 className="text-sm text-muted uppercase tracking-widest font-heading mb-3">Déjà vus ou en cours ({filteredAndSortedWatchedItems.length})</h2>
            {filteredAndSortedWatchedItems.length === 0 ? (
              <div className="text-center py-8 text-muted bg-surface-dark/50 rounded-xl border border-white/5">
                Aucun résultat trouvé.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 w-full">
                {filteredAndSortedWatchedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="rounded-xl bg-surface-dark overflow-hidden group relative cursor-pointer aspect-[2/3] border border-white/5 hover:border-primary/50 transition-colors" 
                    onClick={() => navigate(`/media/${item.type === 'series' ? 'tv' : 'movie'}/${item.mediaId}`)}
                  >
                    <img 
                      alt={item.title} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                      src={item.posterUrl || `https://images.unsplash.com/photo-1546422904-90eab23c3d7e?q=80&w=2072&auto=format&fit=crop`} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <p className="text-xs font-bold text-white line-clamp-2 leading-tight">{item.title}</p>
                      {item.status === 'watching' && (
                        <span className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1">En cours</span>
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

          {/* Plan to Watch Grid */}
          <div className="mt-4 pt-6 border-t border-white/5">
            <h2 className="text-sm text-muted uppercase tracking-widest font-heading mb-3">À voir prochainement ({planToWatch.length})</h2>
            {planToWatch.length === 0 ? (
              <div className="text-center py-8 text-muted bg-surface-dark/50 rounded-xl border border-white/5">
                Votre liste d'attente est vide.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 w-full opacity-70 hover:opacity-100 transition-opacity">
                {planToWatch.map((item) => (
                  <div 
                    key={item.id} 
                    className="rounded-lg bg-surface-dark overflow-hidden group relative cursor-pointer aspect-[2/3]" 
                    onClick={() => navigate(`/media/${item.type === 'series' ? 'tv' : 'movie'}/${item.mediaId}`)}
                  >
                    <img 
                      alt={item.title} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                      src={item.posterUrl || `https://images.unsplash.com/photo-1546422904-90eab23c3d7e?q=80&w=2072&auto=format&fit=crop`} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>
      )}

    </main>
  );
};

export default Profile;
