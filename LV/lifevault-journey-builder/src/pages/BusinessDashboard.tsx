import React, { useEffect, useState } from 'react';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { questAPI } from '@/services/questApi';
import { useAuth } from '@/context/AuthContext';
import {
  MapPin,
  Target,
  Trophy,
  Plus,
  Compass,
  Clock,
  Camera,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Loader2,
  Building2,
  Heart,
  CheckCircle2,
  AlertCircle,
  Zap,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreatorQuest {
  _id: string;
  title: string;
  description: string;
  questType: string;
  status: string;
  category: string;
  difficulty: string;
  location?: {
    name?: string;
    address?: string;
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
    radiusMeters?: number;
  };
  rewards?: {
    aptAmount?: number;
    points?: number;
  };
  stats?: {
    totalCompletions: number;
    totalAttempts: number;
  };
}

const BusinessDashboard: React.FC = () => {
  const { user } = useAuth();

  const [quests, setQuests] = useState<CreatorQuest[]>([]);
  const { toast } = useToast();
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [businessStats, setBusinessStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [radius, setRadius] = useState<string>('100');
  const [category, setCategory] = useState('other');
  const [difficulty, setDifficulty] = useState('easy');
  const [aptReward, setAptReward] = useState<string>('0.5');
  const [pointsReward, setPointsReward] = useState<string>('50');
  const [maxCompletions, setMaxCompletions] = useState<string>('100');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiPrompt, setAiPrompt] = useState(
    'Photo should clearly show the location landmark and the user in front of it.',
  );
  const [aiRequiredObjects, setAiRequiredObjects] = useState('person, landmark');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCreatorQuests();
    fetchBusinessStats();
  }, []);

  const fetchCreatorQuests = async () => {
    setLoadingQuests(true);
    try {
      const params: any = {
        status: 'all',
        limit: 50,
      };
      if (user?.id) {
        params.creatorId = user.id;
      }
      const res = await questAPI.getAll(params);
      const data = res.data?.data?.quests || res.data?.data || [];
      setQuests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load quests:', err);
      setQuests([]);
    }
    setLoadingQuests(false);
  };

  const fetchBusinessStats = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/business/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBusinessStats(data.data);
      }
    } catch (err) {
      console.error('Failed to load business stats:', err);
    }
    setLoadingStats(false);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setFormError(null);
        toast({
          title: "Location Captured",
          description: `Coordinates updated: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
        });
      },
      () => {
        setFormError('Could not access your location. Please allow location permission.');
        toast({
          title: "GPS Error",
          description: "Could not access your location. Please check browser permissions.",
          variant: "destructive"
        });
      },
      { enableHighAccuracy: true },
    );
  };

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();

    setFormError(null);
    setFormSuccess(null);

    if (!title || !description) {
      setFormError('Title and description are required.');
      return;
    }

    if (!latitude || !longitude) {
      setFormError('Please set the quest latitude and longitude (or use current location).');
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusMeters = parseInt(radius || '100', 10);
    const aptAmount = parseFloat(aptReward || '0');
    const points = parseInt(pointsReward || '0', 10);
    const maxComp = parseInt(maxCompletions || '0', 10) || null;

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setFormError('Latitude and longitude must be valid numbers.');
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setFormError('Latitude must be between -90 and 90, longitude between -180 and 180.');
      return;
    }

    const totalApt = maxComp && aptAmount > 0 ? aptAmount * maxComp : aptAmount * 100;

    const aiConfig = aiEnabled
      ? {
        enabled: true,
        prompt: aiPrompt,
        requiredObjects: aiRequiredObjects
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        minimumConfidence: 0.75,
        rejectBlurry: true,
        requireFace: false,
        requireSelfie: false,
      }
      : {
        enabled: false,
      };

    const payload: any = {
      title,
      description,
      questType: 'location',
      category,
      difficulty,
      location: {
        name: placeName || 'Quest Location',
        address: address || undefined,
        coordinates: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        radiusMeters: radiusMeters || 100,
      },
      rewards: {
        aptAmount: aptAmount || 0,
        points: points || 0,
      },
      budget: {
        totalAptAllocated: totalApt,
        aptRemaining: totalApt,
        maxCompletions: maxComp,
        maxCompletionsPerUser: 1,
      },
      aiVerification: aiConfig,
    };

    setSubmitting(true);
    try {
      const res = await questAPI.create(payload);
      const created = res.data?.data;

      if (created?._id) {
        await questAPI.activate(created._id);
      }

      setFormSuccess('Quest created and activated successfully. It is now visible on the Quest Map.');
      toast({
        title: "Quest Published",
        description: `"${title}" is now live and visible on the Quest Map!`
      });
      setTitle('');
      setDescription('');
      setPlaceName('');
      setAddress('');
      setRadius('100');
      setAptReward('0.5');
      setPointsReward('50');
      setMaxCompletions('100');

      await fetchCreatorQuests();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && Array.isArray(err.response.data.errors)
          ? err.response.data.errors.join(', ')
          : null) ||
        'Failed to create quest. Please check your inputs.';
      setFormError(msg);
    }
    setSubmitting(false);
  };

  const toggleQuestStatus = async (quest: CreatorQuest) => {
    try {
      if (quest.status === 'active') {
        await questAPI.pause(quest._id);
        toast({
          title: "Quest Paused",
          description: `"${quest.title}" has been taken offline.`
        });
      } else if (quest.status === 'paused' || quest.status === 'draft') {
        await questAPI.activate(quest._id);
        toast({
          title: "Quest Activated",
          description: `"${quest.title}" is now live on the map!`
        });
      }
      await fetchCreatorQuests();
    } catch (err) {
      console.error('Failed to update quest status:', err);
      setFormError('Failed to update quest status.');
      toast({
        title: "Update Failed",
        description: "There was an error updating the quest status.",
        variant: "destructive"
      });
    }
  };

  // Calculate stats
  const activeQuests = quests.filter(q => q.status === 'active').length;
  const totalCompletions = quests.reduce((acc, q) => acc + (q.stats?.totalCompletions || 0), 0);
  const totalRewardsGiven = quests.reduce((acc, q) => {
    const completions = q.stats?.totalCompletions || 0;
    const apt = q.rewards?.aptAmount || 0;
    return acc + (completions * apt);
  }, 0);

  // Use business stats from API if available, otherwise calculate from quests
  const totalAptAllocated = businessStats?.totalAptAllocated || 0;
  const totalAptRewarded = businessStats?.totalAptRewarded || totalRewardsGiven;
  const aptRemaining = businessStats?.aptRemaining || (totalAptAllocated - totalAptRewarded);

  return (
    <BusinessLayout>
      <div className="min-h-screen space-y-6 pb-8">

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-40 -mb-40 blur-3xl"></div>

          <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-yellow-300" />
              <span className="text-white/90 text-sm font-semibold tracking-wide">Business Portal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
              Quest Dashboard <br className="sm:hidden" />
              <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                for Businesses
              </span>
            </h1>

            <p className="text-white/90 text-base sm:text-lg max-w-2xl leading-relaxed">
              Create location-based quests for your business. Users visit, upload live photos, and earn rewards through GPS & AI verification.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-500">Total Quests</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{quests.length}</p>
          </div>

          <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-gray-500">Active Quests</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{activeQuests}</p>
          </div>

          <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-semibold text-gray-500">Total Check-ins</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{totalCompletions}</p>
          </div>

          <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-gray-500">APT Rewards</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{totalAptRewarded.toFixed(2)}</p>
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Allocated:</span>
                <span className="font-semibold text-gray-700">{totalAptAllocated.toFixed(2)} APT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Remaining:</span>
                <span className="font-semibold text-green-600">{Math.max(0, aptRemaining).toFixed(2)} APT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-500 rounded-xl">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-blue-900">Real-world Check-ins</h3>
            </div>
            <p className="text-sm text-blue-700 leading-relaxed">
              Users must physically visit your location and upload a live photo to complete quests.
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-100 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-500 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-green-900">GPS + AI Verification</h3>
            </div>
            <p className="text-sm text-green-700 leading-relaxed">
              Backend verifies exact coordinates and photo content before issuing rewards.
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-100 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-amber-500 rounded-xl">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-amber-900">APT Rewards</h3>
            </div>
            <p className="text-sm text-amber-700 leading-relaxed">
              Set custom APT rewards per successful check-in. Example: <strong>0.5 APT</strong> per visit.
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Creation Form - Takes more space */}
          <div className="xl:col-span-3">
            <form
              onSubmit={handleCreateQuest}
              className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm"
            >
              {/* Form Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">Create New Quest</h2>
                  <p className="text-sm text-gray-500">Fill in the details to create a location-based quest</p>
                </div>
              </div>

              {/* Error Message */}
              {formError && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{formError}</p>
                </div>
              )}

              {/* Success Message */}
              {formSuccess && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 font-medium">{formSuccess}</p>
                </div>
              )}

              {/* Basic Info Section */}
              <div className="space-y-5 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Quest Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Taj Mahal Sunrise Check-in"
                    className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain what users must do at your location (e.g. take a selfie with the main gate, capture your coffee cup with the logo, etc.)"
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>

              {/* Location Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-blue-900">Quest Location</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1.5">
                      Place / Business Name
                    </label>
                    <input
                      type="text"
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      placeholder="e.g. Taj Mahal, Blue Cup Café"
                      className="w-full h-11 px-4 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1.5">
                      Radius (meters)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={5000}
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      className="w-full h-11 px-4 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-blue-700 mb-1.5">
                    Address (optional)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Short description or address for users"
                    className="w-full h-11 px-4 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1.5">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g. 27.1751"
                      className="w-full h-11 px-4 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1.5">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g. 78.0421"
                      className="w-full h-11 px-4 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      className="w-full h-11 px-4 bg-white border-2 border-blue-300 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
                    >
                      <Compass className="w-4 h-4" />
                      <span className="hidden sm:inline">Use Current</span>
                      <span className="sm:hidden">GPS</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Category & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="adventure">🏔️ Adventure / Tourism</option>
                    <option value="food">🍕 Food / Café</option>
                    <option value="culture">🏛️ Culture / Museum</option>
                    <option value="shopping">🛍️ Shopping / Retail</option>
                    <option value="nature">🌿 Nature / Park</option>
                    <option value="entertainment">🎯 Entertainment</option>
                    <option value="sports">⚽ Sports</option>
                    <option value="education">📚 Education</option>
                    <option value="other">🗺️ Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="easy">⭐ Easy</option>
                    <option value="medium">⭐⭐ Medium</option>
                    <option value="hard">⭐⭐⭐ Hard</option>
                    <option value="expert">⭐⭐⭐⭐ Expert</option>
                  </select>
                </div>
              </div>

              {/* Rewards Section */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-100 rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-amber-900">Rewards</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-amber-700 mb-1.5">
                      APT per completion
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={aptReward}
                      onChange={(e) => setAptReward(e.target.value)}
                      className="w-full h-11 px-4 bg-white border-2 border-amber-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-700 mb-1.5">
                      Points per completion
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={pointsReward}
                      onChange={(e) => setPointsReward(e.target.value)}
                      className="w-full h-11 px-4 bg-white border-2 border-amber-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-700 mb-1.5">
                      Max completions
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={maxCompletions}
                      onChange={(e) => setMaxCompletions(e.target.value)}
                      className="w-full h-11 px-4 bg-white border-2 border-amber-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs text-amber-700 bg-amber-100/50 rounded-lg px-3 py-2">
                  💡 Example: 0.5 APT reward with 100 max completions = <strong>50 APT</strong> total budget.
                </p>
              </div>

              {/* AI Verification Section */}
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-100 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500 rounded-lg">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-violet-900">AI Photo Verification</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiEnabled}
                      onChange={(e) => setAiEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>

                {aiEnabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-violet-700 mb-1.5">
                        AI Prompt
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-3 bg-white border-2 border-violet-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-violet-700 mb-1.5">
                        Required Objects (comma separated)
                      </label>
                      <input
                        type="text"
                        value={aiRequiredObjects}
                        onChange={(e) => setAiRequiredObjects(e.target.value)}
                        placeholder="e.g. person, Taj Mahal, coffee cup"
                        className="w-full h-11 px-4 bg-white border-2 border-violet-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                      />
                    </div>
                    <p className="text-xs text-violet-700 bg-violet-100/50 rounded-lg px-3 py-2">
                      🤖 Our AI will verify that uploaded photos match the required scene before rewarding users.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-base shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Quest...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create & Publish Quest
                  </>
                )}
              </button>

              <p className="mt-4 text-xs text-gray-500 text-center leading-relaxed">
                Once created, your quest appears instantly on the Quest Map. Users will discover it based on GPS proximity and can complete it with live photos.
              </p>
            </form>
          </div>

          {/* Quests List */}
          <div className="xl:col-span-2">
            <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm sticky top-24">
              {/* List Header */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gray-100 rounded-xl">
                    <Clock className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Your Quests</h2>
                    <p className="text-xs text-gray-500">{quests.length} total quests</p>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loadingQuests ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-gray-500 font-medium">Loading quests...</p>
                </div>
              ) : quests.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-700 mb-1">No Quests Yet</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    Create your first quest to start attracting visitors to your location.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {quests.map((q) => (
                    <div
                      key={q._id}
                      className="group p-4 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-lg flex-shrink-0 shadow-sm">
                          📌
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-gray-900 truncate">{q.title || 'Untitled Quest'}</h3>
                            <span
                              className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${q.status === 'active'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : q.status === 'paused'
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                            >
                              {q.status || 'draft'}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                            {q.description?.slice(0, 100) || 'No description'}{q.description && q.description.length > 100 ? '…' : ''}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {q.location?.name && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                                <MapPin className="w-3 h-3" /> {q.location.name}
                              </span>
                            )}
                            {typeof q.rewards?.aptAmount === 'number' && q.rewards.aptAmount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">
                                <Trophy className="w-3 h-3" /> {q.rewards.aptAmount} APT
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-2 py-1 rounded-lg">
                              <TrendingUp className="w-3 h-3" /> {q.stats?.totalCompletions || 0} completions
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleQuestStatus(q)}
                            className={`w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${q.status === 'active'
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                              }`}
                          >
                            {q.status === 'active' ? (
                              <>
                                <PauseCircle className="w-4 h-4" /> Pause Quest
                              </>
                            ) : (
                              <>
                                <PlayCircle className="w-4 h-4" /> Activate Quest
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessDashboard;