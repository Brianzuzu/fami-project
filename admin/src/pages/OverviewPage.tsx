import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    Users,
    Sprout,
    TrendingUp,
    ShieldCheck,
    ArrowUpRight,
    Wallet,
    ChevronRight,
    Activity,
    Zap,
    ArrowDownCircle,
    Store
} from 'lucide-react';

interface Stats {
    users: {
        total: number;
        investors: number;
        farmers: number;
        admins: number;
        pendingKYC: number;
        pendingTrustReviews: number;
    };
    pools: {
        total: number;
        active: number;
        draft: number;
    };
    investments: {
        totalVolume: number;
        activeDeals: number;
    };
    transactions: {
        totalVolume: number;
        recentCount: number;
        pendingWithdrawals: number;
    };
    marketplace: {
        totalListings: number;
        activeListings: number;
    };
}

export const OverviewPage: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const usersSnap = await getDocs(collection(db, 'users'));
                const poolsSnap = await getDocs(collection(db, 'pools'));
                const investmentsSnap = await getDocs(collection(db, 'investments'));
                const transactionsSnap = await getDocs(collection(db, 'transactions'));
                const marketplaceSnap = await getDocs(collection(db, 'marketplace'));

                // Users breakdown
                let investors = 0, farmers = 0, admins = 0, pendingKYC = 0, pendingTrustReviews = 0;
                usersSnap.forEach(doc => {
                    const d = doc.data();
                    if (d.role === 'investor' || d.userType === 'investor') investors++;
                    if (d.role === 'farmer' || d.userType === 'farmer') farmers++;
                    if (d.role === 'admin') admins++;
                    if (d.kycStatus === 'pending') pendingKYC++;
                    if (d.trustScoreStatus === 'pending') pendingTrustReviews++;
                });

                // Marketplace Stats
                const totalListings = marketplaceSnap.size;
                const activeListings = marketplaceSnap.docs.filter(d => d.data().status !== 'Sold').length;

                // Investment Volume
                let totalInvVolume = 0;
                investmentsSnap.forEach(doc => {
                    totalInvVolume += (doc.data().amount || 0);
                });

                // Transaction Volume & Withdrawals
                let totalTxVolume = 0;
                let pendingWithdrawals = 0;
                transactionsSnap.forEach(doc => {
                    const tx = doc.data();
                    totalTxVolume += (tx.amount || 0);
                    if (tx.type === 'Withdrawal' && tx.status === 'pending') {
                        pendingWithdrawals++;
                    }
                });

                setStats({
                    users: { total: usersSnap.size, investors, farmers, admins, pendingKYC, pendingTrustReviews },
                    pools: {
                        total: poolsSnap.size,
                        active: poolsSnap.docs.filter(d => d.data().status === 'active').length,
                        draft: poolsSnap.docs.filter(d => d.data().status === 'draft').length
                    },
                    investments: {
                        totalVolume: totalInvVolume,
                        activeDeals: investmentsSnap.docs.filter(d => d.data().status === 'active').length
                    },
                    transactions: {
                        totalVolume: totalTxVolume,
                        recentCount: transactionsSnap.size,
                        pendingWithdrawals
                    },
                    marketplace: {
                        totalListings,
                        activeListings
                    }
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="space-y-10 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-44 bg-slate-200/50 rounded-[3rem] border border-slate-100 italic"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 h-96 bg-slate-200/50 rounded-[3.5rem] border border-slate-100"></div>
                    <div className="h-96 bg-slate-200/50 rounded-[3.5rem] border border-slate-100"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">Platform Nerve Center</h1>
                    <p className="text-slate-500 font-bold mt-1">Real-time telemetry and system governance</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Node Status: Active</span>
                    </div>
                </div>
            </div>

            {/* Core Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard
                    label="Total Asset Under Management"
                    value={`KES ${(stats?.investments.totalVolume || 0).toLocaleString()}`}
                    icon={TrendingUp}
                    trend="+12.5%"
                    up={true}
                    color="bg-fami-dark text-fami-green"
                />
                <StatCard
                    label="Active User Nodes"
                    value={stats?.users.total || 0}
                    icon={Users}
                    trend="+48 this week"
                    up={true}
                    color="bg-blue-50 text-blue-600"
                />
                <StatCard
                    label="Live Project Pools"
                    value={stats?.pools.active || 0}
                    icon={Sprout}
                    trend="3 Pending Review"
                    up={false}
                    color="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                    label="Total Capital Flow"
                    value={`KES ${(stats?.transactions.totalVolume || 0).toLocaleString()}`}
                    icon={Wallet}
                    trend="System Normal"
                    up={true}
                    color="bg-purple-50 text-purple-600"
                />
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Visual Data / Summary Section */}
                <div className="xl:col-span-2 space-y-10">
                    <div className="bg-gradient-to-br from-fami-dark to-slate-900 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl group">
                        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-fami-green opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity"></div>

                        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
                            <div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-fami-green border border-white/10 shadow-inner">
                                        <Zap size={28} />
                                    </div>
                                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">System Fidelity</h2>
                                </div>
                                <p className="text-slate-400 font-bold max-w-lg text-lg leading-relaxed">
                                    Your dashboard is Currently syncing with <span className="text-white">Regional Hubs</span>.
                                    Capital security is maintaining <span className="text-fami-green italic">Tier-1 Encryption</span> protocols.
                                </p>
                            </div>

                            <div className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-[2.5rem] min-w-[280px]">
                                <p className="text-[10px] font-black text-fami-green uppercase tracking-[0.3em] mb-4">Network Health</p>
                                <div className="space-y-4">
                                    <HealthRow label="Firebase Sync" value="99.9%" />
                                    <HealthRow label="Payment Gateway" value="Stable" />
                                    <HealthRow label="Admin Latency" value="1.2ms" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ActionCard
                            label="KYC Verification"
                            count={stats?.users.pendingKYC || 0}
                            sub="Action Required: Review account documents"
                            icon={ShieldCheck}
                            onClick={() => navigate('/users')}
                            color="rose"
                        />
                        <ActionCard
                            label="Capital Releases"
                            count={stats?.transactions.pendingWithdrawals || 0}
                            sub="Action Required: Pending withdrawals"
                            icon={ArrowDownCircle}
                            onClick={() => navigate('/financials')}
                            color="emerald"
                        />
                        <ActionCard
                            label="Credit Intake"
                            count={stats?.users.pendingTrustReviews || 0}
                            sub="Action Required: Trust score allocations"
                            icon={Activity}
                            onClick={() => navigate('/credit')}
                            color="indigo"
                        />
                        <ActionCard
                            label="Draft Projects"
                            count={stats?.pools.draft || 0}
                            sub="Action Required: Validate farm proposals"
                            icon={Sprout}
                            onClick={() => navigate('/pools')}
                            color="amber"
                        />
                        <ActionCard
                            label="Marketplace Activity"
                            count={stats?.marketplace.activeListings || 0}
                            sub="Live farmer produce listings"
                            icon={Store}
                            onClick={() => navigate('/marketplace')}
                            color="slate"
                        />
                    </div>
                </div>

                {/* Right Sidebar - Action Queue */}
                <div className="bg-white rounded-[3.5rem] p-10 border border-slate-200/60 shadow-sm relative overflow-hidden h-fit">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Critical Queue</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Interrupts</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
                            <Activity size={20} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {stats?.users.pendingKYC === 0 && stats?.pools.draft === 0 && stats?.users.pendingTrustReviews === 0 && stats?.transactions.pendingWithdrawals === 0 ? (
                            <div className="py-12 text-center">
                                <Activity className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic">All Nodes Synchronized</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {stats?.transactions.pendingWithdrawals && stats.transactions.pendingWithdrawals > 0 ? (
                                    <QueueItem title="Capital Payout" desc={`${stats.transactions.pendingWithdrawals} Pending releases`} type="Payout" color="text-rose-600 bg-rose-50 border-rose-100" />
                                ) : null}
                                {stats?.users.pendingKYC && stats.users.pendingKYC > 0 ? (
                                    <QueueItem title="KYC Verification" desc={`${stats.users.pendingKYC} Members in waitlist`} type="Alert" color="text-blue-600 bg-blue-50 border-blue-100" />
                                ) : null}
                                {stats?.pools.draft && stats.pools.draft > 0 ? (
                                    <QueueItem title="Pool Approval" desc={`${stats.pools.draft} Proposals for review`} type="Review" color="text-amber-600 bg-amber-50 border-amber-100" />
                                ) : null}
                                {stats?.users.pendingTrustReviews && stats.users.pendingTrustReviews > 0 ? (
                                    <QueueItem title="Credit Scoring" desc={`${stats.users.pendingTrustReviews} Applications received`} type="Verify" color="text-indigo-600 bg-indigo-50 border-indigo-100" />
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className="mt-12 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-fami-green/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">System Uptime</p>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-black tracking-tighter italic">99.98</span>
                                <span className="text-xs font-black text-fami-green uppercase mb-1">%</span>
                            </div>
                            <div className="mt-4 flex gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i > 10 ? 'bg-slate-200' : 'bg-fami-green shadow-[0_0_8px_rgba(121,191,78,0.5)]'}`}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string, value: string | number, icon: any, trend: string, up: boolean, color: string }> = ({ label, value, icon: Icon, trend, up, color }) => (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
        <div className={`absolute -top-10 -right-10 w-32 h-32 ${color.includes('fami') ? 'bg-fami-green/5' : 'bg-slate-50'} rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`}></div>

        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                <Icon size={26} />
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black italic ${up ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-slate-400 bg-slate-50 border border-slate-100'}`}>
                {up ? <ArrowUpRight size={12} /> : <Activity size={12} />}
                {trend}
            </div>
        </div>

        <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 italic">{label}</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic whitespace-nowrap overflow-hidden text-ellipsis">{value}</h3>
        </div>
    </div>
);

const ActionCard: React.FC<{ label: string, count: number, sub: string, icon: any, onClick?: () => void, color: string }> = ({ label, count, sub, icon: Icon, onClick, color }) => {
    const colorStyles: any = {
        rose: "text-rose-600 bg-rose-50 border-rose-100 shadow-rose-500/10 hover:bg-rose-500 hover:text-white",
        amber: "text-amber-600 bg-amber-50 border-amber-100 shadow-amber-500/10 hover:bg-amber-500 hover:text-white",
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-500/10 hover:bg-indigo-500 hover:text-white",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-500/10 hover:bg-emerald-500 hover:text-white",
        slate: "text-slate-600 bg-white border-slate-200 shadow-slate-500/10 hover:bg-fami-dark hover:text-white",
    };

    return (
        <div
            onClick={onClick}
            className="bg-white border border-slate-100 p-8 rounded-[3rem] flex items-center justify-between hover:shadow-2xl hover:shadow-slate-200/50 transition-all group/card cursor-pointer relative overflow-hidden"
        >
            <div className="relative z-10 flex items-center gap-6">
                <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-all duration-500 group-hover/card:scale-110 group-hover/card:-rotate-3 ${colorStyles[color]?.split(' hover:')[0] || "bg-slate-100"}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1 italic group-hover/card:text-slate-900 transition-colors">{label}</h3>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter group-hover/card:text-fami-dark transition-colors">{count}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide group-hover/card:text-slate-500">{sub}</p>
                </div>
            </div>
            <div className={`p-3 rounded-full bg-slate-50 text-slate-300 group-hover/card:bg-fami-green group-hover/card:text-fami-dark transition-all shadow-inner`}>
                <ChevronRight size={24} />
            </div>
        </div>
    );
};

const HealthRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-center bg-white/5 px-5 py-3 rounded-2xl border border-white/5 box-border">
        <span className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest">{label}</span>
        <span className="text-xs font-black text-white italic">{value}</span>
    </div>
);

const QueueItem: React.FC<{ title: string, desc: string, type: string, color: string }> = ({ title, desc, type, color }) => (
    <div className={`p-6 rounded-[2.5rem] border ${color} relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all`}>
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-black italic uppercase tracking-tighter text-sm">{title}</h4>
            <span className="px-2 py-0.5 rounded-lg border border-current text-[8px] font-black uppercase tracking-[0.2em]">{type}</span>
        </div>
        <p className="text-xs font-bold opacity-70 leading-relaxed">{desc}</p>
    </div>
);
