// file: src/pages/ConfirmBeneficiary.tsx

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { willAPI } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    AlertCircle,
    Loader2,
    ArrowRight,
    CheckCircle2,
    Home,
    UserCheck
} from 'lucide-react';

const ConfirmBeneficiary: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [details, setDetails] = useState<any>(null);

    useEffect(() => {
        const confirm = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid or missing confirmation token.');
                return;
            }

            try {
                const response = await willAPI.confirmBeneficiary(token);
                if (response.data.success) {
                    setStatus('success');
                    setDetails(response.data.data);
                } else {
                    setStatus('error');
                    setMessage(response.data.message || 'Failed to confirm beneficiary.');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'A server error occurred during confirmation.');
            }
        };

        confirm();
    }, [token]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-lg"
            >
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 sm:p-12 text-center">

                        <AnimatePresence mode="wait">
                            {status === 'loading' && (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-8 border border-indigo-500/20">
                                        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-white tracking-tight">Verifying Identity</h1>
                                    <p className="text-slate-400">Please wait while we secure your role in the Digital Will network.</p>
                                </motion.div>
                            )}

                            {status === 'success' && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-6"
                                >
                                    <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-8 relative border border-emerald-500/20">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1.2, opacity: 0 }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                            className="absolute inset-0 bg-emerald-500/20 rounded-full"
                                        />
                                        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                    </div>

                                    <h1 className="text-4xl font-bold text-white tracking-tight">Identity Secured</h1>
                                    <p className="text-slate-400 text-lg leading-relaxed">
                                        You have successfully confirmed your role as a beneficiary. You will now receive legacy notifications and access when the protocol activates.
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mt-8">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Status</p>
                                            <p className="text-emerald-400 font-bold">VERIFIED</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Confirmations</p>
                                            <p className="text-white font-bold">{details?.currentConfirmations || 1} / {details?.requiredConfirmations || 1}</p>
                                        </div>
                                    </div>

                                    <div className="pt-8">
                                        <Link
                                            to="/login"
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group"
                                        >
                                            Go to Dashboard
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                </motion.div>
                            )}

                            {status === 'error' && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                                        <AlertCircle className="w-10 h-10 text-red-500" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-white tracking-tight">Verification Failed</h1>
                                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                                        <p className="text-red-400 font-medium">{message}</p>
                                    </div>
                                    <p className="text-slate-500 text-sm">
                                        The link may have expired or was already used. Please contact the will owner to resend the invitation.
                                    </p>

                                    <div className="pt-6">
                                        <Link
                                            to="/"
                                            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                                        >
                                            <Home className="w-4 h-4" />
                                            Back to Home
                                        </Link>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>

                    {/* Footer Branding */}
                    <div className="bg-white/[0.02] border-t border-white/10 p-6 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-50">
                            <ShieldCheck className="w-4 h-4 text-white" />
                            <span className="text-xs font-bold text-white uppercase tracking-[0.2em]">Enforced by Block Pix Protocol</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmBeneficiary;
