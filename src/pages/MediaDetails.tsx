import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MoreVertical, ChevronDown, Check, Edit, Star, Plus, X, Calendar, PlayCircle, Send, Pin, Users2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMediaDetails, TMDBMedia, getImageUrl, getSeasonDetails, TMDBSeason } from '../services/tmdb';
import { addToWatchlist, removeFromWatchlist, subscribeToWatchlist, WatchlistItem, updateWatchlistStatus, getMediaReviews, togglePinMedia, getUserProfile, getFollowedUsers, getWatchGroups, addMediaToGroup } from '../services/db';

const MediaDetails = () => {
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: 'movie' | 'tv', id: string }>();
  const { user, login } = useAuth();
  
  const [activeTab, setActiveTab] = useState('Détails');
  const [media, setMedia] = useState<TMDBMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlistItem, setWatchlistItem] = useState<WatchlistItem | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [watchedDate, setWatchedDate] = useState<string>('');
  const [episodesWatched, setEpisodesWatched] = useState<number>(0);
  const [seasonsWatched, setSeasonsWatched] = useState<number>(0);
  
  // Reviews state
  const [reviewText, setReviewText] = useState('');
  const [isReviewPublic, setIsReviewPublic] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [communityReviews, setCommunityReviews] = useState<any[]>([]);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [showOnlyFollowed, setShowOnlyFollowed] = useState(false);

  // Pin state
  const [isPinned, setIsPinned] = useState(false);

  // Group state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [userGroups, setUserGroups] = useState<any[]>([]);

  // Season tracking state
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonData, setSeasonData] = useState<any>(null);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (id && type) {
        setLoading(true);
        const data = await getMediaDetails(id, type);
        setMedia(data);
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, type]);

  useEffect(() => {
    const fetchSeason = async () => {
      if (type === 'tv' && id && selectedSeason) {
        setIsLoadingSeason(true);
        const data = await getSeasonDetails(id, selectedSeason);
        setSeasonData(data);
        setIsLoadingSeason(false);
      }
    };
    fetchSeason();
  }, [id, type, selectedSeason]);

  const [isEditingReview, setIsEditingReview] = useState(false);
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);

  useEffect(() => {
    if (user && id && type) {
      const unsubscribe = subscribeToWatchlist(user.uid, (items) => {
        const item = items.find(i => i.mediaId === id && i.type === (type === 'tv' ? 'series' : 'movie'));
        setWatchlistItem(item || null);
        if (item) {
          if (item.watchedDate) setWatchedDate(item.watchedDate);
          if (item.episodesWatched !== undefined) setEpisodesWatched(item.episodesWatched);
          if (item.seasonsWatched !== undefined) setSeasonsWatched(item.seasonsWatched);
          if (item.review) {
            setReviewText(item.review);
            setIsReviewPublic(item.isReviewPublic !== false); // default to true
            setIsEditingReview(false);
          } else {
            setIsEditingReview(true);
          }
        }
      });

      // Check if pinned
      getUserProfile(user.uid).then(profile => {
        if (profile) {
          setIsPinned(profile.pinnedMediaIds?.includes(id) || false);
        }
      });

      // Get followed users for filtering reviews
      getFollowedUsers(user.uid).then(followed => {
        setFollowedUserIds(followed.map(f => f.uid));
      });

      // Get user groups
      getWatchGroups(user.uid).then(groups => {
        setUserGroups(groups);
      });

      return () => unsubscribe();
    }
  }, [user, id, type]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (id && activeTab === 'Critiques') {
        const reviews = await getMediaReviews(id);
        setCommunityReviews(reviews);
      }
    };
    fetchReviews();
  }, [id, activeTab]);

  const handleToggleWatchlist = async () => {
    if (!user) {
      login();
      return;
    }
    if (!media || !id || !type) return;

    if (watchlistItem) {
      await removeFromWatchlist(user.uid, id, type);
    } else {
      await addToWatchlist(user.uid, media, 'plan_to_watch');
    }
  };

  const handleStatusChange = async (newStatus: WatchlistItem['status']) => {
    if (!user || !id || !type) return;
    
    const extraData: Partial<WatchlistItem> = {};
    
    if (newStatus === 'completed' && type === 'movie' && !watchedDate) {
      // Set today's date by default if completed
      extraData.watchedDate = new Date().toISOString().split('T')[0];
    }

    await updateWatchlistStatus(user.uid, id, type, newStatus, extraData);
    setIsStatusModalOpen(false);
  };

  const isEpisodeWatched = (episodeNumber: number) => {
    if (!watchlistItem?.watchedEpisodesMap) return false;
    return watchlistItem.watchedEpisodesMap[selectedSeason]?.includes(episodeNumber) || false;
  };

  const handleToggleEpisode = async (episodeNumber: number) => {
    if (!user || !id || !type || !watchlistItem) return;

    const currentMap = watchlistItem.watchedEpisodesMap || {};
    const seasonEpisodes = currentMap[selectedSeason] || [];
    
    let newSeasonEpisodes;
    if (seasonEpisodes.includes(episodeNumber)) {
      newSeasonEpisodes = seasonEpisodes.filter(ep => ep !== episodeNumber);
    } else {
      newSeasonEpisodes = [...seasonEpisodes, episodeNumber];
    }

    const newMap = { ...currentMap, [selectedSeason]: newSeasonEpisodes };
    
    // Calculate total episodes watched
    let totalWatched = 0;
    (Object.values(newMap) as number[][]).forEach(eps => {
      totalWatched += eps.length;
    });

    const extraData: Partial<WatchlistItem> = {
      watchedEpisodesMap: newMap,
      episodesWatched: totalWatched
    };

    if (media?.number_of_episodes && totalWatched >= media.number_of_episodes) {
      extraData.status = 'completed';
    } else if (watchlistItem.status === 'plan_to_watch' && totalWatched > 0) {
      extraData.status = 'watching';
    }

    await updateWatchlistStatus(user.uid, id, type, extraData.status || watchlistItem.status, extraData);
  };

  const handleAddOneEpisode = async () => {
    if (!user || !id || !type || !watchlistItem || !seasonData) return;

    const currentMap = watchlistItem.watchedEpisodesMap || {};
    const seasonEpisodes = currentMap[selectedSeason] || [];
    
    // Find first unwatched episode
    const allEpisodes = seasonData.episodes.map((ep: any) => ep.episode_number);
    const nextEpisode = allEpisodes.find((ep: number) => !seasonEpisodes.includes(ep));

    if (nextEpisode !== undefined) {
      await handleToggleEpisode(nextEpisode);
    }
  };

  const handleSaveTracking = async () => {
    if (!user || !id || !type || !watchlistItem) return;
    
    const extraData: Partial<WatchlistItem> = {};
    if (type === 'movie') {
      extraData.watchedDate = watchedDate;
    } else {
      extraData.episodesWatched = episodesWatched;
      extraData.seasonsWatched = seasonsWatched;
      
      // Auto-complete if all episodes watched
      if (media?.number_of_episodes && episodesWatched >= media.number_of_episodes) {
        extraData.status = 'completed';
      }
    }
    
    await updateWatchlistStatus(user.uid, id, type, watchlistItem.status, extraData);
    setIsStatusModalOpen(false);
  };

  const handleSubmitReview = async () => {
    if (!user || !id || !type || !watchlistItem || !reviewText.trim()) return;
    
    setIsSubmittingReview(true);
    await updateWatchlistStatus(user.uid, id, type, watchlistItem.status, { 
      review: reviewText.trim(),
      isReviewPublic: isReviewPublic
    });
    setIsSubmittingReview(false);
    setIsEditingReview(false);
    setShowReviewSuccess(true);
    
    setTimeout(() => {
      setShowReviewSuccess(false);
    }, 3000);
    
    // Refresh reviews
    const reviews = await getMediaReviews(id);
    setCommunityReviews(reviews);
  };

  const handleToggleFavorite = async () => {
    if (!user || !id || !type || !watchlistItem) return;
    await updateWatchlistStatus(user.uid, id, type, watchlistItem.status, { isFavorite: !watchlistItem.isFavorite });
  };

  const handleTogglePin = async () => {
    if (!user || !id) return;
    const pinned = await togglePinMedia(user.uid, id);
    setIsPinned(pinned);
  };

  const handleAddToGroup = async (groupId: string) => {
    if (!user || !id || !media) return;
    const title = media.title || media.name || 'Inconnu';
    const posterUrl = getImageUrl(media.poster_path, 'w500');
    const success = await addMediaToGroup(groupId, id, type as 'movie' | 'tv', user.uid, title, posterUrl);
    if (success) {
      setIsGroupModalOpen(false);
      // Could show a success toast here
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Chargement...</div>;
  }

  if (!media) {
    return <div className="min-h-screen flex items-center justify-center text-white">Média introuvable</div>;
  }

  const title = media.title || media.name;
  const year = (media.release_date || media.first_air_date || '').substring(0, 4);
  const genres = media.genres?.map(g => g.name).join(', ') || '';

  const filteredReviews = showOnlyFollowed 
    ? communityReviews.filter(r => followedUserIds.includes(r.user?.id))
    : communityReviews;

  return (
    <div className="relative w-full h-screen overflow-hidden parallax-container">
      {/* Global Theme Blur Background */}
      <div className="fixed inset-0 z-[-1] bg-[var(--theme-bg-glow)] opacity-30 blur-[120px] pointer-events-none"></div>

      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors z-10"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-xl font-heading font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/80 to-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            Watchlist
          </span>
        </div>

        <div className="flex gap-3 z-10">
          {user && (
            <button 
              onClick={handleTogglePin}
              className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md transition-colors ${
                isPinned ? 'bg-primary text-white shadow-[0_0_15px_var(--theme-shadow)]' : 'bg-black/40 text-white hover:bg-black/60'
              }`}
              title="Épingler sur mon profil"
            >
              <Pin size={20} fill={isPinned ? "currentColor" : "none"} />
            </button>
          )}
          <button 
            onClick={handleToggleWatchlist}
            className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md transition-colors ${
              watchlistItem ? 'bg-primary text-white shadow-[0_0_15px_var(--theme-shadow)]' : 'bg-black/40 text-white hover:bg-black/60'
            }`}
          >
            <Heart size={24} fill={watchlistItem ? "currentColor" : "none"} />
          </button>
          {user && (
            <button 
              onClick={() => setIsGroupModalOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
              title="Partager à un groupe"
            >
              <MoreVertical size={24} />
            </button>
          )}
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-[50vh] parallax-layer-back">
        <div 
          className="w-full h-full bg-cover bg-center" 
          style={{ backgroundImage: `url('${getImageUrl(media.backdrop_path || media.poster_path, 'original')}')` }}
        ></div>
        <div className="absolute inset-0 hero-gradient"></div>
      </div>

      <div className="relative h-full pt-[35vh] pb-16 overflow-y-auto no-scrollbar">
        <div className="px-5">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold tracking-wider uppercase text-primary bg-primary/20 px-2 py-1 rounded">
                {type === 'tv' ? 'Série' : 'Film'}
              </span>
              <span className="text-sm text-muted">{year}</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 leading-none text-white">{title}</h1>
            <p className="text-xs text-muted mb-3 font-medium uppercase tracking-wide">{genres}</p>
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-1 text-accent">
                <Star size={18} fill="currentColor" />
                <span className="text-white">{media.vote_average ? media.vote_average.toFixed(1) : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex border-b border-surface-dark mb-6">
            {['Détails', 'Suivi', 'Critiques'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 pb-3 text-sm transition-colors relative ${
                  activeTab === tab 
                    ? 'font-bold text-primary' 
                    : 'font-semibold text-muted hover:text-white'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_8px_var(--theme-shadow)]"></div>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'Détails' && (
            <div className="space-y-6 text-white/80 leading-relaxed">
              <p>{media.overview || "Aucune description disponible."}</p>
            </div>
          )}

          {activeTab === 'Suivi' && (
            <div className="space-y-6">
              {!watchlistItem ? (
                <div className="text-center py-8">
                  <p className="text-muted mb-4">Ajoutez ce titre à votre coffre pour suivre votre progression.</p>
                  <button 
                    onClick={handleToggleWatchlist}
                    className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-[0_0_15px_var(--theme-shadow)] hover:scale-105 transition-transform"
                  >
                    Ajouter au coffre
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="bg-surface/50 backdrop-blur-md rounded-xl p-5 border border-white/5">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">Statut</h3>
                        <select 
                          value={watchlistItem.status}
                          onChange={(e) => handleStatusChange(e.target.value as any)}
                          className="bg-transparent text-primary mt-1 capitalize font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="plan_to_watch" className="bg-surface-dark">À voir</option>
                          <option value="watching" className="bg-surface-dark">En cours</option>
                          <option value="completed" className="bg-surface-dark">Terminé</option>
                        </select>
                      </div>
                    </div>
                    
                    {type === 'movie' && watchlistItem.status === 'completed' && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm text-muted mb-2 flex items-center gap-2"><Calendar size={16} /> Date de visionnage</p>
                        <p className="text-white font-medium">{watchlistItem.watchedDate ? new Date(watchlistItem.watchedDate).toLocaleDateString('fr-FR') : 'Non renseignée'}</p>
                      </div>
                    )}

                    {type === 'tv' && watchlistItem.status !== 'plan_to_watch' && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-bold text-white">Saison {selectedSeason}</h3>
                          <select 
                            value={selectedSeason} 
                            onChange={(e) => setSelectedSeason(Number(e.target.value))}
                            className="bg-surface border border-white/10 rounded-full px-3 py-1 text-sm text-white focus:outline-none"
                          >
                            {media.seasons?.filter(s => s.season_number > 0).map(s => (
                              <option key={s.id} value={s.season_number}>S{s.season_number}</option>
                            ))}
                          </select>
                        </div>
                        
                        {isLoadingSeason ? (
                          <div className="py-4 text-center text-muted text-sm">Chargement de la saison...</div>
                        ) : seasonData ? (
                          <>
                            <p className="text-sm text-muted mb-4">
                              {watchlistItem.watchedEpisodesMap?.[selectedSeason]?.length || 0} sur {seasonData.episodes?.length || 0} épisodes regardés
                            </p>
                            
                            <div className="w-full bg-surface h-2 rounded-full mb-6 overflow-hidden">
                              <div 
                                className="bg-primary h-full rounded-full transition-all" 
                                style={{ width: `${((watchlistItem.watchedEpisodesMap?.[selectedSeason]?.length || 0) / (seasonData.episodes?.length || 1)) * 100}%` }}
                              ></div>
                            </div>

                            <button 
                              onClick={handleAddOneEpisode}
                              className="w-full py-3 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors border border-primary/20 mb-6"
                            >
                              <Plus size={18} /> 1 ÉPISODE
                            </button>

                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                              {seasonData.episodes?.map((ep: any) => (
                                <div key={ep.id} className="flex items-center gap-4">
                                  <span className="text-lg font-bold text-muted w-6 text-center">{ep.episode_number}</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-white line-clamp-1">{ep.name}</p>
                                    <p className="text-xs text-muted">{ep.runtime || '?'} min</p>
                                  </div>
                                  <button 
                                    onClick={() => handleToggleEpisode(ep.episode_number)}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                      isEpisodeWatched(ep.episode_number) ? 'bg-primary text-white' : 'bg-surface border border-white/20 text-transparent hover:border-primary/50'
                                    }`}
                                  >
                                    <Check size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="py-4 text-center text-muted text-sm">Saison non disponible</div>
                        )}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setIsGroupModalOpen(true)}
                    className="w-full py-4 rounded-xl bg-surface-dark border border-white/10 text-white font-bold flex items-center justify-center gap-3 hover:bg-white/5 transition-colors"
                  >
                    <Users2 size={20} className="text-primary" /> RECOMMANDER À UN GROUPE
                  </button>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'Critiques' && (
            <div className="space-y-6">
              {!watchlistItem ? (
                <div className="text-center py-8">
                  <p className="text-muted mb-4">Ajoutez ce titre à votre coffre pour écrire une critique.</p>
                  <button 
                    onClick={handleToggleWatchlist}
                    className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-[0_0_15px_var(--theme-shadow)] hover:scale-105 transition-transform"
                  >
                    Ajouter au coffre
                  </button>
                </div>
              ) : (
                <div className="bg-surface/50 backdrop-blur-md rounded-xl p-5 border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Votre critique</h3>
                    {!isEditingReview && watchlistItem.review && (
                      <button 
                        onClick={() => setIsEditingReview(true)}
                        className="text-primary text-sm font-bold hover:underline flex items-center gap-1"
                      >
                        <Edit size={14} /> Modifier
                      </button>
                    )}
                  </div>
                  
                  {showReviewSuccess && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm flex items-center gap-2">
                      <Check size={16} /> Critique publiée avec succès !
                    </div>
                  )}

                  {isEditingReview || !watchlistItem.review ? (
                    <div className="relative">
                      <textarea 
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Qu'avez-vous pensé de cette œuvre ?"
                        className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-white placeholder-muted focus:outline-none focus:border-primary/50 min-h-[100px] resize-none"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isReviewPublic}
                            onChange={(e) => setIsReviewPublic(e.target.checked)}
                            className="w-4 h-4 rounded bg-surface border-white/20 text-primary focus:ring-primary focus:ring-offset-surface-dark"
                          />
                          <span className="text-sm text-muted">Rendre publique</span>
                        </label>
                        <div className="flex gap-2">
                          {watchlistItem.review && (
                            <button 
                              onClick={() => {
                                setReviewText(watchlistItem.review);
                                setIsReviewPublic(watchlistItem.isReviewPublic !== false);
                                setIsEditingReview(false);
                              }}
                              className="px-4 py-2 rounded-full text-sm font-bold text-muted hover:text-white transition-colors"
                            >
                              Annuler
                            </button>
                          )}
                          <button 
                            onClick={handleSubmitReview}
                            disabled={isSubmittingReview || !reviewText.trim() || (reviewText === watchlistItem.review && isReviewPublic === (watchlistItem.isReviewPublic !== false))}
                            className="px-4 py-2 rounded-full bg-primary text-white text-sm font-bold flex items-center gap-2 hover:bg-primary/80 disabled:opacity-50 transition-colors"
                          >
                            <Send size={14} /> {isSubmittingReview ? 'Envoi...' : 'Publier'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface-dark rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src={user.photoURL || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop'} 
                          alt="Vous" 
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <p className="text-sm font-bold text-white">Vous</p>
                          <p className="text-[10px] text-muted">{new Date(watchlistItem.updatedAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{watchlistItem.review}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Critiques de la communauté</h3>
                  <button 
                    onClick={() => setShowOnlyFollowed(!showOnlyFollowed)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${showOnlyFollowed ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-muted hover:text-white'}`}
                  >
                    {showOnlyFollowed ? 'Suivis uniquement' : 'Tout voir'}
                  </button>
                </div>
                {filteredReviews.length === 0 ? (
                  <p className="text-muted text-sm text-center py-8 bg-surface-dark/30 rounded-xl border border-dashed border-white/10">
                    {showOnlyFollowed ? "Aucune critique de vos amis." : "Aucune critique pour le moment. Soyez le premier !"}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredReviews.map((review) => (
                      <div key={review.id} className="bg-surface-dark rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                          <img 
                            src={review.user?.photoURL || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop'} 
                            alt={review.user?.displayName || 'User'} 
                            className="w-8 h-8 rounded-full object-cover border border-white/10 cursor-pointer"
                            onClick={() => navigate(`/user/${review.user?.id}`)}
                          />
                          <div>
                            <p 
                              className="text-sm font-bold text-white cursor-pointer hover:underline"
                              onClick={() => navigate(`/user/${review.user?.id}`)}
                            >
                              {review.user?.displayName || 'Utilisateur'}
                            </p>
                            <p className="text-[10px] text-muted">{new Date(review.updatedAt).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">{review.review}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="h-20"></div>
        </div>
      </div>

      {/* Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-dark border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Recommander à...</h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-muted hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto no-scrollbar">
              {userGroups.length > 0 ? (
                userGroups.map(group => (
                  <button 
                    key={group.id}
                    onClick={() => handleAddToGroup(group.id)}
                    className="w-full p-4 rounded-xl bg-surface border border-white/5 text-left hover:bg-white/5 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-white">{group.name}</p>
                      <p className="text-xs text-muted">{group.members.length} membres</p>
                    </div>
                    <Plus size={20} className="text-primary" />
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted mb-4">Vous n'avez pas encore de groupe.</p>
                  <button 
                    onClick={() => navigate('/social')}
                    className="text-primary text-sm font-bold hover:underline"
                  >
                    Créer un groupe
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaDetails;
