import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    doc,
    updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User } from '../types';
import {
    Search,
    UserCheck,
    UserX,
    BadgeCheck,
    Filter,
    Mail,
    Calendar,
    Shield,
    ChevronRight,
    User as UserIcon,
    Users as UsersGroup,
    TrendingUp,
    ShieldAlert,
    CheckCircle2
} from 'lucide-react';

export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterKYC, setFilterKYC] = useState<string>('all');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                const usersList = querySnapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                })) as User[];
                setUsers(usersList);
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleVerifyKYC = async (uid: string, status: 'verified' | 'rejected') => {
        try {
            await updateDoc(doc(db, 'users', uid), {
                kycStatus: status,
                updatedAt: new Date()
            });
            setUsers(users.map(u => u.uid === uid ? { ...u, kycStatus: status } : u));
        } catch (error) {
            console.error('Error updating KYC status:', error);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            (user.displayName || user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole || (user as any).userType === filterRole;
        const matchesKYC = filterKYC === 'all' || user.kycStatus === filterKYC;

        return matchesSearch && matchesRole && matchesKYC;
    });

    const userStats = {
        total: users.length,
        investors: users.filter(u => u.role === 'investor' || (u as any).userType === 'investor').length,
        farmers: users.filter(u => u.role === 'farmer' || (u as any).userType === 'farmer').length,
        pendingKYC: users.filter(u => u.kycStatus === 'pending').length,
        verifiedPct: Math.round((users.filter(u => u.kycStatus === 'verified').length / (users.length || 1)) * 100)
    };

    if (loading) {
        return (
            <div className="space-y-10 animate-pulse outline-none">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-200/50 rounded-[2.5rem] border border-slate-100"></div>
                    ))}
                </div>
                <div className="h-96 bg-slate-200/50 rounded-[3rem] border border-slate-100 w-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 focus:outline-none">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Identity Management</h1>
                    <p className="text-slate-500 font-bold mt-1">Verify accounts and manage platform user permissions</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-fami-green transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green focus:shadow-lg focus:shadow-fami-green/10 transition-all w-full sm:w-64 font-medium text-slate-600"
                        />
                    </div>

                    <div className="flex gap-3">
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="appearance-none pl-10 pr-8 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green transition-all font-bold text-slate-600 text-xs cursor-pointer hover:bg-slate-50 uppercase tracking-widest"
                            >
                                <option value="all">Any Role</option>
                                <option value="investor">Investors</option>
                                <option value="farmer">Farmers</option>
                                <option value="admin">Admins</option>
                            </select>
                        </div>

                        <div className="relative">
                            <BadgeCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <select
                                value={filterKYC}
                                onChange={(e) => setFilterKYC(e.target.value)}
                                className="appearance-none pl-10 pr-8 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green transition-all font-bold text-slate-600 text-xs cursor-pointer hover:bg-slate-50 uppercase tracking-widest"
                            >
                                <option value="all">KYC: All</option>
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <SimpleStatCard
                    label="Active Investors"
                    value={userStats.investors}
                    icon={TrendingUp}
                    color="bg-blue-50 text-blue-600"
                />
                <SimpleStatCard
                    label="Total Farmers"
                    value={userStats.farmers}
                    icon={UsersGroup}
                    color="bg-emerald-50 text-emerald-600"
                />
                <SimpleStatCard
                    label="KYC Queue"
                    value={userStats.pendingKYC}
                    icon={ShieldAlert}
                    color="bg-rose-50 text-rose-600"
                    isAlert={userStats.pendingKYC > 0}
                />
                <SimpleStatCard
                    label="Verification Rate"
                    value={`${userStats.verifiedPct}%`}
                    icon={CheckCircle2}
                    color="bg-indigo-50 text-indigo-600"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200/60 overflow-hidden relative">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Member Profile</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Access Tier</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Security Status</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Registration</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredUsers.map((user) => (
                            <tr key={user.uid} className="hover:bg-slate-50/30 transition-all duration-300 group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-fami-dark to-slate-800 text-fami-green flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-105 transition-transform">
                                                {(user.displayName || user.username || user.email).charAt(0).toUpperCase()}
                                            </div>
                                            {user.kycStatus === 'verified' && (
                                                <div className="absolute -bottom-1 -right-1 bg-fami-green text-fami-dark rounded-lg p-1 border-2 border-white shadow-sm">
                                                    <BadgeCheck size={12} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 tracking-tight group-hover:text-fami-dark transition-colors">{user.displayName || user.username || 'Unnamed User'}</p>
                                            <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-500 transition-colors">
                                                <Mail size={12} />
                                                <p className="text-xs font-bold">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic border ${user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                        (user.role === 'farmer' || (user as any).userType === 'farmer') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-blue-50 text-blue-600 border-blue-100'
                                        }`}>
                                        {user.role || (user as any).userType}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1">
                                        {user.kycStatus === 'verified' ? (
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <span className="font-black text-[11px] uppercase tracking-tight italic">Fully Verified</span>
                                            </div>
                                        ) : user.kycStatus === 'pending' ? (
                                            <div className="flex items-center gap-2 text-amber-600">
                                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                                <span className="font-black text-[11px] uppercase tracking-tight italic">Review Needed</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                                <span className="font-black text-[11px] uppercase tracking-tight italic">Uninitiated</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2 text-slate-400 italic">
                                        <Calendar size={14} />
                                        <span className="text-xs font-bold">
                                            {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                        {user.kycStatus === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleVerifyKYC(user.uid, 'verified')}
                                                    className="w-10 h-10 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-100"
                                                    title="Approve Member"
                                                >
                                                    <UserCheck size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleVerifyKYC(user.uid, 'rejected')}
                                                    className="w-10 h-10 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-red-500/10 border border-red-100"
                                                    title="Reject Member"
                                                >
                                                    <UserX size={18} />
                                                </button>
                                            </>
                                        )}
                                        <button className="w-10 h-10 bg-slate-100 hover:bg-fami-dark hover:text-white text-slate-500 rounded-xl transition-all flex items-center justify-center">
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="py-32 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 rounded-full mb-6 italic">
                            <UserIcon size={40} className="text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Target users not found.</p>
                    </div>
                )}
            </div>

            {/* Security Notice */}
            <div className="bg-gradient-to-r from-slate-900 to-fami-dark rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-fami-green/10 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-fami-green/20 transition-all duration-1000"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-fami-green">
                            <Shield size={26} />
                        </div>
                        <h4 className="text-3xl font-black italic uppercase tracking-tighter">Governance Protocol</h4>
                    </div>
                    <p className="text-slate-400 font-bold max-w-xl text-lg leading-relaxed">
                        KYC verification is a mandatory legal requirement for capital management in Kenya. Ensure all documents are clearly legible before final approval.
                    </p>
                </div>

                <div className="relative z-10 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md min-w-[280px] hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-black text-fami-green uppercase tracking-[0.3em] mb-4">Verification Health</p>
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-white/5 pb-2">
                            <span className="text-slate-400 font-black uppercase text-[11px] italic">Verified Assets</span>
                            <span className="text-2xl font-black italic tracking-tighter">
                                {userStats.verifiedPct}%
                            </span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-slate-400 font-black uppercase text-[11px] italic">Review Queue</span>
                            <span className="text-2xl font-black italic tracking-tighter text-amber-400">
                                {userStats.pendingKYC}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SimpleStatCard: React.FC<{ label: string, value: string | number, icon: any, color: string, isAlert?: boolean }> = ({ label, value, icon: Icon, color, isAlert }) => (
    <div className={`bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-xl hover:shadow-slate-100/50 transition-all group relative overflow-hidden`}>
        {isAlert && <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full m-6 animate-ping"></div>}
        <div className={`h-14 w-14 rounded-2xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
    </div>
);
