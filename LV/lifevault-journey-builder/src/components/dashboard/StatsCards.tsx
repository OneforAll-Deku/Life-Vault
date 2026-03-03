// file: src/components/dashboard/StatsCards.tsx

import React from 'react';
import { Database, Shield, TrendingUp, Clock, Wallet } from 'lucide-react';

interface Stats {
  totalMemories?: number;
  storageUsed?: string;
  verifiedMemories?: number;
  activeQuests?: number;
  [key: string]: any;
}

interface StatsCardsProps {
  stats?: Stats | null | any;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const safeStats = {
    totalMemories: stats?.totalMemories ?? stats?.total ?? 0,
    storageUsed: stats?.storageUsed ?? '0 MB',
    verifiedMemories: stats?.verifiedMemories ?? stats?.verified ?? 0,
    activeQuests: stats?.activeQuests ?? stats?.quests ?? 0
  };

  const cards = [
    { title: 'Memory Records', value: safeStats.totalMemories, icon: Database, color: 'from-blue-500 to-cyan-500', iconBg: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-100' },
    { title: 'Storage Used', value: safeStats.storageUsed, icon: Clock, color: 'from-purple-500 to-pink-500', iconBg: 'bg-purple-50', textColor: 'text-purple-600', borderColor: 'border-purple-100' },
    { title: 'Verified Records', value: safeStats.verifiedMemories, icon: Shield, color: 'from-green-500 to-emerald-500', iconBg: 'bg-emerald-50', textColor: 'text-emerald-600', borderColor: 'border-emerald-100' },
    { title: 'Active Challenges', value: safeStats.activeQuests, icon: TrendingUp, color: 'from-orange-500 to-red-500', iconBg: 'bg-orange-50', textColor: 'text-orange-600', borderColor: 'border-orange-100' },
    { title: 'Available Balance', value: `${stats?.aptosBalance !== undefined ? Number(stats.aptosBalance).toFixed(4) : '0.0000'} APT`, icon: Wallet, color: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-100' },
    { title: 'Network Fees', value: `${(safeStats.verifiedMemories * 0.0028).toFixed(4)} APT`, icon: TrendingUp, color: 'from-rose-500 to-red-500', iconBg: 'bg-rose-50', textColor: 'text-rose-600', borderColor: 'border-rose-100' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:border-slate-200 hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} ${card.borderColor} border flex items-center justify-center mb-4 ring-4 ring-transparent group-hover:ring-slate-50 transition-all`}>
              <Icon className={`w-5 h-5 ${card.textColor}`} />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{card.title}</p>
            <p className="text-xl font-bold text-slate-900 leading-none">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
};