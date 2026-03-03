import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { campaignAPI } from '@/services/questApi';
import {
    Trophy, Users, ChevronRight, Loader2, Target, Gift, Zap,
    CheckCircle2, Clock, Heart, Sparkles, Shield, Activity, Search, Filter, Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Campaign {
    _id: string;
    name: string;
    description?: string;
    brandName?: string;
    coverImage?: string;
    status: string;
    rewards?: {
        grandPrize?: {
            aptAmount?: number;
            description?: string;
        };
    };
    quests?: any[];
    questCount?: number;
    stats?: {
        totalParticipants?: number;
        totalCompletions?: number;
    };
    userProgress?: {
        completedQuests?: number;
        totalQuests?: number;
        isCompleted?: boolean;
    };
}

const Campaigns: React.FC = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [joinedCampaigns, setJoinedCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'discover' | 'joined'>('discover');
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [filterText, setFilterText] = useState('');
    const listRef = React.useRef<HTMLDivElement>(null);

    const scrollToDiscover = () => {
        setActiveTab('discover');
        setTimeout(() => {
            listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allRes, joinedRes] = await Promise.all([
                campaignAPI.getAll(),
                campaignAPI.getJoined().catch(() => ({ data: { data: [] } }))
            ]);
            setCampaigns(allRes.data?.data?.campaigns || allRes.data?.data || []);
            setJoinedCampaigns(joinedRes.data?.data?.campaigns || joinedRes.data?.data || []);
        } catch (err) {
            console.error('Failed to load campaigns:', err);
        }
        setLoading(false);
    };

    const handleJoin = async (campaignId: string) => {
        setJoiningId(campaignId);
        try {
            await campaignAPI.join(campaignId);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to join campaign');
        }
        setJoiningId(null);
    };

    const handleCheckCompletion = async (campaignId: string) => {
        try {
            const res = await campaignAPI.checkCompletion(campaignId);
            if (res.data?.data?.isCompleted) {
                alert('Congratulations! You have completed all quests in this campaign!');
                fetchData();
            } else {
                alert(`You've completed ${res.data?.data?.completedQuests || 0} / ${res.data?.data?.totalQuests || 0} quests.`);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to check completion');
        }
    };

    const baseCampaigns = activeTab === 'joined' ? joinedCampaigns : campaigns;
    const displayCampaigns = baseCampaigns.filter(c =>
        !filterText || c.name.toLowerCase().includes(filterText.toLowerCase())
    );

    const getProgressPercent = (campaign: Campaign) => {
        if (campaign.userProgress) {
            const { completedQuests = 0, totalQuests = 1 } = campaign.userProgress;
            return Math.round((completedQuests / totalQuests) * 100);
        }
        return 0;
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
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Live Campaigns</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                                Brand Campaigns
                            </h1>
                            <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                                Partner with leading brands and complete exclusive quests to unlock premium rewards, rare collectibles, and APT prizes.
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-8">
                                <button
                                    onClick={scrollToDiscover}
                                    className="flex items-center gap-2.5 px-7 py-3.5 bg-white text-slate-900 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                                >
                                    <Search className="w-4 h-4" /> Discover More
                                </button>
                                <div className="flex items-center gap-2 px-5 py-3.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl text-white/70 text-sm">
                                    <Rocket className="w-4 h-4" />
                                    <span>{campaigns.length} active campaigns</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible">
                            {[
                                { val: String(campaigns.length), label: 'Available', icon: Trophy },
                                { val: String(joinedCampaigns.length), label: 'Joined', icon: Target },
                                { val: campaigns.reduce((acc, c) => acc + (c.rewards?.grandPrize?.aptAmount || 0), 0) + ' APT', label: 'Prize Pool', icon: Gift },
                            ].map((s, i) => (
                                <div key={i} className="px-5 py-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 min-w-[160px]">
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

                {/* ── Tabs & Filter ──────────────────────────────── */}
                <div ref={listRef} className="flex flex-col md:flex-row items-center justify-between gap-4 scroll-mt-8">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {[
                            { id: 'discover', label: 'All Campaigns', count: campaigns.length },
                            { id: 'joined', label: 'My Progress', count: joinedCampaigns.length },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border ${activeTab === tab.id
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-slate-100'
                                    }`}
                            >
                                {tab.label}
                                <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-semibold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:max-w-xs">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Filter campaigns..."
                            className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* ── Content Grid ─────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-24"
                        >
                            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
                            <p className="text-sm text-slate-500">Loading campaigns...</p>
                        </motion.div>
                    ) : displayCampaigns.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-16 rounded-2xl border-2 border-dashed border-slate-200 text-center bg-slate-50/50"
                        >
                            <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 mb-2">No Campaigns Found</h3>
                            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                                {activeTab === 'joined' ? "You haven't joined any campaigns yet." : "No active campaigns are currently available."}
                            </p>
                            {activeTab === 'joined' && (
                                <button
                                    onClick={scrollToDiscover}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all active:scale-[0.97]"
                                >
                                    Explore Campaigns
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {displayCampaigns.map((campaign, idx) => {
                                const progress = getProgressPercent(campaign);
                                const isJoined = joinedCampaigns.some(jc => jc._id === campaign._id);
                                const isCompleted = campaign.userProgress?.isCompleted;

                                return (
                                    <motion.div
                                        key={campaign._id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all duration-300 hover:border-slate-200 hover:shadow-lg flex flex-col"
                                    >
                                        {/* Cover Image */}
                                        <div
                                            className="h-44 relative overflow-hidden shrink-0"
                                            style={{
                                                background: campaign.coverImage
                                                    ? `url(${campaign.coverImage}) center/cover`
                                                    : 'linear-gradient(135deg, #f8faff, #eef2ff, #e0e7ff)',
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />

                                            {/* Status Badge */}
                                            <div className="absolute top-4 left-4">
                                                {isCompleted ? (
                                                    <div className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                                    </div>
                                                ) : isJoined ? (
                                                    <div className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md">
                                                        <Zap className="w-3.5 h-3.5" /> In Progress
                                                    </div>
                                                ) : null}
                                            </div>

                                            {/* Prize Badge */}
                                            {campaign.rewards?.grandPrize && (
                                                <div className="absolute bottom-4 right-4">
                                                    <div className="bg-white/90 backdrop-blur-sm border border-slate-100 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm">
                                                        <Trophy className="w-4 h-4 text-amber-500" />
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-medium">Prize</p>
                                                            <p className="text-xs font-bold text-slate-900">{campaign.rewards.grandPrize.aptAmount || 0} APT</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Body */}
                                        <div className="p-6 flex flex-col flex-grow">
                                            <div className="flex-grow">
                                                {campaign.brandName && (
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                                                        <span className="text-xs font-medium text-slate-400">{campaign.brandName}</span>
                                                    </div>
                                                )}

                                                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                    {campaign.name}
                                                </h3>
                                                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-4">
                                                    {campaign.description || 'Complete all designated quests to claim your rewards.'}
                                                </p>
                                            </div>

                                            {/* Stats & Progress */}
                                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                                    <span>{campaign.questCount || 0} quests</span>
                                                    <span className="text-slate-200">•</span>
                                                    <span>{campaign.stats?.totalParticipants || 0} participants</span>
                                                </div>

                                                {isJoined && campaign.userProgress && (
                                                    <div>
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-xs text-slate-500">Progress</span>
                                                            <span className="text-xs font-semibold text-indigo-600">{progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress}%` }}
                                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                                className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    {isJoined ? (
                                                        <>
                                                            <button
                                                                onClick={() => navigate(`/campaigns/${campaign._id}`)}
                                                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all active:scale-[0.97]"
                                                            >
                                                                Enter <ChevronRight className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleCheckCompletion(campaign._id)}
                                                                className="px-3.5 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all active:scale-[0.97]"
                                                                title="Check completion status"
                                                            >
                                                                <Activity className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleJoin(campaign._id)}
                                                            disabled={joiningId === campaign._id}
                                                            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-50"
                                                        >
                                                            {joiningId === campaign._id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Zap className="w-4 h-4" />
                                                                    Join Campaign
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
};

export default Campaigns;