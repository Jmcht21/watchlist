import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Tv, Users2, Plus, Search, SortDesc } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getWatchGroups, WatchGroup, getUserProfile, UserProfile } from '../services/db';
import { getMediaDetails, TMDBMedia, getImageUrl } from '../services/tmdb';

const GroupDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<WatchGroup | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [mediaItems, setMediaItems] = useState<(TMDBMedia & { recommendedBy?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series'>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!user || !id) return;
      
      setLoading(true);
      const groups = await getWatchGroups(user.uid);
      const currentGroup = groups.find(g => g.id === id);
      
      if (currentGroup) {
        setGroup(currentGroup);
        
        // Fetch members
        const memberProfiles = await Promise.all(
          currentGroup.members.map(memberId => getUserProfile(memberId))
        );
        setMembers(memberProfiles.filter(Boolean) as UserProfile[]);
        
        // Fetch media details
        const mediaPromises = currentGroup.mediaIds.map(async (mediaStr) => {
          let type = 'movie';
          let mediaId = mediaStr;
          let recommenderId = undefined;
          
          if (mediaStr.includes(':')) {
            const parts = mediaStr.split(':');
            type = parts[0];
            mediaId = parts[1];
            recommenderId = parts[2];
          }
          
          const details = await getMediaDetails(mediaId, type as 'movie' | 'tv');
          if (details) {
            return { ...details, recommendedBy: recommenderId, media_type: type };
          }
          return null;
        });
        
        const resolvedMedia = await Promise.all(mediaPromises);
        setMediaItems(resolvedMedia.filter(Boolean) as any[]);
      }
      
      setLoading(false);
    };
    
    fetchGroupData();
  }, [user, id]);

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    mediaItems.forEach(item => {
      if (item.genres) {
        item.genres.forEach(g => genres.add(g.name));
      }
    });
    return Array.from(genres).sort();
  }, [mediaItems]);

  const filteredMedia = useMemo(() => {
    let result = [...mediaItems];

    if (searchQuery) {
      result = result.filter(item => 
        (item.title || item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      result = result.filter(item => item.media_type === (filterType === 'series' ? 'tv' : 'movie'));
    }

    if (filterGenre !== 'all') {
      result = result.filter(item => 
        item.genres?.some(g => g.name === filterGenre)
      );
    }

    return result;
  }, [mediaItems, searchQuery, filterType, filterGenre]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!group) {
    return <div className="flex-1 flex items-center justify-center h-full text-muted">Groupe introuvable</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar pb-24 relative">
      <div className="pt-12 px-6 pb-4 sticky top-0 bg-[var(--theme-bg-glow)] backdrop-blur-xl z-20 border-b border-white/5">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-heading font-bold tracking-tight text-white drop-shadow-md truncate">{group.name}</h1>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {members.map(member => (
            <div key={member.uid} className="flex flex-col items-center gap-1 min-w-[60px]" title={member.displayName}>
              <img src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.uid}`} alt={member.displayName} className="w-10 h-10 rounded-full object-cover border-2 border-surface-dark" />
              <span className="text-[10px] text-muted truncate w-full text-center">{member.displayName?.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 flex-1 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher une recommandation..." 
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

        {filteredMedia.length === 0 ? (
          <div className="text-center py-12 bg-surface-dark/30 rounded-xl border border-dashed border-white/10">
            <p className="text-muted mb-2">Aucune recommandation trouvée.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredMedia.map(item => {
              const recommender = members.find(m => m.uid === item.recommendedBy);
              return (
                <div 
                  key={`${item.media_type}-${item.id}`} 
                  className="flex flex-col gap-2 cursor-pointer group"
                  onClick={() => navigate(`/media/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`)}
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-white/5 group-hover:border-primary/50 transition-colors">
                    <img 
                      src={getImageUrl(item.poster_path)} 
                      alt={item.title || item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                    
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                      <span className="text-accent">★</span> {(item.vote_average || 0).toFixed(1)}
                    </div>
                    
                    {recommender && (
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
                        <img src={recommender.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${recommender.uid}`} alt="recommender" className="w-5 h-5 rounded-full" />
                        <span className="text-[10px] text-white truncate font-medium">Recommandé par {recommender.displayName?.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{item.title || item.name}</h3>
                    <p className="text-[10px] text-muted uppercase tracking-wider">{item.media_type === 'tv' ? 'Série' : 'Film'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDetails;
