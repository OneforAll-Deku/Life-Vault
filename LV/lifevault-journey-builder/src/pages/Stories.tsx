import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateStoryModal } from '@/components/story/CreateStoryModal';
import { storyAPI } from '@/services/questApi';
import { motion, AnimatePresence } from 'framer-motion';
import DecryptedText from '@/components/react-bits/TextAnimations/DecryptedText';
import {
  Heart,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  Clock,
  MapPin,
  ChevronRight,
  Search,
  Inbox,
  Send,
  Eye,
  Loader2,
  ArrowLeft,
  Calendar,
  Users,
  Filter,
  X,
  AlertCircle,
  CheckCircle,
  Navigation,
  Image as ImageIcon,
  Sparkles,
  Map as MapIcon,
  Activity,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Tab = 'my-stories' | 'received';

// ── Universal extractor (same as Dashboard) ──
function extractStoriesArray(res: any): any[] {
  const axiosData = res?.data;
  if (!axiosData) return [];
  if (Array.isArray(axiosData)) return axiosData;
  const innerData = axiosData.data;
  if (Array.isArray(innerData)) return innerData;
  if (innerData?.stories && Array.isArray(innerData.stories)) return innerData.stories;
  if (axiosData.stories && Array.isArray(axiosData.stories)) return axiosData.stories;
  if (innerData && typeof innerData === 'object') {
    for (const key of Object.keys(innerData)) {
      if (Array.isArray(innerData[key])) return innerData[key];
    }
  }
  return [];
}

// ── Haversine distance ──
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const Stories: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const { toast } = useToast();
  const isDark = false; // Forced light mode

  const [tab, setTab] = useState<Tab>('my-stories');
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);

  // Search / filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Unlock state
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Search by code
  const [searchCode, setSearchCode] = useState('');
  const [searchCodeLoading, setSearchCodeLoading] = useState(false);
  const [searchCodeError, setSearchCodeError] = useState<string | null>(null);

  // ── Fetch stories ──
  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        tab === 'my-stories'
          ? await storyAPI.getMyStories()
          : await storyAPI.getReceived();

      const data = extractStoriesArray(res);
      setStories(data);
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

  // ── Filter & search ──
  const filteredStories = stories.filter((story) => {
    if (statusFilter !== 'all' && story.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = story.title?.toLowerCase().includes(q);
      const descMatch = story.description?.toLowerCase().includes(q);
      const codeMatch = story.shortCode?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !codeMatch) return false;
    }
    return true;
  });

  // ── Search by code ──
  const handleSearchByCode = async () => {
    if (!searchCode.trim()) return;
    setSearchCodeLoading(true);
    setSearchCodeError(null);
    try {
      const res = await storyAPI.getByCode(searchCode.trim());
      const story = res.data?.data?.story || res.data?.data || res.data?.story || res.data;
      if (story && (story._id || story.id)) {
        setSelectedStory(story);
        toast({
          title: "Story Synchronized",
          description: "Neural fragment retrieved successfully."
        });
      } else {
        setSearchCodeError('Story fragment not found');
        toast({
          title: "Sync Error",
          description: "Story fragment not found. Please check identification code.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      setSearchCodeError(err.response?.data?.message || 'Access denied or fragment missing');
      toast({
        title: "Access Denied",
        description: err.response?.data?.message || "Bypass failed.",
        variant: "destructive"
      });
    } finally {
      setSearchCodeLoading(false);
    }
  };

  // ── Get current location ──
  const getCurrentLocation = (): Promise<{ lat: number; lon: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tracking not available'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserLocation(loc);
          resolve(loc);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

  // ── Unlock a chapter ──
  const handleUnlockChapter = async (story: any, chapter: any) => {
    const storyId = story._id || story.id;
    if (!storyId) return;

    setUnlocking(true);
    setUnlockError(null);
    setUnlockSuccess(false);

    try {
      const timeCond = chapter.unlockConditions?.time;
      if (timeCond?.enabled && timeCond?.unlockAt) {
        if (new Date() < new Date(timeCond.unlockAt)) {
          throw new Error(`Temporal lock active until ${new Date(timeCond.unlockAt).toLocaleString()}`);
        }
      }

      let locationPayload: { latitude?: number; longitude?: number } = {};
      const locCond = chapter.unlockConditions?.location;

      if (locCond?.enabled) {
        let loc = userLocation;
        if (!loc) {
          try {
            loc = await getCurrentLocation();
          } catch {
            throw new Error('Bio-location metrics required to bypass geo-lock');
          }
        }

        if (locCond.coordinates?.coordinates) {
          const [targetLon, targetLat] = locCond.coordinates.coordinates;
          const dist = getDistanceMeters(loc.lat, loc.lon, targetLat, targetLon);
          const radius = locCond.radiusMeters || 80;
          if (dist > radius) {
            throw new Error(`Spatial mismatch: ${Math.round(dist)}m detected. Radius limit: ${radius}m`);
          }
        }
        locationPayload = { latitude: loc.lat, longitude: loc.lon };
      }

      const chapterNum = chapter.chapterNumber || chapter.order || 1;
      await storyAPI.unlockChapter(storyId, chapterNum, locationPayload);

      setUnlockSuccess(true);
      toast({
        title: "Bypass Successful",
        description: "Cryptographic lock bypassed. Segment decrypted."
      });

      const freshRes = await storyAPI.getOne(storyId);
      const freshStory = freshRes.data?.data?.story || freshRes.data?.data || freshRes.data;
      if (freshStory) {
        setSelectedStory(freshStory);
        setStories((prev) => prev.map((s) => (s._id || s.id) === storyId ? { ...s, ...freshStory } : s));
      }
    } catch (err: any) {
      setUnlockError(err.response?.data?.message || err.message || 'Unlock protocol failed');
      toast({
        title: "Bypass Failed",
        description: err.response?.data?.message || "System protocol interrupted.",
        variant: "destructive"
      });
    } finally {
      setUnlocking(false);
    }
  };

  // ── Format helpers ──
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatDateTime = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatTimeRemaining = (dateStr: string): string => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return 'Ready now';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const isInGracePeriod = (story: any): boolean => {
    try {
      const graceList = JSON.parse(localStorage.getItem('storyGracePeriods') || '[]');
      const entry = graceList.find((g: any) => g.storyId === (story._id || story.id));
      if (entry && new Date() < new Date(entry.creatorAccessUntil)) return true;
    } catch { /* ignore */ }
    const until = story.settings?.creatorAccessUntil;
    return until ? new Date() < new Date(until) : false;
  };

  const getGracePreview = (storyId: string): string | null => {
    try {
      const graceList = JSON.parse(localStorage.getItem('storyGracePeriods') || '[]');
      const entry = graceList.find((g: any) => g.storyId === storyId);
      return (entry && new Date() < new Date(entry.creatorAccessUntil)) ? entry.previewBase64 : null;
    } catch { return null; }
  };

  const isCreator = (story: any) => {
    const creatorId = story.creator?._id || story.creator?.id || story.creatorId?._id || story.creatorId;
    const userId = user?.id || user?._id;
    return creatorId && userId && creatorId.toString() === userId.toString();
  };

  // ── Story Detail View ──
  const renderStoryDetail = () => {
    if (!selectedStory) return null;

    const storyId = selectedStory._id || selectedStory.id;
    const chapters = selectedStory.chapters || [];
    const creator = isCreator(selectedStory);
    const gracePeriod = creator && isInGracePeriod(selectedStory);
    const gracePreview = storyId ? getGracePreview(storyId) : null;

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-md bg-slate-900/40"
            onClick={() => {
              setSelectedStory(null);
              setUnlockError(null);
              setUnlockSuccess(false);
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[3rem] border shadow-2xl bg-white border-slate-200"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-8 border-b backdrop-blur-3xl bg-white/80 border-slate-100">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shrink-0">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-black tracking-tight truncate">
                    {selectedStory.title}
                  </h2>
                  {selectedStory.shortCode && (
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Fragment ID: {selectedStory.shortCode}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedStory(null);
                  setUnlockError(null);
                  setUnlockSuccess(false);
                }}
                className="p-3 rounded-2xl transition-all bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
              {/* Description */}
              {selectedStory.description && (
                <p className="text-lg leading-relaxed font-medium text-slate-600">
                  {selectedStory.description}
                </p>
              )}

              {/* Status Section */}
              <div className="flex flex-wrap gap-3">
                <span className={`px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase border ${selectedStory.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                  {selectedStory.status || 'draft'}
                </span>
                {creator && (
                  <span className="px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Proprietor View
                  </span>
                )}
                {gracePeriod && (
                  <span className="px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
                    Live Preview Active
                  </span>
                )}
              </div>

              {/* Alerts */}
              <AnimatePresence>
                {unlockError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-sm font-bold flex items-start gap-4"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{unlockError}</span>
                  </motion.div>
                )}
                {unlockSuccess && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-sm font-bold flex items-center gap-4"
                  >
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    Access protocol successful. Fragment decrypted.
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chapters Flow */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-slate-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    Memory Flow Chronology
                  </h3>
                </div>

                {chapters.length > 0 ? (
                  <div className="space-y-4">
                    {chapters.map((chapter: any, idx: number) => {
                      const isUnlocked = chapter.isUnlocked;
                      const timeCond = chapter.unlockConditions?.time;
                      const locCond = chapter.unlockConditions?.location;
                      const timeReady = !timeCond?.enabled || !timeCond?.unlockAt || new Date() >= new Date(timeCond.unlockAt);
                      const showGraceContent = !isUnlocked && creator && gracePeriod && gracePreview;

                      return (
                        <motion.div
                          key={chapter._id || idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`group rounded-[2.5rem] border overflow-hidden transition-all duration-500 ${isUnlocked
                            ? 'bg-emerald-50 border-emerald-100'
                            : 'bg-slate-50 border-slate-100'
                            }`}
                        >
                          {/* Chapter Item Header */}
                          <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${isUnlocked
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-slate-500/10 text-slate-500'
                                }`}>
                                {isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="text-lg font-black tracking-tight">{chapter.title || `Segment ${idx + 1}`}</h4>
                                {chapter.subtitle && <p className="text-xs font-bold text-slate-500 tracking-wide mt-0.5">{chapter.subtitle}</p>}
                              </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${isUnlocked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                              }`}>
                              {isUnlocked ? 'Accessible' : 'Secure'}
                            </div>
                          </div>

                          {/* Decrypted Content */}
                          {isUnlocked && chapter.content && (
                            <div className="px-6 pb-6 space-y-4">
                              {(chapter.content.mediaUrl || chapter.content.mediaData) && (
                                <div className="rounded-[2rem] overflow-hidden border border-emerald-500/10 shadow-lg">
                                  <img
                                    src={chapter.content.mediaUrl || chapter.content.mediaData}
                                    alt={chapter.title}
                                    className="w-full h-64 object-cover"
                                  />
                                </div>
                              )}
                              {chapter.content.caption && (
                                <div className="p-5 rounded-2xl border bg-white border-slate-100 italic text-slate-600">
                                  <p className="text-sm font-medium leading-relaxed italic">"{chapter.content.caption}"</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Grace Preview */}
                          {showGraceContent && (
                            <div className="px-6 pb-6">
                              <div className="relative rounded-[2rem] overflow-hidden border border-indigo-500/20 shadow-xl group/preview">
                                <img
                                  src={gracePreview!}
                                  alt="Secure Preview"
                                  className="w-full h-64 object-cover saturate-0 group-hover/preview:saturate-100 transition-all duration-1000"
                                />
                                <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-2xl backdrop-blur-md">
                                  Creator Oversight Active
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Locked State Dynamics */}
                          {!isUnlocked && (
                            <div className="px-6 pb-6 space-y-4">
                              {/* Conditions */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {timeCond?.enabled && (
                                  <div className={`p-4 rounded-2xl border ${timeReady ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/5 border-amber-500/20 text-amber-500'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                      <Clock className="w-4 h-4" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Time Constraint</span>
                                    </div>
                                    <p className="text-xs font-black">{timeReady ? 'Threshold Met' : formatTimeRemaining(timeCond.unlockAt!)}</p>
                                  </div>
                                )}
                                {locCond?.enabled && (
                                  <div className="p-4 rounded-2xl border bg-cyan-500/5 border-cyan-500/20 text-cyan-500">
                                    <div className="flex items-center gap-3 mb-2">
                                      <MapPin className="w-4 h-4" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Geo Anchor</span>
                                    </div>
                                    <p className="text-xs font-black truncate">{locCond.name || 'Locked Locale'}</p>
                                  </div>
                                )}
                              </div>

                              {chapter.hint?.text && (
                                <p className="text-xs font-bold text-slate-500 px-2 italic">
                                  <span className="text-amber-500 mr-2">HINT:</span>
                                  {chapter.hint.text}
                                </p>
                              )}

                              <button
                                onClick={() => handleUnlockChapter(selectedStory, chapter)}
                                disabled={unlocking || !timeReady}
                                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${timeReady
                                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-900/40 hover:scale-[1.02] active:scale-95'
                                  : 'bg-slate-500/10 text-slate-500 cursor-not-allowed'
                                  }`}
                              >
                                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : timeReady ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                {unlocking ? 'Executing Bypass...' : timeReady ? 'Initiate Decryption' : 'Access Restricted'}
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 rounded-[3rem] border-2 border-dashed border-slate-100/10">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Flow contains no segments</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 p-6 flex justify-end backdrop-blur-3xl border-t bg-white/80 border-slate-100">
              <button
                onClick={() => {
                  setSelectedStory(null);
                  setUnlockError(null);
                  setUnlockSuccess(false);
                }}
                className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                Terminate View
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  return (
    <DashboardLayout>
      <div className={`min-h-screen space-y-8 pb-20 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[3rem] shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600 via-rose-600 to-indigo-700"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full -ml-40 -mb-40 blur-3xl"></div>

          <div className="relative z-10 px-8 py-12 sm:px-12 sm:py-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 text-white/70 hover:text-white text-xs font-black uppercase tracking-widest mb-8 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Return to Core
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-yellow-400/20 rounded-xl backdrop-blur-md border border-yellow-400/30">
                <Heart className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-white/80 text-xs font-black uppercase tracking-[0.3em]">
                Deep Memory Repository
              </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white">
                  <DecryptedText
                    text="Chronicle"
                    animateOn="view"
                    revealDirection="center"
                    className="inline-block"
                  />
                  {' '}
                  <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-white bg-clip-text text-transparent opacity-80">
                    Vaults
                  </span>
                </h1>
                <p className="text-white/70 text-lg max-w-xl font-medium leading-relaxed">
                  Architect time-locked and spatial-bound legacies. Encapsulate your essence within the cryptographic flow.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateModal(true)}
                className="group flex items-center gap-3 px-8 py-4 bg-white text-rose-600 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl hover:shadow-white/20 transition-all"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                Forge New Fragment
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Global Access Protocol (Search by Code) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-1 rounded-[2.5rem] bg-gradient-to-r from-pink-500/20 via-rose-500/20 to-indigo-500/20 shadow-xl`}
        >
          <div className="p-8 rounded-[2.4rem] bg-white/90 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-4 shrink-0">
                <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                  <Search className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Access Protocol</h3>
                  <p className="text-sm font-bold">Synchronize via Fragment Code</p>
                </div>
              </div>

              <div className="flex-1 flex gap-3 w-full">
                <input
                  className="flex-1 px-6 py-4 rounded-2xl text-sm font-black tracking-[0.2em] uppercase focus:outline-none transition-all placeholder:text-slate-600 bg-slate-100 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  placeholder="Enter 8-digit identification..."
                  value={searchCode}
                  onChange={(e) => {
                    setSearchCode(e.target.value.toUpperCase());
                    setSearchCodeError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchByCode()}
                />
                <button
                  onClick={handleSearchByCode}
                  disabled={searchCodeLoading || !searchCode.trim()}
                  className="px-8 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 disabled:opacity-50 transition-all shadow-lg shadow-rose-900/20"
                >
                  {searchCodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Synchronize'}
                </button>
              </div>
            </div>
            {searchCodeError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-4 ml-16">
                System Alert: {searchCodeError}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Workspace Navigation */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-2 border-b border-slate-500/10">
          <div className="flex p-1.5 rounded-[2rem] gap-2 bg-slate-100">
            <button
              onClick={() => setTab('my-stories')}
              className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'my-stories'
                ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/20'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Send className="w-4 h-4" />
              Authored Flows
            </button>
            <button
              onClick={() => setTab('received')}
              className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'received'
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Inbox className="w-4 h-4" />
              Received Ingress
            </button>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                className="w-full pl-12 pr-4 py-3 rounded-2xl text-xs font-bold focus:outline-none transition-all bg-slate-100 border border-slate-200 focus:bg-white"
                placeholder="Filter index..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest focus:outline-none transition-all appearance-none cursor-pointer bg-slate-100 border border-slate-200"
            >
              <option value="all">Global State</option>
              <option value="active">Operational</option>
              <option value="draft">In-Progress</option>
            </select>
            <button
              onClick={fetchStories}
              className="p-3 rounded-2xl border transition-all bg-slate-100 border-slate-200 hover:bg-slate-200"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stories Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-40 gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-rose-500/20 rounded-full animate-ping"></div>
                <div className="absolute inset-0 w-20 h-20 border-t-4 border-rose-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Scanning Neural Network</p>
            </motion.div>
          ) : filteredStories.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredStories.map((story, idx) => {
                const storyId = story._id || story.id;
                const modules = story.chapters || [];
                const unlocked = modules.filter((c: any) => c.isUnlocked).length;
                const total = story.totalChapters || modules.length || 0;
                const progressPct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

                const timeCond = modules[0]?.unlockConditions?.time;
                const locCond = modules[0]?.unlockConditions?.location;
                const creator = isCreator(story);
                const grace = creator && isInGracePeriod(story);

                return (
                  <motion.button
                    key={storyId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    onClick={() => setSelectedStory(story)}
                    className="group relative flex flex-col items-start p-8 rounded-[3rem] border transition-all duration-500 overflow-hidden bg-white border-slate-100 hover:border-rose-500/20 shadow-xl shadow-slate-200/50"
                  >
                    {/* Progress Background */}
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-500 transition-all duration-1000"
                      style={{ width: `${progressPct}%`, opacity: 0.3 }}
                    />

                    <div className="flex items-center justify-between w-full mb-6">
                      <div className="p-4 rounded-2xl transition-all duration-500 bg-slate-50 group-hover:bg-rose-50">
                        <Heart className="w-5 h-5 transition-colors duration-500 text-slate-400 group-hover:text-rose-500" />
                      </div>
                      <div className="flex items-center gap-2">
                        {grace && (
                          <span className="text-[8px] font-black px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 tracking-tighter uppercase font-mono">
                            Preview
                          </span>
                        )}
                        <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${story.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                          {story.status || 'draft'}
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex-1 mb-6">
                      <h3 className="text-xl font-black tracking-tight mb-2 group-hover:text-rose-500 transition-colors truncate w-full">
                        {story.title}
                      </h3>
                      {story.description && (
                        <p className="text-xs font-bold leading-relaxed line-clamp-2 text-slate-500">
                          {story.description}
                        </p>
                      )}
                    </div>

                    {/* Conditions */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {timeCond?.enabled && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${new Date() >= new Date(timeCond.unlockAt)
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'
                          : 'bg-slate-500/5 border-slate-500/10 text-slate-500'
                          }`}>
                          <Clock className="w-3 h-3" />
                          {new Date() >= new Date(timeCond.unlockAt) ? 'Temporal Ready' : formatDate(timeCond.unlockAt)}
                        </div>
                      )}
                      {locCond?.enabled && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                          <MapPin className="w-3 h-3" />
                          Geo Anchor
                        </div>
                      )}
                    </div>

                    <div className="w-full pt-6 border-t border-slate-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Fragments</span>
                          <span className="text-sm font-black">{unlocked} <span className="text-slate-500 text-xs">/ {total}</span></span>
                        </div>
                        {story.recipients?.length > 0 && (
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Accessors</span>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-indigo-400" />
                              <span className="text-sm font-black">{story.recipients.length}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-3 rounded-2xl transition-all duration-500 bg-slate-100 group-hover:bg-rose-600 group-hover:text-white shadow-rose-200">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Short Code Subtle */}
                    {story.shortCode && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-500/40">[{story.shortCode}]</span>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32 space-y-8"
            >
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-[3.5rem] flex items-center justify-center mx-auto mb-6 border-2 border-dashed bg-slate-50 border-slate-200">
                  <Heart className="w-12 h-12 text-slate-700" />
                </div>
                <div className="absolute inset-0 bg-rose-500/20 blur-[60px] rounded-full animate-pulse"></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black tracking-tight italic">REPOSITORY EMPTY</h3>
                <p className="text-sm font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                  No fragments found within this sector. Initiate a new memory flow to bridge the temporal gap.
                </p>
              </div>

              {tab === 'my-stories' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-10 py-4 bg-gradient-to-r from-rose-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-rose-900/40"
                >
                  Initiate Fragment
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Portals */}
        {selectedStory && renderStoryDetail()}

        <CreateStoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchStories();
            setShowCreateModal(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default Stories;
