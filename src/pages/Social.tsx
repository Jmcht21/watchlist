import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Search, MessageCircle, UserPlus, Loader2, Bell, Plus, X, UserMinus, Users2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { searchUsersByEmail, followUser, unfollowUser, isFollowing, getFollowedUsers, getWatchGroups, createWatchGroup, WatchGroup, UserProfile, getFriendsActivity, getGroupActivities, WatchlistItem, GroupActivity } from '../services/db';

const Social = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname === '/groups' ? 'Groupes' : 'Feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [followedUsers, setFollowedUsers] = useState<UserProfile[]>([]);
  const [watchGroups, setWatchGroups] = useState<WatchGroup[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  const [friendsActivity, setFriendsActivity] = useState<WatchlistItem[]>([]);
  const [groupActivities, setGroupActivities] = useState<GroupActivity[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const [followStatusMap, setFollowStatusMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        const followed = await getFollowedUsers(user.uid);
        setFollowedUsers(followed);
        const groups = await getWatchGroups(user.uid);
        setWatchGroups(groups);
        
        const fActivity = await getFriendsActivity(user.uid);
        setFriendsActivity(fActivity);
        
        const gActivity = await getGroupActivities(user.uid);
        setGroupActivities(gActivity);
        
        if (fActivity.length > 0 || gActivity.length > 0) {
          setHasUnreadNotifications(true);
        }
      };
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'Notifications') {
      setHasUnreadNotifications(false);
    }
  }, [activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    const results = await searchUsersByEmail(searchQuery.trim());
    const filteredResults = results.filter(r => r.uid !== user?.uid);
    setSearchResults(filteredResults);
    
    // Check follow status for each result
    const statusMap: Record<string, boolean> = {};
    for (const res of filteredResults) {
      statusMap[res.uid] = await isFollowing(user!.uid, res.uid);
    }
    setFollowStatusMap(prev => ({ ...prev, ...statusMap }));
    
    setIsSearching(false);
  };

  const handleToggleFollow = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!user) return;
    
    const currentlyFollowing = followStatusMap[targetId];
    if (currentlyFollowing) {
      await unfollowUser(user.uid, targetId);
    } else {
      await followUser(user.uid, targetId);
    }
    
    setFollowStatusMap(prev => ({ ...prev, [targetId]: !currentlyFollowing }));
    
    // Refresh followed users
    const followed = await getFollowedUsers(user.uid);
    setFollowedUsers(followed);
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    
    const groupId = await createWatchGroup(newGroupName.trim(), user.uid, selectedMembers);
    if (groupId) {
      const groups = await getWatchGroups(user.uid);
      setWatchGroups(groups);
      setIsGroupModalOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
    }
  };

  const toggleMemberSelection = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="w-24 h-24 rounded-full bg-surface border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
          <Users size={48} className="text-muted" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Rejoignez la communauté</h2>
        <p className="text-muted mb-8 max-w-xs">
          Connectez-vous pour voir l'activité de vos amis, partager vos critiques et découvrir de nouvelles œuvres.
        </p>
        <button onClick={login} className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-[0_0_15px_var(--theme-shadow)] hover:scale-105 transition-transform">
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar pb-24 relative">
      <div className="pt-12 px-6 pb-4 sticky top-0 bg-[var(--theme-bg-glow)] backdrop-blur-xl z-20 border-b border-white/5">
        <div className="flex justify-between items-center mb-6 relative">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-white drop-shadow-md">Social</h1>
        </div>
        
        <div className="flex gap-6 overflow-x-auto no-scrollbar">
          {['Feed', 'Suivis', 'Groupes', 'Notifications'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative flex-shrink-0 ${
                activeTab === tab 
                  ? 'text-primary' 
                  : 'text-muted hover:text-white'
              }`}
            >
              {tab}
              {tab === 'Notifications' && hasUnreadNotifications && (
                <span className="absolute top-0 -right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_8px_var(--theme-shadow)]"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 flex-1 flex flex-col">
        {activeTab === 'Feed' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
            <div className="w-20 h-20 rounded-full bg-surface/50 border border-white/5 flex items-center justify-center mb-4">
              <MessageCircle size={32} className="text-muted" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">C'est bien vide par ici...</h3>
            <p className="text-muted max-w-xs mb-6">
              Suivez des amis pour voir leur activité, leurs critiques et ce qu'ils regardent en ce moment.
            </p>
            <button onClick={() => setActiveTab('Suivis')} className="text-primary font-bold hover:underline flex items-center gap-2">
              <UserPlus size={18} /> Trouver des amis
            </button>
          </div>
        ) : activeTab === 'Notifications' ? (
          <div className="flex-1 flex flex-col gap-6">
            {friendsActivity.length === 0 && groupActivities.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 mt-10">
                <div className="w-20 h-20 rounded-full bg-surface/50 border border-white/5 flex items-center justify-center mb-4">
                  <Bell size={32} className="text-muted" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Aucune notification</h3>
                <p className="text-muted max-w-xs">
                  Vous serez notifié ici des activités de vos amis et de vos groupes.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {groupActivities.map(activity => {
                  const group = watchGroups.find(g => g.id === activity.groupId);
                  const member = followedUsers.find(u => u.uid === activity.userId);
                  return (
                    <div key={activity.id} className="bg-surface-dark p-4 rounded-xl border border-white/5 flex gap-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate(`/group/${activity.groupId}`)}>
                      <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0">
                        <img src={activity.posterUrl} alt={activity.mediaTitle} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-sm text-white">
                          <span className="font-bold">{member?.displayName || 'Un membre'}</span> a recommandé <span className="font-bold text-primary">{activity.mediaTitle}</span> dans le groupe <span className="font-bold">{group?.name || 'Inconnu'}</span>.
                        </p>
                        <p className="text-xs text-muted mt-1">{new Date(activity.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  );
                })}
                
                {friendsActivity.map(activity => {
                  const friend = followedUsers.find(u => u.uid === activity.userId);
                  if (!friend) return null;
                  
                  let actionText = '';
                  if (activity.status === 'Terminé') actionText = 'a terminé';
                  else if (activity.status === 'En cours') actionText = 'regarde';
                  else actionText = 'veut voir';
                  
                  return (
                    <div key={`${activity.userId}-${activity.mediaId}`} className="bg-surface-dark p-4 rounded-xl border border-white/5 flex gap-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate(`/media/${activity.type === 'series' ? 'tv' : 'movie'}/${activity.mediaId}`)}>
                      <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0">
                        <img src={activity.posterPath ? `https://image.tmdb.org/t/p/w92${activity.posterPath}` : 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1974&auto=format&fit=crop'} alt={activity.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-sm text-white">
                          <span className="font-bold">{friend.displayName}</span> {actionText} <span className="font-bold text-primary">{activity.title}</span>.
                        </p>
                        <p className="text-xs text-muted mt-1">{new Date(activity.updatedAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'Suivis' ? (
          <div className="flex-1 flex flex-col">
            <form onSubmit={handleSearch} className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
              <input 
                type="email" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un ami par email..." 
                className="w-full bg-surface/50 backdrop-blur-md border border-white/10 rounded-full py-3 pl-12 pr-24 text-white placeholder-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
              <button 
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 disabled:hover:bg-primary/20 px-4 py-1.5 rounded-full text-sm font-bold transition-colors"
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Chercher'}
              </button>
            </form>
            
            {hasSearched && (
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Résultats de recherche</h3>
                  <button onClick={() => { setHasSearched(false); setSearchQuery(''); setSearchResults([]); }} className="text-xs text-muted hover:text-white">Effacer</button>
                </div>
                {searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div 
                      key={result.uid} 
                      className="flex items-center justify-between bg-surface-dark p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => navigate(`/user/${result.uid}`)}
                    >
                      <div className="flex items-center gap-3">
                        <img src={result.photoURL || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop'} alt={result.displayName} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                        <div>
                          <p className="font-bold text-white">{result.displayName}</p>
                          <p className="text-xs text-muted">{result.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleToggleFollow(e, result.uid)}
                        className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${followStatusMap[result.uid] ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                      >
                        {followStatusMap[result.uid] ? <UserMinus size={20} /> : <UserPlus size={20} />}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted bg-surface-dark rounded-xl border border-white/5">
                    Aucun utilisateur trouvé.
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Mes suivis ({followedUsers.length})</h3>
              {followedUsers.length > 0 ? (
                followedUsers.map(followed => (
                  <div 
                    key={followed.uid} 
                    className="flex items-center justify-between bg-surface-dark p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => navigate(`/user/${followed.uid}`)}
                  >
                    <div className="flex items-center gap-3">
                      <img src={followed.photoURL || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop'} alt={followed.displayName} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                      <div>
                        <p className="font-bold text-white">{followed.displayName}</p>
                        <p className="text-xs text-muted">Ami</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleToggleFollow(e, followed.uid)}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-red-500/20 hover:text-red-500 transition-colors"
                    >
                      <UserMinus size={20} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted bg-surface-dark/30 rounded-xl border border-dashed border-white/10">
                  Vous ne suivez personne pour le moment.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Groupes de visionnage</h3>
              <button 
                onClick={() => setIsGroupModalOpen(true)}
                className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-full text-xs font-bold transition-colors"
              >
                <Plus size={16} /> CRÉER UN GROUPE
              </button>
            </div>

            {watchGroups.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {watchGroups.map(group => {
                  const hasNewActivity = groupActivities.some(act => act.groupId === group.id && (Date.now() - new Date(act.createdAt).getTime()) < 24 * 60 * 60 * 1000);
                  return (
                  <div 
                    key={group.id} 
                    className="bg-surface-dark p-5 rounded-2xl border border-white/5 flex flex-col gap-4 hover:border-primary/30 transition-colors relative"
                  >
                    {hasNewActivity && (
                      <span className="absolute top-4 right-4 w-3 h-3 bg-primary rounded-full neon-shadow"></span>
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-bold text-white">{group.name}</h4>
                        <p className="text-xs text-muted">{group.members.length} membres • {group.mediaIds.length} recommandations</p>
                      </div>
                      <div className="flex -space-x-2 mr-4">
                        {group.members.slice(0, 3).map((memberId, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-surface-dark bg-surface overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${memberId}`} alt="member" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {group.members.length > 3 && (
                          <div className="w-8 h-8 rounded-full border-2 border-surface-dark bg-surface-dark flex items-center justify-center text-[10px] text-white font-bold">
                            +{group.members.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => navigate(`/group/${group.id}`)}
                        className="flex-1 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        VOIR LE GROUPE
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 mt-10">
                <div className="w-20 h-20 rounded-full bg-surface/50 border border-white/5 flex items-center justify-center mb-4">
                  <Users2 size={32} className="text-muted" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Groupes de visionnage</h3>
                <p className="text-muted max-w-xs">
                  Créez des groupes avec vos amis pour partager vos recommandations et planifier vos prochaines séances ensemble.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-dark border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Créer un groupe</h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-muted hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted uppercase tracking-wider font-bold">Nom du groupe</label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ex: Soirées Pizza & Films"
                  className="w-full bg-surface border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted uppercase tracking-wider font-bold">Ajouter des amis ({selectedMembers.length})</label>
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2 no-scrollbar">
                  {followedUsers.length > 0 ? (
                    followedUsers.map(followed => (
                      <div 
                        key={followed.uid} 
                        onClick={() => toggleMemberSelection(followed.uid)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedMembers.includes(followed.uid) ? 'bg-primary/10 border-primary/30' : 'bg-surface border-white/5 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={followed.photoURL || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop'} alt={followed.displayName} className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-sm font-medium text-white">{followed.displayName}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMembers.includes(followed.uid) ? 'bg-primary border-primary' : 'border-white/20'}`}>
                          {selectedMembers.includes(followed.uid) && <Check size={12} className="text-white" />}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted text-center py-4 italic">Vous devez suivre des amis pour les ajouter à un groupe.</p>
                  )}
                </div>
              </div>

              <button 
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold shadow-[0_0_15px_var(--theme-shadow)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                CRÉER LE GROUPE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Social;
