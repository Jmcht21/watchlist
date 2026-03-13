import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { TMDBMedia, getImageUrl } from './tmdb';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

export interface WatchlistItem {
  id: string; // The firestore doc ID (e.g., 'movie_123')
  userId: string;
  mediaId: string;
  title: string;
  type: 'movie' | 'series' | 'documentary';
  posterUrl: string;
  status: 'watching' | 'completed' | 'plan_to_watch';
  progress: string;
  rating: number;
  review: string;
  isReviewPublic?: boolean;
  updatedAt: string;
  watchedDate?: string; // For movies
  episodesWatched?: number; // For series
  seasonsWatched?: number; // For series
  totalEpisodes?: number;
  totalSeasons?: number;
  watchedEpisodesMap?: Record<number, number[]>; // { seasonNumber: [episodeNumber, ...] }
  genres?: string;
  isFavorite?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  theme?: string;
  pinnedMediaIds?: string[];
  stats?: {
    movies: number;
    episodes: number;
    hours: number;
  };
}

export interface WatchGroup {
  id: string;
  name: string;
  creatorId: string;
  members: string[];
  mediaIds: string[];
  createdAt: string;
}

export interface GroupActivity {
  id: string;
  groupId: string;
  userId: string;
  mediaId: string;
  mediaTitle: string;
  posterUrl: string;
  type: 'add';
  createdAt: string;
}

export const addToWatchlist = async (userId: string, media: TMDBMedia, status: WatchlistItem['status'] = 'plan_to_watch') => {
  const mediaId = String(media.id);
  const type = media.media_type === 'tv' ? 'series' : 'movie';
  const docId = `${userId}_${type}_${mediaId}`;
  const title = media.title || media.name || 'Inconnu';
  
  const item: WatchlistItem = {
    id: docId,
    userId,
    mediaId,
    title,
    type,
    posterUrl: getImageUrl(media.poster_path, 'w500'),
    status,
    progress: '0',
    rating: 0,
    review: '',
    updatedAt: new Date().toISOString(),
    genres: media.genres ? media.genres.map(g => g.name).join(', ') : '',
    episodesWatched: 0,
    seasonsWatched: 0,
    totalEpisodes: media.number_of_episodes || 0,
    totalSeasons: media.number_of_seasons || 0,
    isFavorite: false
  };

  try {
    await setDoc(doc(db, 'watchlist', docId), item);
    return true;
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    return false;
  }
};

export const updateWatchlistStatus = async (userId: string, mediaId: string, type: 'movie' | 'tv' | 'series' | 'documentary', status: WatchlistItem['status'], extraData?: Partial<WatchlistItem>) => {
  const mediaType = type === 'tv' ? 'series' : type;
  const docId = `${userId}_${mediaType}_${mediaId}`;
  try {
    const dataToUpdate: any = { status, updatedAt: new Date().toISOString() };
    if (extraData) {
      Object.assign(dataToUpdate, extraData);
    }
    await setDoc(doc(db, 'watchlist', docId), dataToUpdate, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating status:", error);
    return false;
  }
};

export const incrementEpisode = async (item: WatchlistItem) => {
  const newEpisodes = (item.episodesWatched || 0) + 1;
  const isCompleted = item.totalEpisodes && newEpisodes >= item.totalEpisodes;
  
  return updateWatchlistStatus(
    item.userId, 
    item.mediaId, 
    item.type, 
    isCompleted ? 'completed' : 'watching',
    { episodesWatched: newEpisodes }
  );
};

export const removeFromWatchlist = async (userId: string, mediaId: string, type: 'movie' | 'tv' | 'series' | 'documentary') => {
  const mediaType = type === 'tv' ? 'series' : type;
  const docId = `${userId}_${mediaType}_${mediaId}`;
  try {
    await deleteDoc(doc(db, 'watchlist', docId));
    return true;
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    return false;
  }
};

export const subscribeToWatchlist = (userId: string, callback: (items: WatchlistItem[]) => void) => {
  const q = query(collection(db, 'watchlist'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items: WatchlistItem[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as WatchlistItem);
    });
    callback(items);
  });
};

export const searchUsersByEmail = async (email: string) => {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

export const getMediaReviews = async (mediaId: string) => {
  try {
    const q = query(collection(db, 'watchlist'), where('mediaId', '==', mediaId));
    const snapshot = await getDocs(q);
    const reviews: any[] = [];
    
    // Fetch user details for each review
    for (const document of snapshot.docs) {
      const data = document.data() as WatchlistItem;
      if (data.review && data.review.trim() !== '' && data.isReviewPublic !== false) {
        const userProfile = await getUserProfile(data.userId);
        if (userProfile) {
          reviews.push({
            ...data,
            user: userProfile
          });
        }
      }
    }
    return reviews;
  } catch (error) {
    console.error("Error getting reviews:", error);
    return [];
  }
};

export const getUserPublicWatchlist = async (userId: string) => {
  try {
    const q = query(collection(db, 'watchlist'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WatchlistItem));
  } catch (error) {
    console.error("Error getting public watchlist:", error);
    return [];
  }
};

// Follow functions
export const followUser = async (followerId: string, followedId: string) => {
  const docId = `${followerId}_${followedId}`;
  try {
    await setDoc(doc(db, 'follows', docId), {
      followerId,
      followedId,
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error following user:", error);
    return false;
  }
};

export const unfollowUser = async (followerId: string, followedId: string) => {
  const docId = `${followerId}_${followedId}`;
  try {
    await deleteDoc(doc(db, 'follows', docId));
    return true;
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return false;
  }
};

export const isFollowing = async (followerId: string, followedId: string) => {
  const docId = `${followerId}_${followedId}`;
  try {
    const docSnap = await getDoc(doc(db, 'follows', docId));
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
};

export const getFollowedUsers = async (userId: string) => {
  try {
    const q = query(collection(db, 'follows'), where('followerId', '==', userId));
    const snapshot = await getDocs(q);
    const followedUsers: UserProfile[] = [];
    for (const document of snapshot.docs) {
      const data = document.data();
      const profile = await getUserProfile(data.followedId);
      if (profile) followedUsers.push(profile);
    }
    return followedUsers;
  } catch (error) {
    console.error("Error getting followed users:", error);
    return [];
  }
};

// Pinning functions
export const togglePinMedia = async (userId: string, mediaId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    
    const userData = userSnap.data() as UserProfile;
    const pinnedMediaIds = userData.pinnedMediaIds || [];
    
    let isPinned;
    let newPinned;
    if (pinnedMediaIds.includes(mediaId)) {
      newPinned = pinnedMediaIds.filter(id => id !== mediaId);
      isPinned = false;
    } else {
      newPinned = [...pinnedMediaIds, mediaId];
      isPinned = true;
    }
    
    await setDoc(userRef, { pinnedMediaIds: newPinned }, { merge: true });
    return isPinned;
  } catch (error) {
    console.error("Error toggling pin:", error);
    return false;
  }
};

// Watch Group functions
export const createWatchGroup = async (name: string, creatorId: string, members: string[]) => {
  const groupId = `group_${Date.now()}`;
  const group: WatchGroup = {
    id: groupId,
    name,
    creatorId,
    members: [creatorId, ...members],
    mediaIds: [],
    createdAt: new Date().toISOString()
  };
  
  try {
    await setDoc(doc(db, 'watchGroups', groupId), group);
    return groupId;
  } catch (error) {
    console.error("Error creating watch group:", error);
    return null;
  }
};

export const addMediaToGroup = async (groupId: string, mediaId: string, type: 'movie' | 'tv', userId: string, mediaTitle: string, posterUrl: string) => {
  try {
    const groupRef = doc(db, 'watchGroups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return false;
    
    const groupData = groupSnap.data() as WatchGroup;
    const mediaEntry = `${type}:${mediaId}:${userId}`;
    
    // Check if this exact media is already recommended by someone
    if (groupData.mediaIds.some(m => m.startsWith(`${type}:${mediaId}:`))) return true;
    
    const newMediaIds = [...groupData.mediaIds, mediaEntry];
    await setDoc(groupRef, { mediaIds: newMediaIds }, { merge: true });
    
    // Add activity
    const activityId = `group_act_${Date.now()}`;
    await setDoc(doc(db, 'groupActivities', activityId), {
      groupId,
      userId,
      mediaId,
      mediaTitle,
      posterUrl,
      type: 'add',
      createdAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error("Error adding media to group:", error);
    return false;
  }
};

export const getWatchGroups = async (userId: string) => {
  try {
    const q = query(collection(db, 'watchGroups'), where('members', 'array-contains', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WatchGroup));
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, 'watchGroups');
    }
    console.error("Error getting watch groups:", error);
    return [];
  }
};

export const getGroupActivities = async (userId: string) => {
  try {
    const groups = await getWatchGroups(userId);
    const groupIds = groups.map(g => g.id);
    if (groupIds.length === 0) return [];
    
    const q = query(collection(db, 'groupActivities'), where('groupId', 'in', groupIds));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupActivity))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, 'groupActivities');
    }
    console.error("Error getting group activities:", error);
    return [];
  }
};

export const getFriendsActivity = async (userId: string) => {
  try {
    const followedUsers = await getFollowedUsers(userId);
    const followedIds = followedUsers.map(u => u.uid);
    if (followedIds.length === 0) return [];
    
    // We can only query up to 10 in an 'in' clause, so we might need to chunk if > 10
    const chunks = [];
    for (let i = 0; i < followedIds.length; i += 10) {
      chunks.push(followedIds.slice(i, i + 10));
    }
    
    let allActivities: WatchlistItem[] = [];
    for (const chunk of chunks) {
      const q = query(collection(db, 'watchlist'), where('userId', 'in', chunk));
      const snapshot = await getDocs(q);
      allActivities = [...allActivities, ...snapshot.docs.map(doc => doc.data() as WatchlistItem)];
    }
    
    // Sort by updated at, most recent first
    return allActivities.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 50);
  } catch (error) {
    console.error("Error getting friends activity:", error);
    return [];
  }
};
