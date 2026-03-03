
import api from './api';

// ─── Quest API ───────────────────────────────────────────
export const questAPI = {
  getAll: (params: {
    page?: number;
    limit?: number;
    category?: string;
    difficulty?: string;
    status?: string;
    search?: string;
    lat?: number;
    lon?: number;
    radius?: number;
    campaignId?: string;
    sortBy?: string;
  } = {}) => api.get('/quests', { params }),

  getNearby: (lat: number, lon: number, radius = 5000, limit = 50) =>
    api.get('/quests/nearby', { params: { lat, lon, radius, limit } }),

  getOne: (id: string) => api.get(`/quests/${id}`),

  create: (data: any) => api.post('/quests', data),

  update: (id: string, data: any) => api.put(`/quests/${id}`, data),

  activate: (id: string) => api.post(`/quests/${id}/activate`),

  pause: (id: string) => api.post(`/quests/${id}/pause`),

  delete: (id: string) => api.delete(`/quests/${id}`),

  startAttempt: (id: string) => api.post(`/quests/${id}/start`),

  submitCompletion: (id: string, data: {
    attemptId?: string;
    photoBase64?: string;
    location?: { latitude: number; longitude: number };
    qrCodeScanned?: string;
    deviceInfo?: any;
    capturedAt?: string;
  }) => api.post(`/quests/${id}/submit`, data),

  getHistory: (params: { page?: number; limit?: number; status?: string } = {}) =>
    api.get('/quests/user/history', { params }),

  getLeaderboard: (id: string, limit = 50) =>
    api.get(`/quests/${id}/leaderboard`, { params: { limit } }),
};

// ─── Campaign API ────────────────────────────────────────
export const campaignAPI = {
  getAll: (params: { page?: number; limit?: number } = {}) =>
    api.get('/campaigns', { params }),

  getOne: (id: string) => api.get(`/campaigns/${id}`),

  create: (data: any) => api.post('/campaigns', data),

  update: (id: string, data: any) => api.put(`/campaigns/${id}`, data),

  activate: (id: string) => api.post(`/campaigns/${id}/activate`),

  delete: (id: string) => api.delete(`/campaigns/${id}`),

  join: (id: string) => api.post(`/campaigns/${id}/join`),

  checkCompletion: (id: string) => api.post(`/campaigns/${id}/check-completion`),

  addQuest: (id: string, data: any) => api.post(`/campaigns/${id}/quests`, data),

  getLeaderboard: (id: string) => api.get(`/campaigns/${id}/leaderboard`),

  getMyCampaigns: () => api.get('/campaigns/user/my-campaigns'),

  getJoined: () => api.get('/campaigns/user/joined'),
};

// ─── Badge API ───────────────────────────────────────────
export const badgeAPI = {
  getAll: () => api.get('/badges'),

  getOne: (id: string) => api.get(`/badges/${id}`),

  create: (data: any) => api.post('/badges', data),

  update: (id: string, data: any) => api.put(`/badges/${id}`, data),

  delete: (id: string) => api.delete(`/badges/${id}`),

  getMyBadges: () => api.get('/badges/user/my-badges'),

  getUserBadges: (userId: string) => api.get(`/badges/user/${userId}`),

  getCreated: () => api.get('/badges/user/created'),

  award: (id: string, data: any) => api.post(`/badges/${id}/award`, data),

  getLeaderboard: () => api.get('/badges/leaderboard'),
};

// ─── Story API (fixed) ──────────────────────────────────
export const storyAPI = {
  getByCode: (shortCode: string) => api.get(`/stories/code/${shortCode}`),

  create: (data: any) => api.post('/stories', data),

  getMyStories: () => api.get('/stories/my-stories'),

  getReceived: () => api.get('/stories/received'),

  getOne: (id: string) => api.get(`/stories/${id}`),

  update: (id: string, data: any) => api.put(`/stories/${id}`, data),

  delete: (id: string) => api.delete(`/stories/${id}`),

  activate: (id: string) => api.patch(`/stories/${id}/activate`),

  addRecipient: (id: string, data: any) =>
    api.post(`/stories/${id}/recipients`, data),

  addChapter: (storyId: string, data: any) =>
    api.post(`/stories/${storyId}/chapters`, data),

  /**
   * Unlock a chapter.
   * chapterNumber is 1-indexed (matches `order` field).
   * Pass latitude/longitude for geo-locked chapters.
   */
  unlockChapter: (
    storyId: string,
    chapterNumber: number,
    data?: {
      latitude?: number;
      longitude?: number;
      qrCode?: string;
      password?: string;
    }
  ) =>
    api.post(
      `/stories/${storyId}/chapters/${chapterNumber}/unlock`,
      data || {}
    ),

  // Collaboration & History
  updateChapterStatus: (storyId: string, chapterId: string, status: string) =>
    api.patch(`/stories/${storyId}/chapters/${chapterId}/status`, { status }),

  getChapterHistory: (storyId: string, chapterId: string) =>
    api.get(`/stories/${storyId}/chapters/${chapterId}/history`),

  addChapterVersion: (storyId: string, chapterId: string, data: { content: any; commitMessage?: string }) =>
    api.post(`/stories/${storyId}/chapters/${chapterId}/versions`, data),
};
