// file: src/pages/QuestHistory.tsx

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History,
    Search,
    Flame,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Trophy,
    Hash,
    Sparkles,
    Zap,
    Filter,
    Activity,
    Clock,
    ArrowDown,
    Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const QuestHistory: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const { toast } = useToast();

    /* ── Mock Data ─────────────────────────────────────────────── */
    const quests = [
        { id: 1, title: 'Daily Backup Sync', points: 50, date: '2024-03-20', status: 'completed', type: 'system', category: 'adventure' },
        { id: 2, title: 'Identity Vault Seal', points: 250, date: '2024-03-18', status: 'completed', type: 'security', category: 'culture' },
        { id: 3, title: 'Legacy Data Upload', points: 150, date: '2024-03-15', status: 'completed', type: 'archive', category: 'education' },
        { id: 4, title: 'Distributed Network Hash', points: 300, date: '2024-03-12', status: 'pending', type: 'network', category: 'nature' },
    ];

    const filteredQuests = quests.filter(q => {
        const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = activeFilter === 'all' || q.type === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const totalPoints = quests.reduce((sum, q) => sum + q.points, 0);
    const completedCount = quests.filter(q => q.status === 'completed').length;

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'system': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'security': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'archive': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'network': return 'bg-amber-50 text-amber-600 border-amber-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const filters = [
        { id: 'all', label: 'All Types' },
        { id: 'system', label: 'System' },
        { id: 'security', label: 'Security' },
        { id: 'archive', label: 'Archive' },
        { id: 'network', label: 'Network' },
    ];

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
                                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Activity Logs Active</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                                Journey History
                            </h1>
                            <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                                Review your past actions, completed security quests, and distributed network events. Your history is end-to-end encrypted.
                            </p>
                        </div>

                        {/* Summary Card */}
                        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible">
                            {[
                                { val: totalPoints.toLocaleString(), label: 'Total Points', icon: Trophy, color: 'text-amber-400' },
                                { val: '12 Days', label: 'Active Streak', icon: Flame, color: 'text-orange-400' },
                                { val: `${completedCount}/${quests.length}`, label: 'Completed', icon: CheckCircle2, color: 'text-emerald-400' },
                            ].map((s, i) => (
                                <div key={i} className="px-6 py-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 min-w-[170px]">
                                    <div className="flex items-center gap-3">
                                        <s.icon className={`w-5 h-5 ${s.color}`} />
                                        <div>
                                            <p className="text-white font-bold text-xl">{s.val}</p>
                                            <p className="text-slate-400 text-xs">{s.label}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* ── Search & Filters ──────────────────────────────── */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search records..."
                            className="w-full h-12 pl-11 pr-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
                        {filters.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f.id)}
                                className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${activeFilter === f.id
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-slate-100'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Quest List ────────────────────────────────────── */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Activity Records</h2>
                        <span className="text-sm text-slate-500">{filteredQuests.length} records found</span>
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filteredQuests.map((q, i) => (
                                <motion.div
                                    key={q.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-slate-900 flex flex-col items-center justify-center shadow-sm">
                                            <span className="text-xl font-bold text-white leading-none">{q.points}</span>
                                            <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider mt-0.5">pts</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{q.title}</h3>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${q.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {q.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500 font-medium">
                                                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{q.date}</span>
                                                <span className="text-slate-300">·</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeColor(q.type)}`}>{q.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredQuests.length === 0 && (
                            <div className="p-16 rounded-2xl border-2 border-dashed border-slate-200 text-center bg-slate-50/50">
                                <Sparkles className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <h3 className="font-bold text-slate-900 mb-1">No records found</h3>
                                <p className="text-sm text-slate-500 mb-5">Try adjusting your search or filters</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
                                    className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-indigo-300 transition-all shadow-sm">
                                    Reset Filters
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="text-center pt-4">
                        <button
                            onClick={() => toast({ title: 'Loading More', description: 'Accessing archived logs...' })}
                            className="flex items-center gap-2 mx-auto px-6 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm group">
                            <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                            Load More Records
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default QuestHistory;
