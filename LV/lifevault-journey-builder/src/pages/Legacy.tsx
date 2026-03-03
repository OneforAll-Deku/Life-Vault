// file: src/pages/Legacy.tsx

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Database,
  Settings,
  Cloud,
  Activity,
  Plus,
  Archive,
  RefreshCw,
  HardDrive,
  Shield,
  RotateCcw,
  Search,
  Lock,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Legacy: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('archives');
  const [syncing, setSyncing] = useState(false);

  /* ── Stats ─────────────────────────────────────────────────── */
  const [stats] = useState({
    storage: '4.2 PB',
    uptime: '99.9%',
    streams: 12,
  });

  /* ── Memory Blocks ─────────────────────────────────────────── */
  const [memoryBlocks, setMemoryBlocks] = useState([
    { id: 1, title: 'Childhood Memories', icon: Cloud, items: 42, date: '2024-03-22', status: 'active' },
    { id: 2, title: 'Professional Career', icon: HardDrive, items: 128, date: '2024-03-15', status: 'sealed' },
    { id: 3, title: 'Philosophical Writings', icon: Lock, items: 15, date: '2024-03-10', status: 'locked' },
  ]);

  const [coldStorage, setColdStorage] = useState<Array<{ id: number; title: string; date: string; size: string }>>([]);

  /* ── Backup Settings ───────────────────────────────────────── */
  const [backupSettings, setBackupSettings] = useState([
    { title: 'Global Replication', desc: 'Sync your data across multiple secure geographic regions.', status: 'Maximum', active: true, icon: Layers },
    { title: 'Predictive Archiving', desc: 'Automatically suggest items for archival based on usage.', status: 'Active', active: true, icon: Activity },
    { title: 'Access Verification', desc: 'Monitor and log every attempt to access your legacy data.', status: 'Stable', active: true, icon: Shield },
  ]);

  /* ── Handlers ───────────────────────────────────────────────── */
  const handleCreateBlock = () => {
    const newBlock = {
      id: Date.now(),
      title: `Memory Archive ${memoryBlocks.length + 1}`,
      icon: Cloud,
      items: Math.floor(Math.random() * 50) + 10,
      date: new Date().toLocaleDateString('en-CA'),
      status: 'active' as const,
    };
    setMemoryBlocks(prev => [...prev, newBlock]);
    toast({ title: 'Archive created', description: `${newBlock.title} has been initialized.` });
  };

  const handleToggleStatus = (id: number) => {
    const statusFlow = ['active', 'sealed', 'locked'];
    setMemoryBlocks(prev => prev.map(b => {
      if (b.id === id) {
        const idx = statusFlow.indexOf(b.status);
        const newStatus = statusFlow[(idx + 1) % statusFlow.length];
        return { ...b, status: newStatus as any };
      }
      return b;
    }));
  };

  const handleArchive = (id: number) => {
    const block = memoryBlocks.find(b => b.id === id);
    if (!block) return;
    setMemoryBlocks(prev => prev.filter(b => b.id !== id));
    setColdStorage(prev => [...prev, { id: block.id, title: block.title, date: block.date, size: `${(block.items * 0.2).toFixed(1)} GB` }]);
    toast({ title: 'Moved to cold storage', description: `${block.title} has been archived.` });
  };

  const handleRestore = (id: number) => {
    const item = coldStorage.find(a => a.id === id);
    if (!item) return;
    setColdStorage(prev => prev.filter(a => a.id !== id));
    setMemoryBlocks(prev => [...prev, { id: item.id, title: item.title, icon: Cloud, items: 25, date: new Date().toLocaleDateString('en-CA'), status: 'active' }]);
    toast({ title: 'Restored from cloud', description: `${item.title} is now active.` });
  };

  const handleScanArchives = () => {
    setSyncing(true);
    toast({ title: 'Scanning storage', description: 'Checking cloud nodes for archived data...' });
    setTimeout(() => {
      if (coldStorage.length === 0) {
        setColdStorage([
          { id: Date.now(), title: 'Annual Review 2023', date: '2023-12-01', size: '2.1 GB' },
          { id: Date.now() + 1, title: 'Summer Voyage', date: '2023-06-15', size: '0.8 GB' },
        ]);
      }
      setSyncing(false);
      toast({ title: 'Scan complete', description: 'New records found in cold storage.' });
    }, 1500);
  };

  const handleSyncData = () => {
    setSyncing(true);
    toast({ title: 'Syncing legacy data', description: 'Verifying integrity across all nodes...' });
    setTimeout(() => {
      setSyncing(false);
      toast({ title: 'Legacy synced', description: 'All memory archives are fully updated.' });
    }, 2000);
  };

  const handleToggleSetting = (index: number) => {
    setBackupSettings(prev => prev.map((s, i) => {
      if (i === index) {
        const next = !s.active;
        return { ...s, active: next, status: next ? (i === 0 ? 'Maximum' : i === 1 ? 'Active' : 'Stable') : 'Inactive' };
      }
      return s;
    }));
  };

  const tabs = [
    { id: 'archives', label: 'Memory Archives', icon: Layers, desc: 'Active records' },
    { id: 'activity', label: 'Recent Activity', icon: Activity, desc: 'Real-time updates' },
    { id: 'cold', label: 'Cold Storage', icon: Database, desc: 'Paused data' },
    { id: 'settings', label: 'Backup Settings', icon: Settings, desc: 'Global config' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'sealed': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'locked': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

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
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Storage Status: Active & Secured</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                Memory Archives
              </h1>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                Preserve and manage your digital legacy. Organize records into secure archives, configure global backups, and monitor your data across the distributed network.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-8">
                <button onClick={handleCreateBlock}
                  className="flex items-center gap-2.5 px-7 py-3.5 bg-white text-slate-900 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all">
                  <Plus className="w-4 h-4" /> Create Archive
                </button>
                <div className="flex items-center gap-2 px-5 py-3.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl text-white/70 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Immutable storage enabled</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-shrink-0">
              {[
                { label: 'Total Storage', val: stats.storage, icon: Database, color: 'text-indigo-400' },
                { label: 'System Uptime', val: stats.uptime, icon: Activity, color: 'text-emerald-400' },
                { label: 'Active Streams', val: stats.streams, icon: TrendingUp, color: 'text-purple-400' },
                { label: 'Storage Delay', val: '24ms', icon: Clock, color: 'text-amber-400' },
              ].map((s, i) => (
                <div key={i} className="px-5 py-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 min-w-[150px]">
                  <div className="flex items-center gap-3">
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                    <div>
                      <p className="text-white font-bold text-lg">{s.val}</p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
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

              {activeTab === 'archives' && (
                <motion.div key="archives" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Active Archives</h2>
                      <p className="text-sm text-slate-500 mt-1">{memoryBlocks.length} records currently active</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {memoryBlocks.map((block) => (
                      <div key={block.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:shadow-sm transition-all gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <block.icon className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{block.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                              <span>{block.items} records</span>
                              <span className="text-slate-300">·</span>
                              <span>Added {block.date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleToggleStatus(block.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${getStatusColor(block.status)}`}>
                            {block.status}
                          </button>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleArchive(block.id)}
                              className="p-2 rounded-lg border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-slate-50 transition-all" title="Archive">
                              <Archive className="w-4.5 h-4.5" />
                            </button>
                            <button className="p-2 rounded-lg border border-slate-100 text-slate-400 hover:text-slate-900 transition-all">
                              <ChevronRight className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleSyncData} disabled={syncing}
                    className="w-full p-5 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all flex items-center justify-center gap-3 group disabled:opacity-60">
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />}
                    <span className="text-sm font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                      {syncing ? 'Synchronizing records...' : 'Synchronize All Data'}
                    </span>
                  </button>
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Recent Activity</h2>
                    <p className="text-sm text-slate-500 mt-1">Live updates from your legacy storage nodes</p>
                  </div>

                  <div className="bg-slate-900 rounded-3xl p-8 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">System Operational</span>
                    </div>
                    <div className="space-y-3 font-mono text-xs leading-relaxed">
                      <p className="text-slate-500">[07:54:59] Connection to distributed network established</p>
                      <p className="text-emerald-400">[07:55:02] Integrity check for Childhood Memories: passed</p>
                      <p className="text-slate-400">[07:55:15] Storage nodes synced across 12 geographic points</p>
                      <p className="text-indigo-400">[07:55:20] Verifying latest memory hashes... success</p>
                      <p className="text-slate-500">[07:56:01] Routine backup protocol initiated</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'cold' && (activeTab === 'cold') && (
                <motion.div key="cold" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Cold Storage</h2>
                      <p className="text-sm text-slate-500 mt-1">{coldStorage.length} archived records offline</p>
                    </div>
                    <button onClick={handleScanArchives} disabled={syncing}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-60">
                      {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Scan Archives
                    </button>
                  </div>

                  {coldStorage.length === 0 ? (
                    <div className="p-20 rounded-2xl border-2 border-dashed border-slate-100 text-center bg-slate-50/50">
                      <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">No archived data found</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
                      {coldStorage.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                              <Database className="w-4.5 h-4.5 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{item.date} · {item.size}</p>
                            </div>
                          </div>
                          <button onClick={() => handleRestore(item.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-indigo-100 text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition-all">
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Backup Settings</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure global synchronization and redundancy levels</p>
                  </div>

                  <div className="grid gap-4">
                    {backupSettings.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${s.active ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                            <s.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{s.title}</h3>
                            <p className="text-sm text-slate-500 mt-0.5 max-w-lg leading-relaxed">{s.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${s.active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                            {s.status}
                          </span>
                          <button onClick={() => handleToggleSetting(i)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${s.active ? 'bg-indigo-900' : 'bg-slate-200'}`}>
                            <div className={`absolute top-[3px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${s.active ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                          </button>
                        </div>
                      </div>
                    ))}
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

export default Legacy;
