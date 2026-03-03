import React from 'react';
import { MemoryCard } from './MemoryCard';
import type { Memory } from '@/types';
import { ImagePlus, Plus, Heart } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { ConfettiButton } from '@/components/ui/ConfettiButton/ConfettiButton';

interface TimelineProps {
  memories: Memory[];
  loading: boolean;
  onSelect: (memory: Memory) => void;
  onAddClick: () => void;
  onDelete?: (id: string) => void;
  onVerify?: (id: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  memories,
  loading,
  onSelect,
  onAddClick,
  onDelete,
  onVerify
}) => {
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{
            border: isDark ? '3px solid rgba(99,102,241,0.15)' : '3px solid rgba(99,102,241,0.1)',
            borderTopColor: '#6366f1',
          }}
        />
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Loading memories…</p>
      </div>
    );
  }

  if (!memories || memories.length === 0) {
    return (
      <div
        className="rounded-2xl p-16 text-center"
        style={{
          background: isDark
            ? 'linear-gradient(160deg, rgba(255,255,255,0.02) 0%, rgba(99,102,241,0.04) 100%)'
            : 'linear-gradient(160deg, rgba(249,250,251,0.5) 0%, rgba(238,242,255,0.3) 100%)',
          border: isDark ? '1px solid rgba(99,102,241,0.1)' : '1px solid rgba(99,102,241,0.06)',
        }}
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.06))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))',
            border: isDark ? '1px solid rgba(99,102,241,0.15)' : '1px solid rgba(99,102,241,0.08)',
          }}
        >
          <ImagePlus className="w-10 h-10" style={{ color: isDark ? 'rgba(129,140,248,0.5)' : 'rgba(99,102,241,0.35)' }} />
        </div>
        <h3 className={`text-xl font-black mb-2 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Start Your Journey</h3>
        <p className={`mb-8 font-medium max-w-sm mx-auto leading-relaxed text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          Add your first precious memory to begin building your beautiful digital timeline.
        </p>
        <ConfettiButton
          onClick={onAddClick}
          variant="gradient"
          size="lg"
          animation="glow"
          icon={<Plus className="w-5 h-5" />}
          confettiOptions={{
            particleCount: 150,
            spread: 100,
            scalar: 1.2
          }}
          className="text-sm font-bold tracking-wide"
        >
          Add Your First Memory
        </ConfettiButton>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {memories.map((memory) => (
        <MemoryCard
          key={memory._id}
          memory={memory}
          onClick={() => onSelect(memory)}
        />
      ))}
    </div>
  );
};