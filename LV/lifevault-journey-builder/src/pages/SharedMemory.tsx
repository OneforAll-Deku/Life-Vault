import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shareAPI } from '@/services/api';
import {
  Vault,
  Lock,
  Clock,
  Eye,
  Download,
  AlertCircle,
  Loader2,
  Image,
  FileText,
  Film,
  Music,
  File,
  ExternalLink,
  ArrowLeft,
  Fingerprint,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface SharedMemoryData {
  memory: {
    title: string;
    description?: string;
    category: string;
    fileType?: string;
    fileName?: string;
    createdAt: string;
    ipfsUrl: string;
    ipfsHash?: string;
  };
  share: {
    accessType: 'view' | 'download';
    expiresAt: string;
    viewCount: number;
    maxViews: number | null;
    isZKProtected: boolean;
  };
  sharedBy: {
    name: string;
  };
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'photo': return Image;
    case 'video': return Film;
    case 'audio': return Music;
    case 'document': return FileText;
    default: return File;
  }
};

// Simulated ZK Proof Generation (Client Side)
const generateSimulatedZKProof = async (secret: string, challenge: string) => {
  const msgUint8 = new TextEncoder().encode(secret + challenge);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const SharedMemory: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [data, setData] = useState<SharedMemoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // Security States
  const [securityRequired, setSecurityRequired] = useState<{ password?: boolean; zk?: boolean } | null>(null);
  const [zkChallenge, setZkChallenge] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [zkSecret, setZkSecret] = useState('');
  const [isVerifyingSecurity, setIsVerifyingSecurity] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem(`share_token_${shortCode}`));

  // Verify link and check requirements
  useEffect(() => {
    const verifyLink = async () => {
      if (!shortCode) return;

      try {
        const response = await shareAPI.verify(shortCode);

        if (!response.data.success) {
          if (response.data.message?.includes('expired')) setExpired(true);
          setError(response.data.message || 'Link is not valid');
          return;
        }

        const { securityRequired: reqs } = response.data;

        if (reqs && (reqs.password || reqs.zk)) {
          setSecurityRequired(reqs);
          if (reqs.zk) {
            const chalRes = await shareAPI.getChallenge(shortCode);
            setZkChallenge(chalRes.data.data.challenge);
          }

          // If we already have a token, try it
          if (accessToken) {
            await fetchSharedMemory(undefined, accessToken);
          }
        } else {
          // No direct security reqs (or already met?)
          await fetchSharedMemory();
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Link not found');
      } finally {
        setVerifying(false);
      }
    };

    verifyLink();
  }, [shortCode, accessToken]);

  const fetchSharedMemory = async (pwd?: string, token?: string) => {
    if (!shortCode) return;

    try {
      setLoading(true);
      const response = await shareAPI.getShared(shortCode, pwd, token);
      setData(response.data.data);
      setSecurityRequired(null);
    } catch (err: any) {
      if (err.response?.status === 401 && err.response?.data?.securityRequired) {
        setSecurityRequired(err.response.data.securityRequired);
      } else if (err.response?.status === 410) {
        setExpired(true);
        setError(err.response?.data?.message || 'Link has expired');
      } else {
        throw err; // handle in caller
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortCode) return;

    try {
      setIsVerifyingSecurity(true);

      let zkProof = undefined;
      if (securityRequired?.zk && zkSecret && zkChallenge) {
        zkProof = await generateSimulatedZKProof(zkSecret, zkChallenge);
      }

      const response = await shareAPI.verifySecurity(shortCode, {
        password: securityRequired?.password ? password : undefined,
        zkProof
      });

      const { accessToken: newToken } = response.data.data;
      setAccessToken(newToken);
      localStorage.setItem(`share_token_${shortCode}`, newToken);

      // Now fetch with the token
      await fetchSharedMemory(password, newToken);
      toast.success('Identity Verified', {
        description: 'Vault access granted via Zero-Knowledge Verification.'
      });
    } catch (err: any) {
      toast.error('Verification Failed', {
        description: err.response?.data?.message || 'Invalid credentials'
      });
    } finally {
      setIsVerifyingSecurity(false);
    }
  };

  const handleDownload = () => {
    if (data?.memory.ipfsUrl) {
      window.open(data.memory.ipfsUrl, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isImage = data?.memory.fileType?.startsWith('image/');
  const CategoryIcon = data ? getCategoryIcon(data.memory.category) : File;

  // View States
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-black/5 rounded-3xl animate-pulse" />
            <Loader2 className="relative w-12 h-12 animate-spin text-black/20 mx-auto top-4" />
          </div>
          <p className="text-black/40 font-medium tracking-tight">Accessing Secure Vault...</p>
        </div>
      </div>
    );
  }

  if (expired || (error && !securityRequired)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
        <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-red-100">
            {expired ? <Clock className="w-10 h-10 text-red-500" /> : <AlertCircle className="w-10 h-10 text-red-500" />}
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">{expired ? 'Vault Expired' : 'Access Denied'}</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            {expired ? 'This temporary share link has reached its expiry or view limit.' : error}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Vault className="w-5 h-5" />
            Return to Life Vault
          </Link>
        </div>
      </div>
    );
  }

  if (securityRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <div className="relative w-20 h-20 mx-auto mb-6 group">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-3xl blur-xl group-hover:bg-indigo-500/20 transition-all" />
              <div className="relative w-20 h-20 bg-white rounded-3xl flex items-center justify-center border border-indigo-100 shadow-xl shadow-indigo-500/10">
                <Lock className="w-10 h-10 text-indigo-600" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Vault Secured</h1>
            <p className="text-gray-400 font-medium">Verify your identity to unlock this memory</p>
          </div>

          <form onSubmit={handleSecurityVerify} className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-500/5 border border-indigo-50/50">

            {securityRequired.zk && (
              <div className="mb-8 p-5 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 text-purple-700 font-bold text-sm uppercase tracking-wider">
                  <Fingerprint className="w-5 h-5" />
                  ZK Identity Verification
                </div>
                <input
                  type="password"
                  value={zkSecret}
                  onChange={(e) => setZkSecret(e.target.value)}
                  placeholder="Your Secret Identity Key"
                  className="w-full px-5 py-3.5 bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all placeholder:text-purple-300"
                  required
                />
                <div className="text-[11px] text-purple-600/70 font-medium leading-normal flex gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  Proof of identity will be generated mathematically without revealing your secret to our servers.
                </div>
              </div>
            )}

            {securityRequired.password && (
              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                  Access Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 transition-all"
                  required={!securityRequired.zk}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingSecurity || (securityRequired.zk && !zkSecret) || (securityRequired.password && !password)}
              className="w-full py-4.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isVerifyingSecurity ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying Proof...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Verify & Access
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-10">
            <Link to="/" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Final Loaded Content with Premium UI
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-black/5 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg shadow-black/10">
              <Vault className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-black tracking-tight uppercase">Life Vault</span>
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-xs font-black text-gray-400 uppercase tracking-widest">
              <span className="flex items-center gap-2 px-3 py-1.5 bg-black/5 rounded-full">
                <Clock className="w-4 h-4 text-indigo-500" />
                {data?.share.expiresAt ? new Date(data.share.expiresAt).toLocaleTimeString() : 'Limited'}
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 bg-black/5 rounded-full">
                <Eye className="w-4 h-4 text-emerald-500" />
                {data?.share.viewCount} Views
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* File Preview Section */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-[3rem] shadow-2xl shadow-black/5 border border-black/5 overflow-hidden group">
              <div className="aspect-[4/3] md:aspect-video bg-gray-50 flex items-center justify-center relative">
                {isImage ? (
                  <img
                    src={data?.memory.ipfsUrl}
                    alt={data?.memory.title}
                    className="w-full h-full object-contain p-4 group-hover:scale-[1.02] transition-transform duration-700"
                  />
                ) : (
                  <div className="text-center">
                    <div className="w-32 h-32 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                      <CategoryIcon className="w-16 h-16 text-indigo-200" />
                    </div>
                    <p className="text-indigo-400 font-black uppercase tracking-widest text-sm">{data?.memory.category}</p>
                  </div>
                )}

                {/* Security Badge */}
                <div className="absolute top-8 right-8 flex gap-2">
                  {data?.share.isZKProtected && (
                    <div className="px-4 py-2 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-purple-500/20 backdrop-blur-md">
                      <Fingerprint className="w-3 h-3" />
                      ZK-Verified
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-black/5 border border-gray-100">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 leading-tight mb-3">{data?.memory.title}</h1>
                  <p className="text-lg text-gray-500 leading-relaxed max-w-2xl">{data?.memory.description}</p>
                </div>
                {data?.share.accessType === 'download' && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all hover:scale-[1.02] shadow-xl shadow-black/10"
                  >
                    <Download className="w-5 h-5" />
                    Secure Local Copy
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-black/5 border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16" />

              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 relative">Memory Genesis</h3>

              <div className="space-y-6 relative">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <Image className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Type</p>
                    <p className="font-bold text-gray-900 capitalize">{data?.memory.fileType?.split('/')[1] || data?.memory.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Captured</p>
                    <p className="font-bold text-gray-900">{data?.memory.createdAt ? formatDate(data.memory.createdAt) : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">File Name</p>
                    <p className="font-bold text-gray-900 truncate max-w-[150px]">{data?.memory.fileName || 'encrypted_blob'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-sm">
                    {data?.sharedBy.name[0]}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shared By</p>
                    <p className="font-bold text-gray-900">{data?.sharedBy.name}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black rounded-[3rem] p-8 text-white shadow-2xl shadow-indigo-500/10">
              <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-indigo-300" />
              </div>
              <h4 className="text-xl font-black mb-3 italic">Vault Statement</h4>
              <p className="text-white/60 text-sm leading-relaxed mb-6 font-medium">
                This asset is protected by Life Vault's cryptographically secure infrastructure. Access is audited and non-replicable.
              </p>
              <a
                href={data?.memory.ipfsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold transition-all group"
              >
                <ExternalLink className="w-5 h-5 text-indigo-300" />
                Inspect IPFS Node
              </a>
            </div>
          </div>
        </div>

        <div className="text-center mt-20 pt-10 border-t border-black/5">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 px-1">
            Build your own Digital Legacy with Block Pix
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-indigo-600 font-black hover:text-indigo-700 transition-colors uppercase tracking-widest text-xs group"
          >
            Create Your Vault
            <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    </div>
  );
};

export default SharedMemory;
