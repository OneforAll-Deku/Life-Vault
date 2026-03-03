// file: src/components/layout/DashboardLayout.tsx

import React from 'react';
import { DashboardNavbar } from './DashboardNavbar';
import { useTheme } from '@/context/ThemeContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div
      className="min-h-screen relative transition-colors duration-500"
      style={{ background: '#f8fafc' }}
    >
      {/* Refined dot-grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 shadow-inner"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(99,102,241,0.06) 1.5px, transparent 1.5px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Dynamic environmental glows */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px] pointer-events-none z-0 overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 40%, transparent 80%)',
        }}
      />

      <div
        className="fixed bottom-0 right-0 w-[800px] h-[800px] pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at bottom right, rgba(99,102,241,0.03) 0%, transparent 70%)',
        }}
      />

      <DashboardNavbar />

      <main className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-10">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          {children}
        </div>
      </main>
    </div>
  );
};