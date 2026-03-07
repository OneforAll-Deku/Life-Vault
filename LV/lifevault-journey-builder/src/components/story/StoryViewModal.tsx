
import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Lock,
  Unlock,
  MapPin,
  Clock,
  Loader2,
  Eye,
  AlertCircle,
  Navigation,
  CheckCircle,
  Image as ImageIcon,
  History,
  GitBranch,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { storyAPI } from '@/services/questApi';
import { ChapterHistory } from './ChapterHistory';
import { StoryBranching } from './StoryBranching';

interface StoryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string | null;
  currentUserId?: string;
}

interface ChapterData {
  _id?: string;
  id?: string;
  title: string;
  subtitle?: string;
  order: number;
  isUnlocked?: boolean;
  unlockedAt?: string;
  content?: {
    type: string;
    text?: string;
    mediaUrl?: string;
    mediaData?: string;
    caption?: string;
  };
  unlockConditions?: {
    location?: {
      enabled: boolean;
      name?: string;
      coordinates?: { coordinates: [number, number] };
      radiusMeters?: number;
    };
    time?: {
      enabled: boolean;
      unlockAt?: string;
    };
  };
  hint?: { text?: string };
  status: 'pending' | 'approved' | 'rejected';
  parentId?: string;
  choices: { text: string; nextChapterId: string }[];
}

interface StoryData {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  shortCode?: string;
  status?: string;
  chapters?: ChapterData[];
  creator?: { _id?: string; id?: string; email?: string; name?: string };
  recipients?: { email?: string; userId?: string }[];
  settings?: {
    creatorAccessUntil?: string;
    creatorGracePeriod?: number;
    createdAt?: string;
  };
  isCollaborative?: boolean;
  isInteractive?: boolean;
  coAuthors?: { userId: any; role: string; joinedAt: string }[];
  createdAt?: string;
}

export const StoryViewModal: React.FC<StoryViewModalProps> = ({
  isOpen,
  onClose,
  storyId,
  currentUserId,
}) => {
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [gracePreview, setGracePreview] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedChapterForHistory, setSelectedChapterForHistory] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [submittingVersion, setSubmittingVersion] = useState(false);

  // Fetch story data
  const fetchStory = useCallback(async () => {
    if (!storyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await storyAPI.getOne(storyId);
      const data = res.data?.data?.story || res.data?.data || res.data?.story || res.data;
      setStory(data);

      // Auto-select first chapter or active branching chapter
      if (data?.chapters?.length > 0 && !activeChapterId) {
        setActiveChapterId(data.chapters[0]._id || data.chapters[0].id);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load story.'
      );
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    if (isOpen && storyId) {
      fetchStory();
      setUnlockError(null);
      setUnlockSuccess(false);
      setGracePreview(null);

      // Check for local grace period preview
      checkGracePeriod(storyId);
    }
  }, [isOpen, storyId, fetchStory]);

  // Check if creator is within grace period
  const checkGracePeriod = (sid: string) => {
    try {
      const graceList = JSON.parse(
        localStorage.getItem('storyGracePeriods') || '[]'
      );
      const entry = graceList.find((g: any) => g.storyId === sid);
      if (entry) {
        const until = new Date(entry.creatorAccessUntil);
        if (new Date() < until) {
          setGracePreview(entry.previewBase64);
        } else {
          // Grace period expired — clean up
          const updated = graceList.filter((g: any) => g.storyId !== sid);
          localStorage.setItem('storyGracePeriods', JSON.stringify(updated));
        }
      }
    } catch {
      // ignore localStorage errors
    }
  };

  // Get current location for unlock
  const getCurrentLocation = (): Promise<{ lat: number; lon: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          setUserLocation(loc);
          setLocationLoading(false);
          resolve(loc);
        },
        (err) => {
          setLocationLoading(false);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  // Calculate distance between two points (haversine)
  const getDistanceMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Attempt to unlock chapter
  const handleUnlock = async (chapter: ChapterData) => {
    if (!story) return;
    const sid = story._id || story.id;
    if (!sid) return;

    setUnlocking(true);
    setUnlockError(null);
    setUnlockSuccess(false);

    try {
      // Pre-check: time condition
      const timeCond = chapter.unlockConditions?.time;
      if (timeCond?.enabled && timeCond?.unlockAt) {
        const unlockDate = new Date(timeCond.unlockAt);
        if (new Date() < unlockDate) {
          throw new Error(
            `Too early! This unlocks on ${unlockDate.toLocaleString()}.`
          );
        }
      }

      // Pre-check: location condition
      let locationPayload: { latitude?: number; longitude?: number } = {};
      const locCond = chapter.unlockConditions?.location;

      if (locCond?.enabled) {
        let loc = userLocation;
        if (!loc) {
          try {
            loc = await getCurrentLocation();
          } catch {
            throw new Error(
              'Location access required. Please enable location permissions.'
            );
          }
        }

        // Check distance locally first to give better error
        if (locCond.coordinates?.coordinates) {
          const [targetLon, targetLat] = locCond.coordinates.coordinates;
          const distance = getDistanceMeters(
            loc.lat,
            loc.lon,
            targetLat,
            targetLon
          );
          const radius = locCond.radiusMeters || 80;

          if (distance > radius) {
            throw new Error(
              `You are ${Math.round(distance)}m away. You need to be within ${radius}m of "${locCond.name || 'the saved location'}".`
            );
          }
        }

        locationPayload = { latitude: loc.lat, longitude: loc.lon };
      }

      // Call unlock API
      const chapterNum = chapter.order || 1;
      await storyAPI.unlockChapter(sid, chapterNum, locationPayload);

      setUnlockSuccess(true);

      // Refresh story data to get unlocked content
      await fetchStory();

      // Clear grace period data since it's now properly unlocked
      try {
        const graceList = JSON.parse(
          localStorage.getItem('storyGracePeriods') || '[]'
        );
        const updated = graceList.filter((g: any) => g.storyId !== sid);
        localStorage.setItem('storyGracePeriods', JSON.stringify(updated));
        setGracePreview(null);
      } catch {
        // ignore
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Unlock failed. Check conditions and try again.';
      setUnlockError(message);
    } finally {
      setUnlocking(false);
    }
  };

  const handleUpdateStatus = async (chapterId: string, status: string) => {
    if (!story) return;
    const sid = story._id || story.id;
    if (!sid) return;

    setUpdatingStatus(chapterId);
    try {
      await storyAPI.updateChapterStatus(sid, chapterId, status);
      await fetchStory();
    } catch (err: any) {
      setUnlockError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAddVersion = async (chapterId: string) => {
    if (!story || !editContent.trim()) return;
    const sid = story._id || story.id;
    if (!sid) return;

    setSubmittingVersion(true);
    try {
      await storyAPI.addChapterVersion(sid, chapterId, {
        content: { text: editContent.trim() },
        commitMessage: commitMessage.trim() || undefined
      });
      setEditingChapterId(null);
      setEditContent('');
      setCommitMessage('');
      await fetchStory();
    } catch (err: any) {
      setUnlockError(err.response?.data?.message || 'Failed to add version');
    } finally {
      setSubmittingVersion(false);
    }
  };

  const isEditor = () => {
    if (!story || !currentUserId) return false;
    return (story as any).coAuthors?.some((ca: any) =>
      (ca.userId?._id || ca.userId) === currentUserId && ca.role === 'editor'
    );
  };

  // Check if current user is creator
  const isCreator = () => {
    if (!story || !currentUserId) return false;
    const creatorId = story.creator?._id || story.creator?.id;
    return creatorId === currentUserId;
  };

  // Check if within creator grace period
  const isInGracePeriod = (): boolean => {
    if (!story) return false;
    const until =
      story.settings?.creatorAccessUntil ||
      (story.createdAt
        ? new Date(
          new Date(story.createdAt).getTime() + 60 * 60 * 1000
        ).toISOString()
        : null);
    if (!until) return !!gracePreview;
    return new Date() < new Date(until);
  };

  // Format remaining time
  const formatTimeRemaining = (dateStr: string): string => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return 'Now';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {showHistory && selectedChapterForHistory && (
          <div className="absolute inset-0 z-[60]">
            <ChapterHistory
              storyId={storyId!}
              chapterId={selectedChapterForHistory}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-black">
              {story?.title || 'Story'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-black/30" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Unlock error */}
          {unlockError && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {unlockError}
            </div>
          )}

          {/* Unlock success */}
          {unlockSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Chapter unlocked successfully!
            </div>
          )}

          {/* Story info */}
          {story && !loading && (
            <>
              {story.description && (
                <p className="text-black/60 text-sm">{story.description}</p>
              )}

              {/* Short code */}
              {story.shortCode && (
                <div className="p-3 bg-gray-50 rounded-lg border border-black/5">
                  <p className="text-xs text-black/40 mb-1">Share code</p>
                  <p className="text-lg font-mono font-bold text-black tracking-wider">
                    {story.shortCode}
                  </p>
                </div>
              )}

              {/* Creator grace period notice */}
              {isCreator() && isInGracePeriod() && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  <strong>Creator preview active</strong> — You can see the
                  image now. Grace period expires in{' '}
                  {formatTimeRemaining(
                    story.settings?.creatorAccessUntil ||
                    new Date(
                      new Date(story.createdAt || '').getTime() + 3600000
                    ).toISOString()
                  )}
                  .
                </div>
              )}

              {/* Chapters */}
              {story.chapters?.map((chapter, idx) => {
                const isChapterUnlocked = chapter.isUnlocked;
                const showGracePreview =
                  !isChapterUnlocked &&
                  isCreator() &&
                  isInGracePeriod() &&
                  gracePreview;

                const timeCond = chapter.unlockConditions?.time;
                const locCond = chapter.unlockConditions?.location;
                const timeReady =
                  !timeCond?.enabled ||
                  !timeCond?.unlockAt ||
                  new Date() >= new Date(timeCond.unlockAt);
                const canAttemptUnlock = timeReady && !isChapterUnlocked;

                return (
                  <div
                    key={chapter._id || chapter.id || idx}
                    className={`rounded-xl border overflow-hidden ${isChapterUnlocked
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-black/10 bg-gray-50'
                      }`}
                  >
                    {/* Chapter header */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-2">
                        {isChapterUnlocked ? (
                          <Unlock className="w-4 h-4 text-green-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-orange-500" />
                        )}
                        <span className="font-semibold text-black text-sm">
                          {chapter.title || `Chapter ${idx + 1}`}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${isChapterUnlocked
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                          }`}
                      >
                        {isChapterUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>

                    {/* Collaboration status & Actions */}
                    {(story.isCollaborative || isCreator()) && (
                      <div className="px-4 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {chapter.status !== 'approved' && (
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${chapter.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                              }`}>
                              {chapter.status}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedChapterForHistory(chapter._id || chapter.id!);
                              setShowHistory(true);
                            }}
                            className="text-[10px] font-bold text-black/40 hover:text-black flex items-center gap-1 uppercase tracking-tighter"
                          >
                            <History className="w-3 h-3" />
                            History
                          </button>
                        </div>

                        {(isCreator() || isEditor()) && chapter.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              disabled={!!updatingStatus}
                              onClick={() => handleUpdateStatus(chapter._id || chapter.id!, 'approved')}
                              className="p-1 px-2 bg-green-600 text-white rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              <ThumbsUp className="w-3 h-3" /> Approve
                            </button>
                            <button
                              disabled={!!updatingStatus}
                              onClick={() => handleUpdateStatus(chapter._id || chapter.id!, 'rejected')}
                              className="p-1 px-2 bg-red-600 text-white rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              <ThumbsDown className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Unlocked content */}
                    {isChapterUnlocked && chapter.content && (
                      <div className="px-4 pb-4">
                        {(chapter.content.mediaUrl ||
                          chapter.content.mediaData) && (
                            <img
                              src={
                                chapter.content.mediaUrl ||
                                chapter.content.mediaData
                              }
                              alt={chapter.title}
                              className="w-full h-56 object-cover rounded-lg mb-3"
                            />
                          )}
                        {chapter.content.caption && (
                          <p className="text-black/70 text-sm italic">
                            "{chapter.content.caption}"
                          </p>
                        )}
                        {chapter.unlockedAt && (
                          <p className="text-xs text-black/40 mt-2">
                            Unlocked on{' '}
                            {new Date(chapter.unlockedAt).toLocaleString()}
                          </p>
                        )}

                        {/* Branching choices */}
                        {story.isInteractive && (chapter as any).choices?.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs font-bold text-black/40 uppercase">Choices:</p>
                            {(chapter as any).choices.map((choice: any, cIdx: number) => (
                              <button
                                key={cIdx}
                                onClick={() => setActiveChapterId(choice.nextChapterId)}
                                className="w-full p-3 bg-white border border-black/10 rounded-xl text-sm font-bold flex items-center justify-between hover:bg-black hover:text-white transition-all group"
                              >
                                {choice.text}
                                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Version Edit Form */}
                    {story.isCollaborative && isCreator() === false && isChapterUnlocked && (
                      <div className="px-4 pb-4 mt-2 border-t border-black/5 pt-4">
                        {editingChapterId === (chapter._id || chapter.id) ? (
                          <div className="space-y-3">
                            <textarea
                              id={`edit-content-${chapter._id || chapter.id}`}
                              name={`edit-content-${chapter._id || chapter.id}`}
                              aria-label="Suggest an improvement or update"
                              placeholder="Suggest an improvement or update..."
                              className="w-full p-3 text-sm border border-black/10 rounded-xl focus:ring-0 resize-none"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={3}
                            />
                            <input
                              id={`commit-message-${chapter._id || chapter.id}`}
                              name={`commit-message-${chapter._id || chapter.id}`}
                              aria-label="Commit message (optional)"
                              placeholder="Commit message (optional)"
                              className="w-full p-2 text-xs border border-black/10 rounded-lg focus:ring-0"
                              value={commitMessage}
                              onChange={(e) => setCommitMessage(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddVersion(chapter._id || chapter.id!)}
                                disabled={submittingVersion || !editContent.trim()}
                                className="flex-1 py-2 bg-black text-white text-xs font-bold rounded-lg disabled:opacity-50"
                              >
                                {submittingVersion ? 'Submitting...' : 'Submit Version'}
                              </button>
                              <button
                                onClick={() => setEditingChapterId(null)}
                                className="px-4 py-2 border border-black/10 text-xs font-bold rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingChapterId(chapter._id || chapter.id!);
                              setEditContent(chapter.content?.text || '');
                            }}
                            className="w-full py-2 border border-black/10 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Propose Changes
                          </button>
                        )}
                      </div>
                    )}

                    {/* Grace period preview (creator only, first hour) */}
                    {showGracePreview && (
                      <div className="px-4 pb-4">
                        <div className="relative">
                          <img
                            src={gracePreview!}
                            alt="Creator preview"
                            className="w-full h-56 object-cover rounded-lg"
                          />
                          <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            Preview only
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          This preview is only visible to you during the grace
                          period.
                        </p>
                      </div>
                    )}

                    {/* Lock conditions info (always visible) */}
                    {!isChapterUnlocked && (
                      <div className="px-4 pb-4 space-y-2">
                        {/* Time condition */}
                        {timeCond?.enabled && timeCond?.unlockAt && (
                          <div
                            className={`flex items-center gap-2 text-sm p-2 rounded-lg ${timeReady
                              ? 'bg-green-50 text-green-700'
                              : 'bg-orange-50 text-orange-700'
                              }`}
                          >
                            <Clock className="w-4 h-4 shrink-0" />
                            <div>
                              <span className="font-medium">
                                {timeReady ? '✓ Time ready' : 'Unlocks on:'}
                              </span>{' '}
                              {new Date(timeCond.unlockAt).toLocaleString()}
                              {!timeReady && (
                                <span className="block text-xs mt-0.5">
                                  {formatTimeRemaining(timeCond.unlockAt)}{' '}
                                  remaining
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Location condition */}
                        {locCond?.enabled && (
                          <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-blue-50 text-blue-700">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <div>
                              <span className="font-medium">
                                {locCond.name || 'Saved location'}
                              </span>
                              <span className="block text-xs mt-0.5">
                                Must be within{' '}
                                {locCond.radiusMeters || 80}m of the saved spot
                              </span>
                              {locCond.coordinates?.coordinates && (
                                <span className="block text-xs text-blue-500">
                                  📍{' '}
                                  {locCond.coordinates.coordinates[1].toFixed(4)}
                                  ,{' '}
                                  {locCond.coordinates.coordinates[0].toFixed(4)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Hint */}
                        {chapter.hint?.text && (
                          <p className="text-xs text-black/50 italic px-2">
                            💡 {chapter.hint.text}
                          </p>
                        )}

                        {/* Unlock button */}
                        <button
                          onClick={() => handleUnlock(chapter)}
                          disabled={unlocking || !timeReady}
                          className={`w-full mt-2 py-3 rounded-lg text-sm font-medium
                                     flex items-center justify-center gap-2 transition-colors
                                     ${timeReady
                              ? 'bg-black text-white hover:bg-black/80'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            } disabled:opacity-50`}
                        >
                          {unlocking ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Checking conditions…
                            </>
                          ) : locationLoading ? (
                            <>
                              <Navigation className="w-4 h-4 animate-pulse" />
                              Getting your location…
                            </>
                          ) : timeReady ? (
                            <>
                              <Unlock className="w-4 h-4" />
                              Attempt Unlock
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              Not yet — {formatTimeRemaining(timeCond!.unlockAt!)}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* No chapters */}
              {(!story.chapters || story.chapters.length === 0) && (
                <div className="text-center py-8 text-black/40">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No chapters in this story yet.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-black/5">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-black
                       hover:bg-black/5 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};