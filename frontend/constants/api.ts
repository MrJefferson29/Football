// API Configuration
export const API_BASE_URL = 'https://football-n2tj.onrender.com/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Home
  HOME: {
    BASE: `${API_BASE_URL}/home`,
  },
  // Auth
  AUTH: {
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    ME: `${API_BASE_URL}/auth/me`,
    UPDATE_PROFILE: `${API_BASE_URL}/auth/profile`,
  },
  // Polls
  POLLS: {
    BASE: `${API_BASE_URL}/polls`,
    BY_TYPE: (type: string) => `${API_BASE_URL}/polls/${type}`,
    VOTE: (id: string) => `${API_BASE_URL}/polls/${id}/vote`,
    RESULTS: (id: string) => `${API_BASE_URL}/polls/${id}/results`,
  },
  // Matches
  MATCHES: {
    BASE: `${API_BASE_URL}/matches`,
    TODAY: `${API_BASE_URL}/matches/today`,
    BY_LEAGUE: (league: string) => `${API_BASE_URL}/matches/league/${league}`,
    BY_ID: (id: string) => `${API_BASE_URL}/matches/${id}`,
    VOTE: (id: string) => `${API_BASE_URL}/matches/${id}/vote`,
    SCORE: (id: string) => `${API_BASE_URL}/matches/${id}/score`,
  },
  // Highlights
  HIGHLIGHTS: {
    BASE: `${API_BASE_URL}/highlights`,
    BY_ID: (id: string) => `${API_BASE_URL}/highlights/${id}`,
    COMMENTS: (id: string) => `${API_BASE_URL}/highlights/${id}/comments`,
    REPLY: (id: string, commentId: string) => `${API_BASE_URL}/highlights/${id}/comments/${commentId}/reply`,
    LIKE_COMMENT: (id: string, commentId: string) => `${API_BASE_URL}/highlights/${id}/comments/${commentId}/like`,
  },
  // News
  NEWS: {
    BASE: `${API_BASE_URL}/news`,
    TRENDING: `${API_BASE_URL}/news/trending`,
  },
  // Live Matches
  LIVE_MATCHES: {
    BASE: `${API_BASE_URL}/live-matches`,
    CURRENT: `${API_BASE_URL}/live-matches/current`,
    BY_ID: (id: string) => `${API_BASE_URL}/live-matches/${id}`,
    COMMENTS: (id: string) => `${API_BASE_URL}/live-matches/${id}/comments`,
    REPLY: (id: string, commentId: string) => `${API_BASE_URL}/live-matches/${id}/comments/${commentId}/reply`,
    LIKE_COMMENT: (id: string, commentId: string) => `${API_BASE_URL}/live-matches/${id}/comments/${commentId}/like`,
  },
  // Chat
  CHAT: {
    BASE: `${API_BASE_URL}/chat`,
    LIKE: (id: string) => `${API_BASE_URL}/chat/${id}/like`,
  },
  // Fan Groups
  FAN_GROUPS: {
    BASE: `${API_BASE_URL}/fan-groups`,
    BY_ID: (id: string) => `${API_BASE_URL}/fan-groups/${id}`,
    JOIN: (id: string) => `${API_BASE_URL}/fan-groups/${id}/join`,
    POSTS: (id: string) => `${API_BASE_URL}/fan-groups/${id}/posts`,
    COMMENTS: (id: string, postId: string) => `${API_BASE_URL}/fan-groups/${id}/posts/${postId}/comments`,
    LIKE_POST: (id: string, postId: string) => `${API_BASE_URL}/fan-groups/${id}/posts/${postId}/like`,
  },
  // Statistics
  STATISTICS: {
    BASE: `${API_BASE_URL}/statistics`,
  },
  // Upload
  UPLOAD: {
    BASE: `${API_BASE_URL}/upload`,
  },
  // Products
  PRODUCTS: {
    BASE: `${API_BASE_URL}/products`,
    BY_ID: (id: string) => `${API_BASE_URL}/products/${id}`,
    LIKE: (id: string) => `${API_BASE_URL}/products/${id}/like`,
    PURCHASE: (id: string) => `${API_BASE_URL}/products/${id}/purchase`,
  },
  // Leaderboard
  LEADERBOARD: {
    BASE: `${API_BASE_URL}/leaderboard`,
  },
};

// Socket.io URL
export const SOCKET_URL = 'http://192.168.50.179:5000';

