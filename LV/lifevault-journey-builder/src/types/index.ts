export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  aptosAddress?: string;
  aptosBalance?: number;
  bitcoinAddress?: string;
  bitcoinBalance?: number;
  userType?: 'user' | 'creator' | 'brand' | 'government' | 'admin';
  organizationInfo?: {
    name?: string;
    description?: string;
    website?: string;
    logo?: string;
    isVerified?: boolean;
    verifiedAt?: string;
    category?: string;
  };
  level?: {
    current?: number;
    xp?: number;
    xpToNextLevel?: number;
  };
  points?: {
    current?: number;
    lifetime?: number;
  };
  questStats?: {
    totalCompleted?: number;
    totalAttempted?: number;
    totalPointsEarned?: number;
    totalAptEarned?: number;
    currentStreak?: number;
    longestStreak?: number;
    lastCompletedAt?: string;
  };
  totalMemories: number;
  storageUsed: number;
  createdAt: string;
}

export interface Memory {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  category: 'document' | 'photo' | 'video' | 'audio' | 'other';
  ipfsHash: string;
  ipfsUrl?: string;
  txHash?: string;
  txVersion?: string;
  network?: string;
  isOnChain: boolean;
  fileType?: string;
  fileSize?: number;
  fileName?: string;
  isEncrypted: boolean;
  isCapsule?: boolean;
  isClaimed?: boolean;
  beneficiaryAddress?: string;
  releaseTimestamp?: number;
  sharedWith: SharedUser[];
  createdAt: string;
  updatedAt: string;
}

export interface SharedUser {
  userId: string;
  permissions: 'view' | 'download';
  sharedAt: string;
}

export interface MemoryStats {
  overview: {
    totalMemories: number;
    totalSize: number;
    onChain: number;
  };
  byCategory: Array<{
    _id: string;
    count: number;
  }>;
  aptos?: {
    balance: number;
    formattedBalance: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CreateMemoryData {
  title: string;
  description?: string;
  category: string;
  fileData: string;
  fileName: string;
  fileType: string;
  storeOnChain: boolean;
  network?: string;
  isCapsule?: boolean;
  beneficiaryAddress?: string;
  releaseTimestamp?: number;
}

export interface Story {
  _id: string;
  creatorId: string;
  title: string;
  description: string;
  coverImage?: string;
  isPublic: boolean;
  status: 'draft' | 'active' | 'archived';
  isCollaborative: boolean;
  isInteractive: boolean;
  coAuthors: StoryCoAuthor[];
  totalChapters: number;
  chapters?: StoryChapter[];
  settings?: {
    requireApproval?: boolean;
    allowComments?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StoryCoAuthor {
  userId: string | any;
  role: 'editor' | 'contributor';
  joinedAt: string;
}

export interface StoryChapter {
  _id: string;
  storyId: string | any;
  chapterNumber: number;
  authorId: string | any;
  status: 'pending' | 'approved' | 'rejected';
  parentId?: string;
  choices: StoryChapterChoice[];
  title: string;
  subtitle?: string;
  content: {
    text?: string;
    mediaUrls?: string[];
  };
  theme?: string;
  order: number;
  versions: StoryChapterVersion[];
  isUnlocked?: boolean;
  unlockedAt?: string;
}

export interface StoryChapterChoice {
  text: string;
  nextChapterId: string;
}

export interface StoryChapterVersion {
  content: any;
  authorId: string | any;
  commitMessage: string;
  createdAt: string;
}