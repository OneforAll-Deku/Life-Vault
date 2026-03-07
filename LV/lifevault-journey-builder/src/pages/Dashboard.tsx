// file: src/pages/Dashboard.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMemories } from '@/hooks/useMemories';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { Timeline } from '@/components/dashboard/Timeline';
import { AddMemoryModal } from '@/components/dashboard/AddMemoryModal';
import { MemoryDetailModal } from '@/components/dashboard/MemoryDetailModal';
import { CreateStoryModal } from '@/components/story/CreateStoryModal';
import type { Memory } from '@/types';
import {
  Plus,
  Search,
  RefreshCw,
  Heart,
  Lock,
  ChevronRight,
  TrendingUp,
  Calendar,
  ArrowRight,
  Clock,
  LayoutDashboard,
  Shield,
  Globe,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { storyAPI } from '@/services/questApi';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

// ── Category Config ────────────────────────────────
const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'photo', label: 'Photos' },
  { value: 'document', label: 'Documents' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Other' },
];

// ── Helper ─────────────────────────────────────────
function extractStoriesArray(res: any): any[] {
  const axiosData = res?.data;
  if (!axiosData) return [];
  if (Array.isArray(axiosData)) return axiosData;
  const innerData = axiosData.data;
  if (Array.isArray(innerData)) return innerData;
  if (innerData?.stories && Array.isArray(innerData.stories)) return innerData.stories;
  if (axiosData.stories && Array.isArray(axiosData.stories)) return axiosData.stories;
  return [];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    memories, loading, stats, pagination,
    fetchMemories, createMemory, deleteMemory, verifyMemory, searchSemantic, refresh
  } = useMemories();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [myStories, setMyStories] = useState<any[]>([]);
  const [receivedStories, setReceivedStories] = useState<any[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [isSemantic, setIsSemantic] = useState(false);
  const { toast } = useToast();

  const safeStats = {
    totalMemories: stats?.overview?.totalMemories || pagination?.total || memories?.length || 0,
    storageUsed: stats?.overview?.totalSize
      ? `${(stats.overview.totalSize / (1024 * 1024)).toFixed(2)} MB`
      : '0 MB',
    verifiedMemories: stats?.overview?.onChain || memories?.filter((m) => m.isOnChain)?.length || 0,
    activeQuests: 0,
    aptosBalance: stats?.aptos?.balance || 0,
  };

  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const [myRes, receivedRes] = await Promise.all([
        storyAPI.getMyStories().catch(() => null),
        storyAPI.getReceived().catch(() => null),
      ]);
      setMyStories(extractStoriesArray(myRes));
      setReceivedStories(extractStoriesArray(receivedRes));
    } catch (e) {
      console.error('Failed to fetch stories:', e);
    }
    setLoadingStories(false);
  };

  useEffect(() => { fetchStories(); }, []);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    fetchMemories({ category: category === 'all' ? undefined : category });
    toast({ title: "Filter applied", description: `Showing ${category === 'all' ? 'all memories' : category + 's'}.` });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSemantic) {
      searchSemantic(searchQuery);
      toast({ title: "AI Search", description: "Performing semantic search..." });
    } else {
      fetchMemories({ search: searchQuery });
      toast({ title: "Searching", description: `Looking for "${searchQuery}"...` });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen space-y-8 pb-20">

        {/* ── Hero Header ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-3xl p-8 sm:p-12"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold tracking-wide">All systems online</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                {getGreeting()},{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  {user?.name?.split(' ')[0] || 'there'}
                </span>
              </h1>

              <p className="text-slate-400 text-lg max-w-xl mb-8 leading-relaxed">
                Your memories are securely stored and verified. Add new memories or create stories to preserve your legacy.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => {
                    setShowAddModal(true);
                    toast({ title: "New Memory", description: "Opening upload form..." });
                  }}
                  className="group flex items-center gap-2.5 px-6 py-3.5 bg-white text-slate-900 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all"
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  Add Memory
                </button>

                <button
                  onClick={() => {
                    setShowStoryModal(true);
                    toast({ title: "New Story", description: "Opening story creator..." });
                  }}
                  className="group flex items-center gap-2.5 px-6 py-3.5 bg-white/10 text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 hover:-translate-y-0.5 transition-all"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 text-indigo-300" />
                  Create Story
                </button>
              </div>
            </div>

            <div className="hidden xl:grid grid-cols-2 gap-4">
              {[
                { label: 'Integrity', val: '100%', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Network', val: 'Active', icon: Globe, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                { label: 'Latency', val: '24ms', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'Sync', val: 'Live', icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 min-w-[140px] text-center">
                  <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
                  <div className="text-xl font-bold text-white mb-0.5">{s.val}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Stats Cards ──────────────────────────────────── */}
        <StatsCards stats={safeStats} />

        {/* ── Quick Actions Grid ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Vaults', desc: 'Secure storage', icon: Lock, path: '/vaults', toastMsg: 'Opening vaults...' },
            { label: 'Quest Map', desc: 'Active missions', icon: TrendingUp, path: '/quests', toastMsg: 'Loading quests...' },
            { label: 'Stories', desc: 'Time capsules', icon: BookOpen, path: '/stories', toastMsg: 'Loading stories...' },
            { label: 'Refresh', desc: 'Sync data', icon: RefreshCw, action: refresh, toastMsg: 'Syncing data...' }
          ].map((btn, i) => (
            <button
              key={i}
              onClick={() => {
                toast({ title: btn.label, description: btn.toastMsg });
                btn.action ? btn.action() : navigate(btn.path as string);
              }}
              className="bg-white p-6 rounded-2xl border border-slate-100 text-left group hover:shadow-lg hover:border-slate-200 hover:-translate-y-1 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                <btn.icon className={`w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors ${btn.label === 'Refresh' && loading ? 'animate-spin' : ''}`} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{btn.label}</h3>
              <p className="text-sm text-slate-500">{btn.desc}</p>
            </button>
          ))}
        </div>

        {/* ── Stories Section ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Stories */}
          <div className="bg-white rounded-2xl border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                  <Heart className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">My Stories</h2>
                  <p className="text-xs text-slate-500">Stories you've authored</p>
                </div>
              </div>
              <button onClick={fetchStories} className={`p-2 hover:bg-slate-50 rounded-lg transition-all ${loadingStories ? 'animate-spin' : ''}`}>
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              {myStories.length > 0 ? (
                myStories.slice(0, 3).map((story) => (
                  <button
                    key={story._id || story.id}
                    onClick={() => navigate(`/stories/${story._id || story.id}`)}
                    className="w-full text-left p-4 rounded-xl bg-slate-50 hover:bg-white hover:border-indigo-100 border border-transparent hover:shadow-md transition-all group/item"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-900 group-hover/item:text-indigo-600 transition-colors">{story.title}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover/item:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {story.chapters?.length || 0} chapters</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {story.status || 'Active'}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-sm text-slate-400 mb-4">No stories authored yet</p>
                  <button onClick={() => setShowStoryModal(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors">
                    Create your first story
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Received Stories */}
          <div className="bg-white rounded-2xl border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
                  <Lock className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Received Stories</h2>
                  <p className="text-xs text-slate-500">Shared with you</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-md text-xs font-medium border border-purple-100">{receivedStories.length} received</span>
            </div>

            <div className="space-y-3">
              {receivedStories.length > 0 ? (
                receivedStories.slice(0, 3).map((story) => (
                  <button
                    key={story._id || story.id}
                    onClick={() => navigate(`/stories/${story._id || story.id}`)}
                    className="w-full text-left p-4 rounded-xl bg-slate-50 hover:bg-white hover:border-purple-100 border border-transparent hover:shadow-md transition-all group/item"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900 group-hover/item:text-purple-600 transition-colors">{story.title}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover/item:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 w-1/3" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                  <Lock className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No shared stories yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Timeline Section ────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-8">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Memory Timeline</h2>
              </div>
              <p className="text-sm text-slate-500">Browse through your cherished moments.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative group flex-1 sm:w-72">
                  <label htmlFor="search-timeline" className="sr-only">Search</label>
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    id="search-timeline"
                    name="search-timeline"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isSemantic ? "Ask AI about your memories..." : "Search memories..."}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSemantic(!isSemantic);
                    toast({
                      title: !isSemantic ? "Semantic Mode" : "Standard Mode",
                      description: !isSemantic ? "AI-powered searching enabled." : "Keyword-based searching enabled."
                    });
                  }}
                  className={`h-11 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${isSemantic
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  title={isSemantic ? "Switch to standard search" : "Switch to semantic AI search"}
                >
                  <Sparkles className={`w-4 h-4 ${isSemantic ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline text-xs font-semibold">AI</span>
                </button>
              </form>
              <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === cat.value ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Timeline
            memories={memories}
            loading={loading}
            onSelect={setSelectedMemory}
            onAddClick={() => setShowAddModal(true)}
          />
        </div>

        <AddMemoryModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={createMemory} onSuccess={refresh} />
        <CreateStoryModal isOpen={showStoryModal} onClose={() => setShowStoryModal(false)} onCreated={fetchStories} />
        <MemoryDetailModal isOpen={!!selectedMemory} onClose={() => setSelectedMemory(null)} memory={selectedMemory} onDelete={deleteMemory} onVerify={verifyMemory} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
