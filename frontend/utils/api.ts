import { API_ENDPOINTS } from '@/constants/api';
import { storage } from './storage';

// Get auth token from storage
const getToken = async (): Promise<string | null> => {
  return await storage.getToken();
};

// API Request helper
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  try {
    let token: string | null = null;
    
    try {
      token = await getToken();
    } catch (tokenError) {
      // Token retrieval failed, continue without token
      console.warn('Could not retrieve token:', tokenError);
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        ...options,
        headers,
      });
    } catch (fetchError: any) {
      const errorMsg = fetchError?.message || 'Network request failed';
      console.error('Fetch error:', errorMsg);
      throw new Error(errorMsg);
    }

    // Handle 401 Unauthorized
    if (response.status === 401) {
      try {
        await storage.clearAuth();
      } catch (clearError) {
        console.error('Error clearing auth:', clearError);
      }
      throw new Error('Session expired. Please login again.');
    }

    // Read response
    let responseText: string;
    try {
      responseText = await response.text();
    } catch (textError: any) {
      throw new Error('Failed to read response from server');
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    let data: any = {};

    // Parse JSON if applicable
    if (isJson) {
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError, 'Response:', responseText);
          throw new Error('Invalid JSON response from server');
        }
      }
    } else {
      // Non-JSON response, use text as error
      if (!response.ok) {
        throw new Error(responseText || `Request failed (${response.status})`);
      }
    }

    // Check response status
    if (!response.ok) {
      const errorMsg = data?.message || data?.error || responseText || `Request failed (${response.status})`;
      console.error('API error:', errorMsg, data);
      throw new Error(errorMsg);
    }

    return data;
  } catch (error: any) {
    // Log the error for debugging
    console.error('API request error:', error);
    
    // Ensure we always throw an Error object
    if (error instanceof Error) {
      throw error;
    }
    
    // Handle non-Error objects (strings, objects, etc.)
    let errorMessage = 'An unknown error occurred';
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = error.message || error.error || JSON.stringify(error);
    } else if (error != null) {
      errorMessage = String(error);
    }
    
    throw new Error(errorMessage);
  }
};

// Auth API
export const authAPI = {
  register: async (
    username: string,
    email: string,
    password: string,
    country?: string,
    age?: number,
    referralCode?: string
  ) => {
    const response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify({ username, email, password, country, age, referralCode }),
    });
    if (response.success && response.token) {
      await storage.setToken(response.token);
      await storage.setUser(response.user);
    }
    return response;
  },
  login: async (email: string, password: string) => {
    const response = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.token) {
      await storage.setToken(response.token);
      await storage.setUser(response.user);
    }
    return response;
  },
  getMe: async () => {
    return apiRequest(API_ENDPOINTS.AUTH.ME);
  },
  updateMe: async (profile: { username?: string; avatar?: string; country?: string; age?: number }) => {
    const response = await apiRequest(API_ENDPOINTS.AUTH.ME, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
    if (response?.success && response?.data) {
      await storage.setUser(response.data);
    }
    return response;
  },
  logout: async () => {
    await storage.clearAuth();
  },
};

// Polls API
export const pollsAPI = {
  getPolls: async () => {
    return apiRequest(API_ENDPOINTS.POLLS.BASE);
  },
  getPollByType: async (type: string) => {
    return apiRequest(API_ENDPOINTS.POLLS.BY_TYPE(type));
  },
  votePoll: async (id: string, choice: 'option1' | 'option2', homeScore?: number, awayScore?: number) => {
    const body: any = { choice };
    if (homeScore !== undefined && awayScore !== undefined) {
      body.homeScore = homeScore;
      body.awayScore = awayScore;
    }
    return apiRequest(API_ENDPOINTS.POLLS.VOTE(id), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  getPollResults: async (id: string) => {
    return apiRequest(API_ENDPOINTS.POLLS.RESULTS(id));
  },
};

// Matches API
export const matchesAPI = {
  getMatches: async (params?: { status?: string; date?: string; league?: string; leagueType?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.date) queryParams.append('date', params.date);
    if (params?.league) queryParams.append('league', params.league);
    if (params?.leagueType) queryParams.append('leagueType', params.leagueType);
    const query = queryParams.toString();
    return apiRequest(query ? `${API_ENDPOINTS.MATCHES.BASE}?${query}` : API_ENDPOINTS.MATCHES.BASE);
  },
  getTodayMatches: async (params?: { league?: string; leagueType?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.league) queryParams.append('league', params.league);
    if (params?.leagueType) queryParams.append('leagueType', params.leagueType);
    const query = queryParams.toString();
    return apiRequest(query ? `${API_ENDPOINTS.MATCHES.TODAY}?${query}` : API_ENDPOINTS.MATCHES.TODAY);
  },
  getMatchesByLeague: async (league: string, params?: { status?: string; date?: string; leagueType?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.date) queryParams.append('date', params.date);
    if (params?.leagueType) queryParams.append('leagueType', params.leagueType);
    const query = queryParams.toString();
    return apiRequest(query ? `${API_ENDPOINTS.MATCHES.BASE}/league/${league}?${query}` : `${API_ENDPOINTS.MATCHES.BASE}/league/${league}`);
  },
  getMatch: async (id: string) => {
    return apiRequest(API_ENDPOINTS.MATCHES.BY_ID(id));
  },
  voteMatch: async (id: string, prediction: 'home' | 'draw' | 'away', homeScore?: number, awayScore?: number) => {
    return apiRequest(API_ENDPOINTS.MATCHES.VOTE(id), {
      method: 'POST',
      body: JSON.stringify({ prediction, homeScore, awayScore }),
    });
  },
};

// Highlights API
export const highlightsAPI = {
  getHighlights: async (category?: string) => {
    const url = category 
      ? `${API_ENDPOINTS.HIGHLIGHTS.BASE}?category=${category}`
      : API_ENDPOINTS.HIGHLIGHTS.BASE;
    return apiRequest(url);
  },
  getHighlight: async (id: string) => {
    return apiRequest(API_ENDPOINTS.HIGHLIGHTS.BY_ID(id));
  },
  addComment: async (id: string, message: string) => {
    return apiRequest(API_ENDPOINTS.HIGHLIGHTS.COMMENTS(id), {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  replyToComment: async (id: string, commentId: string, message: string) => {
    return apiRequest(API_ENDPOINTS.HIGHLIGHTS.REPLY(id, commentId), {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  likeComment: async (id: string, commentId: string) => {
    return apiRequest(API_ENDPOINTS.HIGHLIGHTS.LIKE_COMMENT(id, commentId), {
      method: 'POST',
    });
  },
};

// News API
export const newsAPI = {
  getNews: async (category?: string) => {
    const url = category 
      ? `${API_ENDPOINTS.NEWS.BASE}?category=${category}`
      : API_ENDPOINTS.NEWS.BASE;
    return apiRequest(url);
  },
  getTrendingNews: async () => {
    return apiRequest(API_ENDPOINTS.NEWS.TRENDING);
  },
};

// Live Matches API
export const liveMatchesAPI = {
  getLiveMatches: async () => {
    return apiRequest(API_ENDPOINTS.LIVE_MATCHES.BASE);
  },
  getCurrentMatch: async () => {
    return apiRequest(API_ENDPOINTS.LIVE_MATCHES.CURRENT);
  },
  getLiveMatch: async (id: string) => {
    return apiRequest(API_ENDPOINTS.LIVE_MATCHES.BY_ID(id));
  },
  addComment: async (id: string, message: string) => {
    return apiRequest(API_ENDPOINTS.LIVE_MATCHES.COMMENTS(id), {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  replyToComment: async (id: string, commentId: string, message: string) => {
    return apiRequest(API_ENDPOINTS.LIVE_MATCHES.REPLY(id, commentId), {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  likeComment: async (id: string, commentId: string) => {
    return apiRequest(API_ENDPOINTS.LIVE_MATCHES.LIKE_COMMENT(id, commentId), {
      method: 'POST',
    });
  },
};

// Prediction Forums API
export const predictionForumsAPI = {
  getPredictionForums: async () => {
    return apiRequest(API_ENDPOINTS.PREDICTION_FORUMS.BASE);
  },
  getPredictionForum: async (id: string) => {
    return apiRequest(API_ENDPOINTS.PREDICTION_FORUMS.BY_ID(id));
  },
  getForumByHead: async (userId: string) => {
    return apiRequest(API_ENDPOINTS.PREDICTION_FORUMS.BY_HEAD(userId));
  },
  getAllUsers: async () => {
    return apiRequest(API_ENDPOINTS.PREDICTION_FORUMS.USERS_LIST);
  },
  createPredictionForum: async (data: { name: string; description?: string; headUserId: string }) => {
    return apiRequest(API_ENDPOINTS.PREDICTION_FORUMS.BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updatePredictionForum: async (id: string, data: { name?: string; description?: string; profilePicture?: string }) => {
    return apiRequest(API_ENDPOINTS.PREDICTION_FORUMS.BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  joinPredictionForum: async (id: string) => {
    return apiRequest(API_ENDPOINTS.PREDICTION_FORUMS.JOIN(id), {
      method: 'POST',
    });
  },
  deletePredictionForum: async (id: string) => {
    return apiRequest(API_ENDPOINTS.PREDICTION_FORUMS.BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Predictions API
export const predictionsAPI = {
  getAllPredictions: async (params?: { status?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return apiRequest(`${API_ENDPOINTS.PREDICTIONS.BASE}${query ? `?${query}` : ''}`);
  },
  getPredictionsByForum: async (forumId: string, params?: { status?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return apiRequest(`${API_ENDPOINTS.PREDICTIONS.BY_FORUM(forumId)}${query ? `?${query}` : ''}`);
  },
  getPrediction: async (id: string) => {
    return apiRequest(API_ENDPOINTS.PREDICTIONS.BY_ID(id));
  },
  createPrediction: async (data: {
    forumId: string;
    team1: { name: string; logo?: string };
    team2: { name: string; logo?: string };
    predictedScore: { team1: number; team2: number };
    matchDate: string;
    league?: string;
    competition?: string;
    odds?: number;
    predictionType?: string;
    additionalInfo?: string;
  }) => {
    return apiRequest(API_ENDPOINTS.PREDICTIONS.BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updatePrediction: async (id: string, data: {
    team1?: { name?: string; logo?: string };
    team2?: { name?: string; logo?: string };
    predictedScore?: { team1?: number; team2?: number };
    matchDate?: string;
    league?: string;
    competition?: string;
    odds?: number;
    predictionType?: string;
    additionalInfo?: string;
    status?: string;
  }) => {
    return apiRequest(API_ENDPOINTS.PREDICTIONS.BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  updatePredictionResult: async (id: string, actualScore: { team1: number; team2: number }) => {
    return apiRequest(API_ENDPOINTS.PREDICTIONS.RESULT(id), {
      method: 'PUT',
      body: JSON.stringify({ actualScore }),
    });
  },
  addComment: async (id: string, message: string) => {
    return apiRequest(API_ENDPOINTS.PREDICTIONS.COMMENTS(id), {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  likePrediction: async (id: string) => {
    return apiRequest(API_ENDPOINTS.PREDICTIONS.LIKE(id), {
      method: 'POST',
    });
  },
  deletePrediction: async (id: string) => {
    return apiRequest(API_ENDPOINTS.PREDICTIONS.BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Chat API
export const chatAPI = {
  getMessages: async () => {
    return apiRequest(API_ENDPOINTS.CHAT.BASE);
  },
  sendMessage: async (message?: string, image?: string, replyTo?: string) => {
    return apiRequest(API_ENDPOINTS.CHAT.BASE, {
      method: 'POST',
      body: JSON.stringify({ message, image, replyTo }),
    });
  },
  likeMessage: async (id: string) => {
    return apiRequest(API_ENDPOINTS.CHAT.LIKE(id), {
      method: 'POST',
    });
  },
};

// Fan Groups API
export const fanGroupsAPI = {
  getFanGroups: async () => {
    return apiRequest(API_ENDPOINTS.FAN_GROUPS.BASE);
  },
  getFanGroup: async (id: string) => {
    return apiRequest(API_ENDPOINTS.FAN_GROUPS.BY_ID(id));
  },
  joinFanGroup: async (id: string) => {
    return apiRequest(API_ENDPOINTS.FAN_GROUPS.JOIN(id), {
      method: 'POST',
    });
  },
  commentOnPost: async (id: string, postId: string, message: string) => {
    return apiRequest(API_ENDPOINTS.FAN_GROUPS.COMMENTS(id, postId), {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  likePost: async (id: string, postId: string) => {
    return apiRequest(API_ENDPOINTS.FAN_GROUPS.LIKE_POST(id, postId), {
      method: 'POST',
    });
  },
  createPost: async (id: string, postData: { content?: string; image?: string; video?: string; url?: string }) => {
    return apiRequest(API_ENDPOINTS.FAN_GROUPS.POSTS(id), {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },
};

// Statistics API
export const statisticsAPI = {
  getStatistics: async () => {
    return apiRequest(API_ENDPOINTS.STATISTICS.BASE);
  },
};

// Home API
export const homeAPI = {
  getHomeData: async () => {
    return apiRequest(API_ENDPOINTS.HOME.BASE);
  },
};

// Products API
export const productsAPI = {
  getProducts: async (filters?: {
    category?: string;
    featured?: boolean;
    trending?: boolean;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.featured) params.append('featured', 'true');
    if (filters?.trending) params.append('trending', 'true');
    if (filters?.search) params.append('search', filters.search);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.sort) params.append('sort', filters.sort);
    
    const url = params.toString() 
      ? `${API_ENDPOINTS.PRODUCTS.BASE}?${params.toString()}`
      : API_ENDPOINTS.PRODUCTS.BASE;
    return apiRequest(url);
  },
  getProduct: async (id: string) => {
    return apiRequest(API_ENDPOINTS.PRODUCTS.BY_ID(id));
  },
  likeProduct: async (id: string) => {
    return apiRequest(API_ENDPOINTS.PRODUCTS.LIKE(id), {
      method: 'POST',
    });
  },
  purchaseProduct: async (id: string) => {
    return apiRequest(API_ENDPOINTS.PRODUCTS.PURCHASE(id), {
      method: 'POST',
    });
  },
};

// Forum Messages API
export const forumMessagesAPI = {
  getForumMessages: async (forumId: string) => {
    return apiRequest(API_ENDPOINTS.FORUM_MESSAGES.BY_FORUM(forumId));
  },
  sendForumMessage: async (forumId: string, message: string, image?: string) => {
    return apiRequest(API_ENDPOINTS.FORUM_MESSAGES.BASE, {
      method: 'POST',
      body: JSON.stringify({ forumId, message, image }),
    });
  },
};

// Forum Join Requests API
export const forumJoinRequestsAPI = {
  createJoinRequest: async (forumId: string, message?: string) => {
    return apiRequest(API_ENDPOINTS.FORUM_JOIN_REQUESTS.BASE, {
      method: 'POST',
      body: JSON.stringify({ forumId, message }),
    });
  },
  getJoinRequestsByForum: async (forumId: string) => {
    return apiRequest(API_ENDPOINTS.FORUM_JOIN_REQUESTS.BY_FORUM(forumId));
  },
  getMyForumJoinRequests: async () => {
    return apiRequest(API_ENDPOINTS.FORUM_JOIN_REQUESTS.MY_FORUMS);
  },
  getMyJoinRequests: async () => {
    return apiRequest(API_ENDPOINTS.FORUM_JOIN_REQUESTS.MY_REQUESTS);
  },
  approveJoinRequest: async (requestId: string) => {
    return apiRequest(API_ENDPOINTS.FORUM_JOIN_REQUESTS.APPROVE(requestId), {
      method: 'PUT',
    });
  },
  declineJoinRequest: async (requestId: string) => {
    return apiRequest(API_ENDPOINTS.FORUM_JOIN_REQUESTS.DECLINE(requestId), {
      method: 'PUT',
    });
  },
};

// Upload API
export const uploadAPI = {
  uploadImage: async (imageUri: string, folder?: string) => {
    const formData = new FormData();
    
    // Extract filename from URI
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri: imageUri,
      type: type,
      name: filename,
    } as any);
    
    if (folder) {
      formData.append('folder', folder);
    }

    const token = await storage.getToken();
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData - let fetch set it with boundary

    const response = await fetch(API_ENDPOINTS.UPLOAD.BASE, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    const data = await response.json();
    return data;
  },
};

// Preload API - Fetches all base API endpoints for caching
export const preloadAPI = {
  preloadAll: async () => {
    const results: Record<string, any> = {};
    
    // Fetch all base endpoints in parallel
    const promises = [
      // Home data
      homeAPI.getHomeData().then(data => ({ key: 'home', data })).catch(err => ({ key: 'home', error: err.message })),
      
      // Polls
      pollsAPI.getPolls().then(data => ({ key: 'polls', data })).catch(err => ({ key: 'polls', error: err.message })),
      
      // Matches
      matchesAPI.getTodayMatches().then(data => ({ key: 'todayMatches', data })).catch(err => ({ key: 'todayMatches', error: err.message })),
      matchesAPI.getMatches().then(data => ({ key: 'matches', data })).catch(err => ({ key: 'matches', error: err.message })),
      
      // Highlights
      highlightsAPI.getHighlights().then(data => ({ key: 'highlights', data })).catch(err => ({ key: 'highlights', error: err.message })),
      
      // News
      newsAPI.getTrendingNews().then(data => ({ key: 'trendingNews', data })).catch(err => ({ key: 'trendingNews', error: err.message })),
      newsAPI.getNews().then(data => ({ key: 'news', data })).catch(err => ({ key: 'news', error: err.message })),
      
      // Live Matches
      liveMatchesAPI.getCurrentMatch().then(data => ({ key: 'currentMatch', data })).catch(err => ({ key: 'currentMatch', error: err.message })),
      liveMatchesAPI.getLiveMatches().then(data => ({ key: 'liveMatches', data })).catch(err => ({ key: 'liveMatches', error: err.message })),
      
      // Fan Groups
      fanGroupsAPI.getFanGroups().then(data => ({ key: 'fanGroups', data })).catch(err => ({ key: 'fanGroups', error: err.message })),
      
      // Statistics
      statisticsAPI.getStatistics().then(data => ({ key: 'statistics', data })).catch(err => ({ key: 'statistics', error: err.message })),
      
      // Products (featured and trending)
      productsAPI.getProducts({ featured: true }).then(data => ({ key: 'featuredProducts', data })).catch(err => ({ key: 'featuredProducts', error: err.message })),
      productsAPI.getProducts({ trending: true }).then(data => ({ key: 'trendingProducts', data })).catch(err => ({ key: 'trendingProducts', error: err.message })),
    ];

    // Check if user is logged in before fetching user-specific data
    try {
      const token = await getToken();
      if (token) {
        // Add user-specific endpoints
        promises.push(
          chatAPI.getMessages().then(data => ({ key: 'chatMessages', data })).catch(err => ({ key: 'chatMessages', error: err.message }))
        );
      }
    } catch (err) {
      // User not logged in, skip user-specific endpoints
    }

    // Wait for all requests to complete (success or failure)
    const settled = await Promise.allSettled(promises);
    
    // Process results
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const value = result.value as { key: string; data?: any; error?: any };
        if (value.error) {
          console.warn(`Preload failed for ${value.key}:`, value.error);
          results[value.key] = { error: value.error };
        } else {
          results[value.key] = { data: value.data };
        }
      } else {
        console.warn(`Preload promise rejected:`, result.reason);
      }
    });

    return results;
  },
};
