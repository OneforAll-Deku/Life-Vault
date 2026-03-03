import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Building2, Lock, Mail, Loader2 } from 'lucide-react';

const isBusinessUserType = (userType?: string) =>
  ['creator', 'brand', 'government', 'admin'].includes(userType || '');

const BusinessLogin: React.FC = () => {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('business@blockpix.demo');
  const [password, setPassword] = useState('Business@123');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && isBusinessUserType((user as any).userType)) {
    return <Navigate to="/business/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await login(email, password);
    if (!res.success) {
      setError(res.message || 'Login failed');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-black/10 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-black leading-5">Business Portal</h1>
            <p className="text-sm text-black/50">
              Use the demo credentials to access the business dashboard.
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <div className="font-semibold mb-1">Demo business credentials</div>
          <div className="text-xs text-amber-900/70">
            Email: <span className="font-mono">business@blockpix.demo</span> <br />
            Password: <span className="font-mono">Business@123</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-black/60 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-black/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="business@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-black/60 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-black/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-black text-white font-semibold hover:bg-black/80 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
              </>
            ) : (
              'Sign in to Business'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BusinessLogin;

