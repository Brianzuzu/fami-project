import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

            if (userDoc.exists() && userDoc.data().role === 'admin') {
                navigate('/');
            } else {
                await auth.signOut();
                setError('Access denied. Admin role required.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-fami-dark relative overflow-hidden font-sans">
            {/* Animated Decorative Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-fami-green/30 rounded-full blur-[160px] animate-pulse"></div>
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-fami-accent/20 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <div className="w-full max-w-md z-10 px-4">
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-fami-green/20 rounded-3xl mb-6 border border-fami-green/30">
                            <LogIn className="text-fami-green" size={40} />
                        </div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Fami Admin</h1>
                        <p className="text-slate-400 font-medium">Internal Management Console</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-2xl mb-8 text-sm flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-300 ml-1">Admin Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-fami-green focus:bg-white/[0.08] transition-all"
                                placeholder="name@fami.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-300 ml-1">Secure Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-fami-green focus:bg-white/[0.08] transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-fami-green hover:bg-fami-accent hover:scale-[1.02] text-fami-dark font-black py-5 rounded-2xl transition-all duration-300 shadow-lg shadow-fami-green/20 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? (
                                <div className="h-6 w-6 border-3 border-fami-dark border-t-transparent animate-spin rounded-full"></div>
                            ) : (
                                <>
                                    <LogIn size={22} />
                                    <span className="tracking-widest uppercase">Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-white/5 text-center">
                        <p className="text-slate-500 text-xs">
                            Secure Access Restricted to Authorized Personnel Only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

