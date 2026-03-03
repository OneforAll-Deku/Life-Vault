import axios from 'axios';
import type { Memory, MemoryStats, User, ApiResponse, CreateMemoryData, Pagination } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    // Enhanced error logging for "Network Error"
    if (!error.response) {
      console.error('🌐 Network Error detected. Please ensure the backend is running at:', API_URL);
      console.error('Error details:', error.message);
    } else {
      console.error(`❌ API Error [${error.response.status}]:`, error.response.data?.message || error.message);
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { email, password }),

  register: (email: string, password: string, name?: string) =>
    api.post<ApiResponse<{ token: string; user: User }>>('/auth/register', { email, password, name }),

  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  updateProfile: (data: { name?: string; bio?: string; avatar?: string }) =>
    api.put<ApiResponse<User>>('/auth/profile', data),

  demo: () =>
    api.post<ApiResponse<{ token: string; user: User }>>('/auth/demo')
};

// Memory API
export const memoryAPI = {
  getAll: (params: { page?: number; limit?: number; category?: string; search?: string } = {}) =>
    api.get<ApiResponse<{ memories: Memory[]; pagination: Pagination }>>('/memories', { params }),

  getOne: (id: string) =>
    api.get<ApiResponse<Memory>>(`/memories/${id}`),

  create: (data: CreateMemoryData) =>
    api.post<ApiResponse<{ memory: Memory; ipfs: { hash: string; url: string }; aptos?: any }>>('/memories', data),

  createCapsule: (data: CreateMemoryData) =>
    api.post<ApiResponse<{ memory: Memory; ipfs: { hash: string; url: string }; aptos?: any }>>('/memories/capsule', data),

  claimCapsule: (id: string) =>
    api.post<ApiResponse<{ payload: any; message: string }>>(`/memories/capsule/${id}/claim`),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/memories/${id}`),

  verify: (id: string) =>
    api.get<ApiResponse<{ verified: boolean; data?: any; message?: string }>>(`/memories/${id}/verify`),

  getStats: () =>
    api.get<ApiResponse<MemoryStats>>('/memories/stats'),

  searchSemantic: (query: string) =>
    api.get<ApiResponse<Memory[]>>('/memories/search', { params: { query } })
};

// Utility functions
export const getIPFSUrl = (hash: string) => `${IPFS_GATEWAY}/${hash}`;

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    document: 'Document',
    photo: 'Photo',
    video: 'Video',
    audio: 'Audio',
    other: 'Other'
  };
  return labels[category] || 'Other';
};

export const getInitials = (name?: string): string => {
  if (!name) return 'U';
  const parts = name.split(/[@.\s]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Share API
export const shareAPI = {
  // Create share link
  create: (data: {
    memoryId: string;
    duration: string;
    accessType?: 'view' | 'download';
    maxViews?: number | null;
    password?: string;
    isZKProtected?: boolean;
    zkIdentityCommitment?: string;
  }) => api.post('/share', data),

  // Access shared memory
  getShared: (shortCode: string, password?: string, accessToken?: string) =>
    api.get(`/share/${shortCode}`, {
      params: { password, accessToken }
    }),

  // Verify share link security requirements
  verify: (shortCode: string) => api.get(`/share/${shortCode}/verify`),

  // GET ZK Challenge
  getChallenge: (shortCode: string) => api.get(`/share/${shortCode}/challenge`),

  // Verify security (Proof/Password) and get token
  verifySecurity: (shortCode: string, data: { password?: string; zkProof?: string }) =>
    api.post(`/share/${shortCode}/verify-security`, data),

  // Get user's share links
  getMyLinks: () => api.get('/share/user/my-links'),

  // Get share links for a memory
  getMemoryLinks: (memoryId: string) => api.get(`/share/memory/${memoryId}`),

  // Revoke share link
  revoke: (shortCode: string) => api.delete(`/share/${shortCode}`),

  // Update share link
  update: (shortCode: string, data: {
    duration?: string;
    maxViews?: number | null;
    password?: string;
    removePassword?: boolean;
  }) => api.patch(`/share/${shortCode}`, data),
};

// Analytics API
export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics'),
};

// Family Vault API
export const vaultAPI = {
  create: (data: any) => api.post('/vaults', data),
  getMyVaults: () => api.get('/vaults'),
  getVault: (id: string) => api.get(`/vaults/${id}`),
  updateVault: (id: string, data: any) => api.put(`/vaults/${id}`, data),
  deleteVault: (id: string) => api.delete(`/vaults/${id}`),

  // Memories
  addMemory: (vaultId: string, data: any) =>
    api.post(`/vaults/${vaultId}/memories`, data),
  removeMemory: (vaultId: string, memoryId: string) =>
    api.delete(`/vaults/${vaultId}/memories/${memoryId}`),

  // Invites
  createInvite: (vaultId: string, data: any) =>
    api.post(`/vaults/${vaultId}/invite`, data),
  getInviteInfo: (code: string) =>
    api.get(`/vaults/invite/${code}/info`),
  joinVault: (code: string) => api.post(`/vaults/join/${code}`),

  // Members
  updateMemberRole: (vaultId: string, data: any) =>
    api.put(`/vaults/${vaultId}/members/role`, data),
  removeMember: (vaultId: string, memberId: string) =>
    api.delete(`/vaults/${vaultId}/members/${memberId}`),

  // Activity
  getActivity: (vaultId: string) =>
    api.get(`/vaults/${vaultId}/activity`),
};

// Digital Will API
export const willAPI = {
  // Core CRUD
  create: (data: any) => api.post('/wills', data),
  getMyWills: () => api.get('/wills'),
  getWill: (id: string) => api.get(`/wills/${id}`),
  updateWill: (id: string, data: any) => api.put(`/wills/${id}`, data),
  deleteWill: (id: string) => api.delete(`/wills/${id}`),

  // Beneficiaries
  addBeneficiary: (willId: string, data: any) =>
    api.post(`/wills/${willId}/beneficiaries`, data),
  removeBeneficiary: (willId: string, beneficiaryId: string) =>
    api.delete(`/wills/${willId}/beneficiaries/${beneficiaryId}`),
  assignMemories: (willId: string, beneficiaryId: string, data: any) =>
    api.put(`/wills/${willId}/beneficiaries/${beneficiaryId}/memories`, data),

  // Multi-sig confirmation (public — no auth)
  confirmBeneficiary: (token: string) =>
    api.post('/wills/confirm', { token }),

  // Actions
  checkin: (willId: string) => api.post(`/wills/${willId}/checkin`),
  notarize: (willId: string) => api.post(`/wills/${willId}/notarize`),
  execute: (willId: string) => api.post(`/wills/${willId}/execute`),
  getActivity: (willId: string) => api.get(`/wills/${willId}/activity`),
};

// Platform Stats API (public — no auth required)
export interface PlatformStats {
  raw: {
    users: number;
    memories: number;
    vaults: number;
  };
  formatted: {
    activeUsers: string;
    memoriesStored: string;
    memoriesSecured: string;
    happyFamilies: string;
    userOwnership: string;
    encryption: string;
    uptime: string;
  };
}

export const platformStatsAPI = {
  getStats: () => api.get<{ success: boolean; data: PlatformStats }>('/stats/platform'),
};

export default api;