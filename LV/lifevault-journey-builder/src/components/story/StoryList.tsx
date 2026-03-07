
import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Loader2,
  Heart,
  Inbox,
  Send,
  RefreshCw,
  Search,
} from 'lucide-react';
import { storyAPI } from '@/services/questApi';
import { authAPI } from '@/services/api';
import { CreateStoryModal } from './CreateStoryModal';
import { StoryViewModal } from './StoryViewModal';
import { StoryCard } from './StoryCard';

type Tab = 'my-stories' | 'received';

export const StoryList: React.FC = () => {
  const [tab, setTab] = useState<Tab>('my-stories');
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [viewStoryId, setViewStoryId] = useState<string | null>(null);

  // Lookup by short code
  const [searchCode, setSearchCode] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Fetch current user
  useEffect(() => {
    authAPI
      .getMe()
      .then((res) => {
        const u = res.data?.data || res.data?.user || res.data;
        setCurrentUserId(u?._id || u?.id || '');
      })
      .catch(() => { });
  }, []);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        tab === 'my-stories'
          ? await storyAPI.getMyStories()
          : await storyAPI.getReceived();

      const data =
        res.data?.data?.stories ||
        res.data?.data ||
        res.data?.stories ||
        res.data ||
        [];

      setStories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load stories');
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleSearchByCode = async () => {
    if (!searchCode.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await storyAPI.getByCode(searchCode.trim());
      const story = res.data?.data?.story || res.data?.data || res.data?.story;
      const sid = story?._id || story?.id;
      if (sid) {
        setViewStoryId(sid);
      } else {
        setSearchError('Story not found.');
      }
    } catch (err: any) {
      setSearchError(
        err.response?.data?.message || 'Story not found with that code.'
      );
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-pink-500" />
          <h1 className="text-2xl font-bold text-black">Stories</h1>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white
                     rounded-lg hover:bg-black/80 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Story
        </button>
      </div>

      {/* Search by code */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="search-code-input" className="sr-only">Enter story code</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
          <input
            id="search-code-input"
            name="search-code-input"
            className="w-full pl-9 pr-4 py-2.5 border border-black/10 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
            placeholder="Enter story code to access..."
            value={searchCode}
            onChange={(e) => {
              setSearchCode(e.target.value.toUpperCase());
              setSearchError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchByCode()}
          />
        </div>
        <button
          onClick={handleSearchByCode}
          disabled={searchLoading || !searchCode.trim()}
          className="px-4 py-2.5 bg-black text-white rounded-lg text-sm
                     hover:bg-black/80 disabled:opacity-50 transition-colors"
        >
          {searchLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Open'
          )}
        </button>
      </div>
      {searchError && (
        <p className="text-red-500 text-xs -mt-3">{searchError}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setTab('my-stories')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm
                      font-medium transition-colors ${tab === 'my-stories'
              ? 'bg-white text-black shadow-sm'
              : 'text-black/50 hover:text-black'
            }`}
        >
          <Send className="w-4 h-4" />
          My Stories
        </button>
        <button
          onClick={() => setTab('received')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm
                      font-medium transition-colors ${tab === 'received'
              ? 'bg-white text-black shadow-sm'
              : 'text-black/50 hover:text-black'
            }`}
        >
          <Inbox className="w-4 h-4" />
          Received
        </button>
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={fetchStories}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-black/40 hover:text-black transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-black/20" />
        </div>
      )}

      {/* Story grid */}
      {!loading && stories.length > 0 && (
        <div className="grid gap-3">
          {stories.map((story) => (
            <StoryCard
              key={story._id || story.id}
              story={story}
              isCreator={
                (story.creator?._id || story.creator?.id || story.creator) ===
                currentUserId
              }
              onClick={() => setViewStoryId(story._id || story.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && stories.length === 0 && !error && (
        <div className="text-center py-16 text-black/40">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">
            {tab === 'my-stories'
              ? 'No stories created yet'
              : 'No stories received yet'}
          </p>
          <p className="text-sm mt-1">
            {tab === 'my-stories'
              ? 'Create your first locked story!'
              : 'Ask someone to share a story code with you.'}
          </p>
        </div>
      )}

      {/* Modals */}
      <CreateStoryModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchStories}
      />

      <StoryViewModal
        isOpen={!!viewStoryId}
        onClose={() => setViewStoryId(null)}
        storyId={viewStoryId}
        currentUserId={currentUserId}
      />
    </div>
  );
};