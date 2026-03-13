const API_KEY = "0ddfbf159231829c2994b9cf10b93568";
const BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMedia {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: 'movie' | 'tv';
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  seasons?: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
  }[];
}

export interface TMDBSeason {
  _id: string;
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episodes: {
    id: number;
    name: string;
    overview: string;
    episode_number: number;
    season_number: number;
    runtime: number;
    still_path: string | null;
  }[];
}

export const getImageUrl = (path: string | null, size: 'w500' | 'original' = 'w500') => {
  if (!path) return 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1974&auto=format&fit=crop';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const searchMedia = async (query: string): Promise<TMDBMedia[]> => {
  if (!API_KEY) {
    console.error("TMDB API Key missing. Please set VITE_TMDB_API_KEY.");
    return [];
  }
  if (!query) return [];
  
  try {
    const response = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR&page=1&include_adult=false`);
    const data = await response.json();
    return data.results.filter((item: TMDBMedia) => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (error) {
    console.error("Error searching TMDB:", error);
    return [];
  }
};

export const getTrending = async (): Promise<TMDBMedia[]> => {
  if (!API_KEY) return [];
  try {
    const response = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=fr-FR`);
    const data = await response.json();
    return data.results.filter((item: TMDBMedia) => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (error) {
    console.error("Error fetching trending:", error);
    return [];
  }
};

export const getMediaDetails = async (id: string, type: 'movie' | 'tv'): Promise<TMDBMedia | null> => {
  if (!API_KEY) return null;
  try {
    const response = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=fr-FR`);
    const data = await response.json();
    if (data.success === false) return null;
    return { ...data, media_type: type };
  } catch (error) {
    console.error("Error fetching details:", error);
    return null;
  }
};

export const getSeasonDetails = async (tvId: string, seasonNumber: number): Promise<TMDBSeason | null> => {
  if (!API_KEY) return null;
  try {
    const response = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}&language=fr-FR`);
    const data = await response.json();
    if (data.success === false) return null;
    return data;
  } catch (error) {
    console.error("Error fetching season details:", error);
    return null;
  }
};
