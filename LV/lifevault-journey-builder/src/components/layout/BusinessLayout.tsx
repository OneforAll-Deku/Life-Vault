import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const BusinessLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white border-b border-black/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/business/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-black leading-4">Block Pix Business</div>
                <div className="text-xs text-black/50 leading-4">
                  {user?.organizationInfo?.name || user?.name || user?.email}
                </div>
              </div>
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-black/60 hover:bg-black/5 hover:text-black transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
};

