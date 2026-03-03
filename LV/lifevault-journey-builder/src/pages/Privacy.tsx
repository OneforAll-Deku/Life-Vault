// file: src/pages/Privacy.tsx

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Zap,
  Fingerprint,
  Activity,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileText,
  Key,
  Database,
  Search,
  Check,
  ShieldAlert,
  ShieldCheck,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Privacy: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('guards');
  const [isSyncing, setIsSyncing] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(true);

  /* ── State Data ─────────────────────────────────────────────── */
  const [securityModules, setSecurityModules] = useState([
    { id: 1, name: 'Secure Encryption', desc: 'Distributes encrypted shards across the network.', icon: Lock, status: true, detail: 'AES-256' },
    { id: 2, name: 'Biometric Access', desc: 'Verification required for sensitive data access.', icon: Fingerprint, status: false, detail: 'Inactive' },
    { id: 3, name: 'Ledger Verification', desc: 'Verifies the integrity of all vault transactions.', icon: Database, status: true, detail: 'Operational' },
  ]);

  const [activityLog, setActivityLog] = useState([
    { id: 1, event: 'Privacy check initiated', timestamp: '12:45:01', node: 'Global-1', type: 'system' },
    { id: 2, event: 'Encryption handshake success', timestamp: '12:44:12', node: 'Global-2', type: 'success' },
    { id: 3, event: 'Distributed shard scan', timestamp: '12:43:55', node: 'Global-1', type: 'info' },
  ]);

  /* ── Handlers ───────────────────────────────────────────────── */
  const handleToggleModule = (id: number) => {
    setSecurityModules(prev => prev.map(m => {
      if (m.id === id) {
        const next = !m.status;
        toast({ title: next ? 'Module enabled' : 'Module disabled', description: `${m.name} security is now ${next ? 'active' : 'inactive'}.` });
        return { ...m, status: next, detail: next ? (m.name.includes('Encryption') ? 'AES-256' : 'Active') : 'Inactive' };
      }
      return m;
    }));
  };

  const handleTogglePrivacyMode = () => {
    setPrivacyMode(!privacyMode);
    toast({
      title: !privacyMode ? 'Privacy Mode Active' : 'Privacy Mode Disabled',
      description: !privacyMode ? 'Your vault activity is now fully hidden.' : 'Activity visibility restored to default.',
      variant: !privacyMode ? 'default' : 'destructive'
    });
  };

  const handleEmergencyWipe = () => {
    toast({
      title: 'Action blocked',
      description: 'Emergency wipe requires two-factor authentication and final confirmation.',
      variant: 'destructive'
    });
  };

  const handleSyncSecurity = () => {
    setIsSyncing(true);
    toast({ title: 'Syncing guards', description: 'Re-verifying distributed encryption nodes...' });
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: 'Security synced', description: 'All protection layers are fully operational.' });
    }, 2000);
  };

  const tabs = [
    { id: 'guards', label: 'Security Guards', icon: Shield, desc: 'Core protections' },
    { id: 'logs', label: 'Access Logs', icon: Activity, desc: 'Recent connections' },
    { id: 'nodes', label: 'Secure Nodes', icon: Database, desc: 'Encrypted storage' },
    { id: 'help', label: 'Data Policy', icon: Info, desc: 'Privacy details' },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen space-y-8 pb-20">

        {/* ── Hero ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-3xl p-8 sm:p-12"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-indigo-400 text-xs font-semibold tracking-wide uppercase">Security Score: 98/100</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                Privacy Controls
              </h1>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                Manage your data visibility and encryption protocols. Configure your personal security nodes and monitor access to your most sensitive archives.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-8">
                <button onClick={handleTogglePrivacyMode}
                  className={`flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${privacyMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-slate-900 hover:bg-slate-50'}`}>
                  {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {privacyMode ? 'Privacy Mode Active' : 'Restore Visibility'}
                </button>
                <button onClick={handleEmergencyWipe}
                  className="px-6 py-3.5 bg-rose-900/40 border border-rose-500/50 text-rose-100 rounded-xl font-bold text-sm hover:bg-rose-900/60 transition-all flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Emergency Wipe
                </button>
              </div>
            </div>

            <div className="xl:flex hidden">
              <div className="relative">
                <div className="w-32 h-32 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <ShieldCheck className="w-16 h-16 text-indigo-400 opacity-50" />
                </div>
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -inset-2 border border-white/5 rounded-3xl" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Main Interface ────────────────────────────────── */}
        <div className="grid lg:grid-cols-[280px,1fr] gap-8">

          {/* Sidebar */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-left min-w-[200px] lg:min-w-0 border ${activeTab === t.id
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200'
                  : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                  }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === t.id ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <t.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">{t.label}</p>
                  <p className="text-xs text-slate-400">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">

              {activeTab === 'guards' && (
                <motion.div key="guards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Security Modules</h2>
                      <p className="text-sm text-slate-500 mt-1">Manage core vault protection layers</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {securityModules.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${m.status ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                            <m.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{m.name}</h3>
                            <p className="text-sm text-slate-500 mt-0.5 max-w-lg leading-relaxed">{m.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${m.status ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                            {m.detail}
                          </span>
                          <button onClick={() => handleToggleModule(m.id)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${m.status ? 'bg-indigo-900' : 'bg-slate-200'}`}>
                            <div className={`absolute top-[3px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${m.status ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleSyncSecurity} disabled={isSyncing}
                    className="w-full p-6 rounded-2xl bg-slate-900 text-white flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 disabled:opacity-60">
                    {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    <span className="font-bold text-sm">{isSyncing ? 'Synchronizing security layers...' : 'Sync All Protections'}</span>
                  </button>
                </motion.div>
              )}

              {activeTab === 'logs' && (
                <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Access History</h2>
                    <p className="text-sm text-slate-500 mt-1">Review connection events for your vault</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
                    {activityLog.map((log) => (
                      <div key={log.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-emerald-400' : log.type === 'system' ? 'bg-indigo-400' : 'bg-slate-400'}`} />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{log.event}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{log.timestamp} · Node: {log.node}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{log.type}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'nodes' && (
                <motion.div key="nodes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Secure Node Infrastructure</h2>
                    <p className="text-sm text-slate-500 mt-1">Global locations where your data shards are preserved</p>
                  </div>
                  <div className="p-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 text-center">
                    <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Scanning network topology...</p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'help' && (
                <motion.div key="help" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div className="bg-white p-8 rounded-2xl border border-slate-100 space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">Our Data Privacy Statement</h2>
                    <p className="text-slate-500 leading-relaxed text-sm">
                      Life Vault uses zero-knowledge architecture. This means your data is encrypted locally on your device before it ever touches our secure network. We cannot read your records, nor can any third party.
                    </p>
                    <p className="text-slate-500 leading-relaxed text-sm">
                      By distributing shards across geographic nodes, we ensure that no single node contains enough information to reconstruct your files. Your identity is your key.
                    </p>
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" /> GDPR & CCPA Compliant
                      </span>
                      <button className="text-indigo-600 text-xs font-bold hover:underline">Download Whitepaper</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Privacy;
