import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, Star, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchMedia, TMDBMedia, getImageUrl, getTrending } from '../services/tmdb';

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Tout');
  const [results, setResults] = useState<TMDBMedia[]>([]);
  const [trending, setTrending] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(false);

  const filters = ['Tout', 'Films', 'Séries'];

  useEffect(() => {
    const fetchTrending = async () => {
      const data = await getTrending();
      setTrending(data.slice(0, 10)); // Show top 10 trending
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        const data = await searchMedia(query);
        setResults(data);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const filteredResults = results.filter(r => {
    if (filter === 'Tout') return true;
    if (filter === 'Films') return r.media_type === 'movie';
    if (filter === 'Séries') return r.media_type === 'tv';
    return true;
  });

  const displayList = query.trim().length > 1 ? filteredResults : trending;

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col pb-24">
      <header className="sticky top-0 z-10 bg-[var(--theme-bg-glow)] backdrop-blur-xl pt-12 pb-4 px-4 border-b border-white/5">
        <div className="absolute left-1/2 -translate-x-1/2 top-4">
          <span className="text-xl font-heading font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/80 to-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            Watchlist
          </span>
        </div>
        <div className="flex flex-col gap-4 w-full mt-4">
          <label className="flex flex-col h-14 w-full relative">
            <div className="flex w-full flex-1 items-stretch rounded-full h-full bg-surface-dark border border-surface-dark focus-within:border-primary focus-within:shadow-[0_0_8px_var(--theme-shadow)] transition-all duration-200">
              <div className="text-muted-dark flex items-center justify-center pl-5 rounded-l-full">
                <SearchIcon size={24} />
              </div>
              <input 
                autoFocus 
                className="flex w-full min-w-0 flex-1 bg-transparent border-none text-slate-100 focus:outline-none focus:ring-0 placeholder:text-muted-dark px-3 text-base font-medium" 
                placeholder="Rechercher un film, une série..." 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center justify-center pr-3">
                <button 
                  onClick={() => setQuery('')}
                  className="flex items-center justify-center w-10 h-10 rounded-full text-muted-dark hover:text-slate-100 transition-colors bg-transparent focus:outline-none"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </label>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filters.map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-4 h-8 rounded-full border text-[13px] font-medium transition-colors ${
                  filter === f 
                    ? 'border-primary bg-primary/10 text-primary font-semibold tracking-wide' 
                    : 'border-surface-dark bg-surface-dark text-muted-dark hover:text-slate-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3">
        {!import.meta.env.VITE_TMDB_API_KEY && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
            Clé API TMDB manquante. Veuillez configurer VITE_TMDB_API_KEY dans vos variables d'environnement.
          </div>
        )}
        
        {loading && <div className="text-center text-muted py-8">Recherche en cours...</div>}
        
        {!loading && query && filteredResults.length === 0 && (
          <div className="text-center text-muted py-8">Aucun résultat trouvé pour "{query}"</div>
        )}

        {!query && trending.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-3 text-white font-bold">
            <TrendingUp size={20} className="text-primary" />
            <h2>Tendances actuelles</h2>
          </div>
        )}

        {!loading && displayList.map(result => (
          <div 
            key={result.id}
            onClick={() => navigate(`/media/${result.media_type}/${result.id}`)}
            className="group flex items-center gap-4 p-2 rounded-lg hover:bg-surface-dark/50 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <div className="w-[50px] h-[75px] shrink-0 rounded bg-surface-dark overflow-hidden relative">
              <img alt={result.title || result.name} className="w-full h-full object-cover" src={getImageUrl(result.poster_path, 'w500')} />
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent"></div>
            </div>
            <div className="flex flex-col flex-1 min-w-0 justify-center">
              <h3 className="text-base font-bold text-slate-100 truncate tracking-tight">{result.title || result.name}</h3>
              <div className="flex items-center gap-2 mt-1 text-[13px] text-muted-dark font-medium">
                <span>{(result.release_date || result.first_air_date || '').substring(0, 4)}</span>
                <span className="w-1 h-1 rounded-full bg-muted-dark/50"></span>
                <span>{result.media_type === 'movie' ? 'Film' : 'Série'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 bg-surface-dark px-2 py-1 rounded">
              <Star size={14} fill="currentColor" className="text-accent" />
              <span className="text-[13px] font-bold text-slate-100">{result.vote_average ? result.vote_average.toFixed(1) : 'N/A'}</span>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default Search;
