// file: src/pages/QuestMap.tsx

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { questAPI } from '@/services/questApi';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Filter, ChevronRight, Loader2, Crosshair, Trophy, Zap, Target, Map as MapIcon, Sparkles, Activity, Shield, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

// Fix leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom quest marker icons
const createQuestIcon = (category: string, difficulty: string) => {
    const colors: Record<string, string> = {
        adventure: '#f59e0b',
        food: '#ef4444',
        culture: '#8b5cf6',
        shopping: '#3b82f6',
        nature: '#22c55e',
        entertainment: '#ec4899',
        sports: '#f97316',
        education: '#06b6d4',
        other: '#6b7280',
    };
    const color = colors[category || 'other'] || colors.other;
    const safeDifficulty = difficulty || 'easy';

    return L.divIcon({
        className: 'custom-quest-marker',
        html: `<div style="
      width: 40px; height: 40px; 
      background: ${color}; 
      border: 3px solid white; 
      border-radius: 50% 50% 50% 0; 
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    ">
      <span style="transform: rotate(45deg); color: white; font-size: 14px; font-weight: bold;">
        ${safeDifficulty === 'easy' ? '★' : safeDifficulty === 'medium' ? '★★' : '★★★'}
      </span>
    </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
    });
};

// User location icon
const userIcon = L.divIcon({
    className: 'user-location-marker',
    html: `<div style="
    width: 20px; height: 20px; 
    background: #3b82f6; 
    border: 4px solid white; 
    border-radius: 50%; 
    box-shadow: 0 0 0 8px rgba(59,130,246,0.25), 0 4px 12px rgba(0,0,0,0.3);
  "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Recenter map component
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        if (map && lat && lng) {
            map.setView([lat, lng], 14);
        }
    }, [lat, lng, map]);
    return null;
}

interface Quest {
    _id: string;
    title: string;
    description: string;
    questType: string;
    category: string;
    difficulty: string;
    status: string;
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
    coverImage?: string;
    tags?: string[];
    creatorId?: any;
    userCompleted?: boolean;
}

const CATEGORIES = [
    { value: 'all', label: 'All', emoji: '🗺️' },
    { value: 'adventure', label: 'Adventure', emoji: '🏔️' },
    { value: 'food', label: 'Food', emoji: '🍕' },
    { value: 'culture', label: 'Culture', emoji: '🏛️' },
    { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
    { value: 'nature', label: 'Nature', emoji: '🌿' },
    { value: 'entertainment', label: 'Fun', emoji: '🎯' },
    { value: 'sports', label: 'Sports', emoji: '⚽' },
    { value: 'education', label: 'Learn', emoji: '📚' },
];

const DIFFICULTIES = [
    { value: 'all', label: 'All Levels' },
    { value: 'easy', label: '⭐ Easy' },
    { value: 'medium', label: '⭐⭐ Medium' },
    { value: 'hard', label: '⭐⭐⭐ Hard' },
];

const QuestMap: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeDifficulty, setActiveDifficulty] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 20.5937, lng: 78.9629 });
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<any>(null);

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(loc);
                    setMapCenter(loc);
                },
                () => {
                    console.warn('Location access denied, using default');
                },
                { enableHighAccuracy: true }
            );
        }
    }, []);

    // Fetch quests
    useEffect(() => {
        fetchQuests();
    }, [activeCategory, activeDifficulty]);

    const fetchQuests = async () => {
        setLoading(true);
        try {
            const params: any = { status: 'all', limit: 100 };
            if (activeCategory !== 'all') params.category = activeCategory;
            if (activeDifficulty !== 'all') params.difficulty = activeDifficulty;
            if (searchQuery) params.search = searchQuery;

            const res = await questAPI.getAll(params);
            const data = res.data?.data?.quests || res.data?.data || [];
            setQuests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch quests:', err);
            setQuests([]);
        }
        setLoading(false);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Searching Quests",
            description: `Looking for nearby challenges...`
        });
        fetchQuests();
    };

    const questsWithLocation = quests.filter(
        (q) => q.location?.coordinates?.coordinates?.length === 2
    );

    const questsListView = quests;

    const getDifficultyColor = (d?: string) => {
        switch (d?.toLowerCase()) {
            case 'easy': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            case 'expert': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    const getDifficultyLabel = (d?: string) => {
        if (!d) return 'Unknown';
        return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
    };

    const getCategoryEmoji = (category?: string) => {
        return CATEGORIES.find(c => c.value === category)?.emoji || '🗺️';
    };

    const centerOnUser = () => {
        if (userLocation) {
            toast({
                title: "Location detected",
                description: "Map centered on your current position."
            });
            setMapCenter({ ...userLocation });
        } else {
            toast({
                title: "Location unavailable",
                description: "Please enable location access to center the map.",
                variant: "destructive"
            });
        }
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen space-y-8 pb-12">

                {/* ── Hero Header ──────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-3xl p-8 sm:p-12"
                >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Location Tracking Active</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                                Explore Challenges
                            </h1>
                            <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                                Discover unique opportunities around you, complete verification tasks, and build your digital history through real-world interactions.
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-8">
                                <button
                                    onClick={() => centerOnUser()}
                                    className="flex items-center gap-2.5 px-7 py-3.5 bg-white text-slate-900 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                                >
                                    <Crosshair className="w-4 h-4" /> My Location
                                </button>
                                <div className="flex items-center gap-2 px-5 py-3.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl text-white/70 text-sm font-medium">
                                    <Activity className="w-4 h-4" />
                                    <span>{questsListView.length} nearby locations discovered</span>
                                </div>
                            </div>
                        </div>

                        {/* User Stats */}
                        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible no-scrollbar">
                            {[
                                { val: `Level ${user?.level?.current || 1}`, label: 'Experience Level', icon: Zap },
                                { val: String(user?.points?.current || 0), label: 'Reward Points', icon: Trophy },
                                { val: String(user?.questStats?.totalCompleted || 0), label: 'Challenges Completed', icon: Target },
                            ].map((s, i) => (
                                <div key={i} className="px-5 py-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 min-w-[180px]">
                                    <div className="flex items-center gap-3">
                                        <s.icon className="w-4 h-4 text-indigo-300" />
                                        <div>
                                            <p className="text-white font-bold text-lg">{s.val}</p>
                                            <p className="text-slate-400 text-xs">{s.label}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* ── Search & Filters ────────────────────────────────── */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <form onSubmit={handleSearch} className="relative w-full md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            id="quest-search"
                            name="quest-search"
                            aria-label="Search locations or challenges"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search locations or challenges..."
                            className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all shadow-sm"
                        />
                    </form>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => setActiveCategory(cat.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${activeCategory === cat.value
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-slate-100'
                                    }`}
                            >
                                {cat.emoji} {cat.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2.5 rounded-lg transition-all border ${showFilters
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Difficulty Filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-wrap gap-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-full mb-1">Complexity Level</span>
                                {DIFFICULTIES.map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => setActiveDifficulty(d.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeDifficulty === d.value
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-100 shadow-sm'
                                            }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Map Container ───────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-xl bg-slate-50 min-h-[500px]"
                >
                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 z-[1000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                            <p className="text-sm font-bold text-slate-600 tracking-wide uppercase">Connecting to global grid...</p>
                        </div>
                    )}

                    {/* Leaflet Map */}
                    <MapContainer
                        center={[mapCenter.lat, mapCenter.lng]}
                        zoom={13}
                        style={{ height: '550px', width: '100vw' }}
                        ref={mapRef}
                        className="z-0"
                        whenReady={() => setMapReady(true)}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {mapReady && <RecenterMap lat={mapCenter.lat} lng={mapCenter.lng} />}

                        {/* User location */}
                        {userLocation && mapReady && (
                            <>
                                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                                    <Popup>
                                        <div className="text-center p-2 font-bold text-slate-900">
                                            Current Position
                                        </div>
                                    </Popup>
                                </Marker>
                                <Circle
                                    center={[userLocation.lat, userLocation.lng]}
                                    radius={400}
                                    pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.1, weight: 1 }}
                                />
                            </>
                        )}

                        {/* Quest markers */}
                        {mapReady && questsWithLocation.map((quest) => {
                            const [lng, lat] = quest.location!.coordinates!.coordinates;
                            return (
                                <Marker
                                    key={quest._id}
                                    position={[lat, lng]}
                                    icon={createQuestIcon(quest.category || 'other', quest.difficulty || 'easy')}
                                    eventHandlers={{
                                        click: () => setSelectedQuest(quest),
                                    }}
                                >
                                    <Popup className="premium-popup">
                                        <div className="min-w-[240px] p-3">
                                            <h3 className="font-bold text-slate-900 text-base mb-1.5">{quest.title || 'Untitled Challenge'}</h3>
                                            <p className="text-slate-500 text-xs mb-3 line-clamp-2 leading-relaxed">
                                                {quest.description || 'No description available for this challenge.'}
                                            </p>

                                            <div className="flex items-center justify-between mb-3 text-sm">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rewards</span>
                                                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                                                        <Trophy className="w-3.5 h-3.5" />
                                                        {quest.rewards?.points || 0} pts
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Complexity</span>
                                                    <div className="text-indigo-600 font-bold text-xs">{getDifficultyLabel(quest.difficulty)}</div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => navigate(`/quests/${quest._id}`)}
                                                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-md"
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>

                    {/* Map Overlays */}
                    <div className="absolute top-4 left-4 z-[500]">
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-slate-100 shadow-xl">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-slate-900 text-sm font-bold">
                                    {questsWithLocation.length} active nodes discovered
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-4 right-4 z-[500]">
                        <button
                            onClick={centerOnUser}
                            className="p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl hover:bg-slate-800 transition-all group active:scale-95"
                        >
                            <Crosshair className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>
                </motion.div>

                {/* ── Quest List Section ──────────────────────────────── */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Challenge Catalog</h2>
                            <p className="text-sm font-medium text-slate-500 mt-1">{questsListView.length} active opportunities synchronized</p>
                        </div>
                    </div>

                    {/* Quest cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {questsListView.map((quest, idx) => (
                            <motion.div
                                key={quest._id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                onClick={() => navigate(`/quests/${quest._id}`)}
                                className="group bg-white rounded-3xl border border-slate-100 overflow-hidden cursor-pointer hover:border-slate-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                            >
                                {/* Card Header */}
                                <div
                                    className="h-40 flex items-center justify-center relative overflow-hidden shrink-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${getDifficultyColor(quest.difficulty)}15, ${getDifficultyColor(quest.difficulty)}05)`
                                    }}
                                >
                                    <span className="text-6xl group-hover:scale-110 transition-transform duration-500 relative z-10 drop-shadow-sm">
                                        {getCategoryEmoji(quest.category)}
                                    </span>

                                    {/* Badges */}
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <div
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm uppercase tracking-wider"
                                            style={{ backgroundColor: getDifficultyColor(quest.difficulty) }}
                                        >
                                            {getDifficultyLabel(quest.difficulty)}
                                        </div>
                                        {quest.userCompleted && (
                                            <div className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                Verified
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col flex-grow">
                                    <div className="flex-grow">
                                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                            {quest.title || 'Untitled Challenge'}
                                        </h3>
                                        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed font-medium">
                                            {quest.description || 'Participate and complete this challenge to earn secure distribution rewards.'}
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-50">
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="flex items-center gap-1.5 text-amber-500 font-bold">
                                                <Sparkles className="w-3.5 h-3.5" /> {quest.rewards?.points || 0} Points
                                            </span>
                                            {quest.location?.name && (
                                                <>
                                                    <span className="text-slate-200">·</span>
                                                    <span className="text-slate-400 text-xs font-bold truncate max-w-[90px] uppercase tracking-wide">{quest.location.name}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Empty state */}
                    {questsListView.length === 0 && !loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-20 rounded-3xl border-2 border-dashed border-slate-200 text-center bg-slate-50/50"
                        >
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Search className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No Challenges Found</h3>
                            <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto mb-8">
                                We couldn't find any challenges matching your criteria. Try adjusting your search or filters to explore more.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setActiveCategory('all');
                                    setActiveDifficulty('all');
                                    toast({
                                        title: "Filters Cleared",
                                        description: "Showing all available challenges."
                                    });
                                }}
                                className="px-8 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                            >
                                Reset Search
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .premium-popup .leaflet-popup-content-wrapper {
                    background: white !important;
                    color: #0f172a !important;
                    border-radius: 16px !important;
                    padding: 0 !important;
                    border: 1px solid #f1f5f9 !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
                }
                .premium-popup .leaflet-popup-content {
                    margin: 0 !important;
                }
                .premium-popup .leaflet-popup-tip {
                    background: white !important;
                    border: 1px solid #f1f5f9 !important;
                }
            `}</style>
        </DashboardLayout>
    );
};

export default QuestMap;