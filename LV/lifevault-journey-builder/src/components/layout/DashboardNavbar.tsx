// file: src/components/layout/DashboardNavbar.tsx

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { getInitials } from '@/services/api';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { WalletAuthModal } from '@/components/wallet/WalletAuthModal';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vault,
  LayoutDashboard,
  Shield,
  Heart,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
  Map,
  Trophy,
  History,
  ChevronDown,
  User,
  Bell,
  Search,
  Activity,
  FolderOpen,
  Briefcase,
  ChevronRight,
  HelpCircle,
  LucideIcon,
  FileText
} from 'lucide-react';

const navLinks: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/quests', label: 'Quests', icon: Map },
  { path: '/campaigns', label: 'Campaigns', icon: Trophy },
  { path: '/quest-history', label: 'History', icon: History },
  { path: '/privacy', label: 'Privacy', icon: Shield },
  { path: '/legacy', label: 'Legacy', icon: Heart },
  { path: '/settings', label: 'Settings', icon: Settings },
  { label: 'Analytics', path: '/analytics', icon: Activity },
  { label: 'Digital Will', path: '/digital-will', icon: FileText },
  { label: 'Vault', path: '/vaults', icon: FolderOpen },
];

export const DashboardNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { connected } = useWallet();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLinkWalletModal, setShowLinkWalletModal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { toast } = useToast();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const hasLinkedWallet = user?.aptosAddress && user.aptosAddress.length > 0;

  return (
    <>
      {/* Main Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
          ? 'bg-white/80 backdrop-blur-2xl shadow-xl shadow-black/5 border-b border-slate-200/50 py-1'
          : 'bg-white border-b border-slate-100 py-3'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-14 lg:h-16">

            {/* Logo Section */}
            <div className="flex items-center gap-12">
              <Link
                to={user ? "/dashboard" : "/"}
                className="flex items-center gap-3 flex-shrink-0 group"
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-300">
                    <Vault className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    LifeVault
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation - Moved closer to logo for balance */}
              <div className="hidden lg:flex items-center">
                <div className="flex items-center bg-slate-100/60 rounded-2xl p-2 gap-2 border border-slate-200/30">
                  {navLinks.slice(0, 4).map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.path);
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${active
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                          }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}

                  {/* More dropdown */}
                  <div className="relative group/more">
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-white/60 transition-all">
                      <span>Resources</span>
                      <ChevronDown className="w-4 h-4 group-hover/more:rotate-180 transition-transform duration-300" />
                    </button>
                    <div className="absolute top-full left-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 opacity-0 invisible group-hover/more:opacity-100 group-hover/more:visible translate-y-2 group-hover/more:translate-y-0 transition-all duration-300 z-50 overflow-hidden">
                      {navLinks.slice(4).map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.path);
                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            className={`flex items-center gap-4 px-5 py-3 text-sm font-bold transition-colors ${active
                              ? 'bg-slate-50 text-indigo-700'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                          >
                            <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 mr-2">
                <button
                  onClick={() => toast({ title: "Security Protocols", description: "Multi-layer encryption active." })}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all border border-slate-100"
                >
                  <Shield className="w-5 h-5" />
                </button>

                <button
                  onClick={() => toast({ title: "System Alerts", description: "No new notifications." })}
                  className="relative p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-slate-100"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                </button>
              </div>

              {/* Wallet / Link Action */}
              {hasLinkedWallet || connected ? (
                <div className="hidden md:block">
                  <ConnectWalletButton variant="ghost" size="sm" />
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkWalletModal(true)}
                  className="hidden md:flex items-center gap-2.5 px-6 py-3 text-sm font-bold bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet</span>
                </button>
              )}

              {/* User Avatar */}
              <div className="hidden md:block relative group/user">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-1 rounded-2xl bg-white border border-slate-100 hover:bg-slate-50 transition-all shadow-sm"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || 'User'}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(user?.name || user?.email)}
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 mr-2 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Account Menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 top-full mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 py-4 z-50 overflow-hidden"
                      >
                        <div className="px-6 py-4 border-b border-slate-50 mb-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'User Account'}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                        </div>

                        <div className="px-2 space-y-1">
                          <Link
                            to="/settings"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-4 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-2xl transition-all"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            <span>My Profile</span>
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-4 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-2xl transition-all"
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            <span>General Settings</span>
                          </Link>
                        </div>

                        <div className="mt-4 pt-2 border-t border-slate-50 px-2">
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              logout();
                            }}
                            className="flex items-center gap-4 w-full px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Drawer Trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-3 text-slate-700 hover:bg-slate-50 rounded-2xl transition-all border border-slate-100"
              >
                <div className="relative w-6 h-5">
                  <span className={`absolute left-0 block w-6 h-0.5 bg-current rounded-full transition-all duration-300 ${mobileMenuOpen ? 'top-2 rotate-45' : 'top-0'}`}></span>
                  <span className={`absolute left-0 top-2 block w-5 h-0.5 bg-current rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`absolute left-0 block w-4 h-0.5 bg-current rounded-full transition-all duration-300 ${mobileMenuOpen ? 'top-2 -rotate-45 w-6' : 'top-4'}`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-50 lg:hidden transform transition-transform duration-500 ease-in-out shadow-[0_0_80px_rgba(0,0,0,0.1)] flex flex-col ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-50">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                className="w-12 h-12 rounded-2xl object-cover shadow-sm ring-2 ring-white"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-base font-bold">
                {getInitials(user?.name || user?.email)}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-slate-900">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate max-w-[150px]">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Main Menu</p>
            <div className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-bold transition-all ${active
                      ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <Icon className="w-5 h-5 font-bold" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Account Actions</p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
              >
                <User className="w-6 h-6" />
                <span className="text-sm font-bold">Profile</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  toast({ title: "Notifications", description: "System operational." });
                }}
                className="relative flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute top-4 right-6 w-2.5 h-2.5 bg-rose-500 rounded-full ring-4 ring-white"></span>
                <span className="text-sm font-bold">Alerts</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-50">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
            className="flex items-center justify-center gap-4 w-full px-5 py-4 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out Account</span>
          </button>
        </div>
      </div>

      {/* Content Spacer */}
      <div className={`transition-all duration-500 ${scrolled ? 'h-20' : 'h-24'}`}></div>

      <WalletAuthModal
        isOpen={showLinkWalletModal}
        onClose={() => setShowLinkWalletModal(false)}
        mode="link"
      />
    </>
  );
};

export default DashboardNavbar;
