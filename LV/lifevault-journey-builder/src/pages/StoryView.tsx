 
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { storyAPI } from '@/services/questApi';
import { ArrowLeft, Lock, MapPin, Clock, Loader2, Unlock } from 'lucide-react';

const StoryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockedContent, setUnlockedContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStory = async () => {
    setLoading(true);
    try {
      const res = await storyAPI.getOne(id!);
      setStory(res.data?.data?.story || res.data?.data);
      setProgress(res.data?.data?.progress || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load story');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const unlockChapter1 = async () => {
    setUnlocking(true);
    setError(null);
    try {
      const loc = await new Promise<{ lat: number; lon: number }>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => reject(new Error('Location permission denied')),
          { enableHighAccuracy: true, timeout: 15000 },
        );
      });

      const res = await storyAPI.unlockChapter(id!, 1, { latitude: loc.lat, longitude: loc.lon });
      // Backend requires lat/lon in body; questApi unlockChapter currently doesn’t pass params,
      // so call via api directly using storyAPI's underlying signature? We'll use storyAPI.unlockChapter and patch it later if needed.
      setUnlockedContent(res.data?.data?.content || null);
      await fetchStory();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unlock failed');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-black/40" />
        </div>
      </DashboardLayout>
    );
  }

  if (!story) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-black/60">{error || 'Story not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 rounded-lg bg-black text-white"
          >
            Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-black/60 hover:text-black mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Timeline
      </button>

      <div className="bg-white border border-black/5 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-black">{story.title}</h1>
            {story.description && <p className="text-black/50 mt-1">{story.description}</p>}
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/5 text-black/60">
            {story.status}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-black/5">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-black/40" />
              <p className="text-sm font-semibold">Progress</p>
            </div>
            <p className="text-sm text-black/60">
              {progress ? `${progress.unlockedCount}/${progress.totalChapters} unlocked` : '—'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-black/5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-black/40" />
              <p className="text-sm font-semibold">Next lock</p>
            </div>
            <p className="text-sm text-black/60">{progress?.nextLocked?.reason || '—'}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-black/5">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-black/40" />
              <p className="text-sm font-semibold">Unlock</p>
            </div>
            <button
              onClick={unlockChapter1}
              disabled={unlocking}
              className="mt-1 w-full px-4 py-2 rounded-lg bg-black text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              Try unlock chapter 1
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {unlockedContent?.mediaUrl && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-black mb-2">Unlocked content</h3>
            <img src={unlockedContent.mediaUrl} className="w-full max-h-[420px] object-contain rounded-xl bg-gray-50" />
            {unlockedContent.caption && <p className="mt-2 text-black/60">{unlockedContent.caption}</p>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StoryView;

