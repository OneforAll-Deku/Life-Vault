import React from 'react';
import { formatDate, getCategoryLabel, getIPFSUrl } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import type { Memory } from '@/types';
import { Calendar, CheckCircle, FileText, Image, Film, Music, File, Lock, Clock } from 'lucide-react';

interface MemoryCardProps {
  memory: Memory;
  onClick: () => void;
}

/* ── Category-specific color mappings (light + dark) ── */
const CATEGORY_STYLES = {
  light: {
    photo: { bg: 'rgba(59,130,246,0.06)', text: '#3b82f6', border: 'rgba(59,130,246,0.12)' },
    document: { bg: 'rgba(139,92,246,0.06)', text: '#8b5cf6', border: 'rgba(139,92,246,0.12)' },
    video: { bg: 'rgba(239,68,68,0.06)', text: '#ef4444', border: 'rgba(239,68,68,0.12)' },
    audio: { bg: 'rgba(16,185,129,0.06)', text: '#10b981', border: 'rgba(16,185,129,0.12)' },
    other: { bg: 'rgba(107,114,128,0.06)', text: '#6b7280', border: 'rgba(107,114,128,0.12)' },
  },
  dark: {
    photo: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
    document: { bg: 'rgba(139,92,246,0.1)', text: '#a78bfa', border: 'rgba(139,92,246,0.2)' },
    video: { bg: 'rgba(239,68,68,0.1)', text: '#f87171', border: 'rgba(239,68,68,0.2)' },
    audio: { bg: 'rgba(16,185,129,0.1)', text: '#34d399', border: 'rgba(16,185,129,0.2)' },
    other: { bg: 'rgba(107,114,128,0.1)', text: '#9ca3af', border: 'rgba(107,114,128,0.2)' },
  },
} as const;

type CategoryKey = keyof typeof CATEGORY_STYLES.light;

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'photo': return Image;
    case 'video': return Film;
    case 'audio': return Music;
    case 'document': return FileText;
    default: return File;
  }
};

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onClick }) => {
  const { isDark } = useTheme();
  const isImage = memory.fileType?.startsWith('image/');
  const CategoryIcon = getCategoryIcon(memory.category);
  const now = Math.floor(Date.now() / 1000);
  const isLocked = memory.isCapsule && (memory.releaseTimestamp || 0) > now;
  const styles = isDark ? CATEGORY_STYLES.dark : CATEGORY_STYLES.light;
  const catStyle = styles[memory.category as CategoryKey] || styles.other;

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.03)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = isDark
          ? '0 16px 48px -12px rgba(99,102,241,0.15), 0 4px 12px -2px rgba(0,0,0,0.2)'
          : '0 16px 48px -12px rgba(99,102,241,0.12), 0 4px 12px -2px rgba(0,0,0,0.04)';
        e.currentTarget.style.borderColor = isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.03)';
        e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
      }}
    >
      {/* Image/Preview */}
      <div className="h-44 flex items-center justify-center overflow-hidden relative"
        style={{
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(249,250,251,0.8)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
        }}
      >
        {isImage ? (
          <img
            src={getIPFSUrl(memory.ipfsHash)}
            alt={memory.title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isLocked ? 'blur-md grayscale' : ''}`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className={`flex flex-col items-center gap-2.5 ${isLocked ? 'blur-sm' : ''}`}>
            <div className="p-4 rounded-2xl" style={{ background: catStyle.bg }}>
              <CategoryIcon className="w-8 h-8" style={{ color: catStyle.text, opacity: 0.7 }} />
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {getCategoryLabel(memory.category)}
            </span>
          </div>
        )}

        {/* Locked Overlay */}
        {isLocked && (
          <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-black/50 backdrop-blur-[4px]' : 'bg-white/60 backdrop-blur-[4px]'}`}>
            <div className="p-3 rounded-xl shadow-lg" style={{
              background: isDark ? 'rgba(20,20,30,0.9)' : '#ffffff',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
            }}>
              <Lock className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-800'}`} />
            </div>
          </div>
        )}

        {/* Capsule badge */}
        {memory.isCapsule && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1.5 text-white text-[9px] font-bold rounded-lg flex items-center gap-1.5"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              boxShadow: '0 4px 12px -2px rgba(245,158,11,0.3)',
            }}
          >
            <Clock className="w-3 h-3" />
            TIME CAPSULE
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2.5 mb-2">
          <h3 className={`font-bold truncate transition-colors tracking-tight text-sm ${isDark ? 'text-white group-hover:text-violet-400' : 'text-gray-900 group-hover:text-violet-600'}`}>
            {memory.title}
          </h3>
          <span
            className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex-shrink-0"
            style={{
              background: catStyle.bg,
              color: catStyle.text,
              border: `1px solid ${catStyle.border}`,
            }}
          >
            {getCategoryLabel(memory.category)}
          </span>
        </div>

        {memory.description && (
          <p className={`text-xs mb-3.5 line-clamp-2 leading-relaxed font-medium ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{memory.description}</p>
        )}

        <div className={`flex items-center justify-between text-[9px] font-bold uppercase tracking-wider pt-3 mt-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
          style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)' }}
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" style={{ color: isDark ? 'rgba(129,140,248,0.5)' : 'rgba(99,102,241,0.4)' }} />
            {formatDate(memory.createdAt)}
          </span>

          <div className="flex items-center gap-2.5">
            {memory.isCapsule && (
              <span className={`flex items-center gap-1 ${isLocked ? 'text-amber-500' : 'text-emerald-500'}`}>
                {isLocked ? (
                  <><Lock className="w-3 h-3" /> Locked</>
                ) : (
                  <><CheckCircle className="w-3 h-3" /> Ready</>
                )}
              </span>
            )}
            {memory.isOnChain && !memory.isCapsule && (
              <span className="flex items-center gap-1 text-blue-500">
                <CheckCircle className="w-3 h-3" />
                On-Chain
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};