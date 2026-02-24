import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    TrendingUp,
    Sprout,
    Calendar,
    Filter,
    Search,
    ChevronRight,
    PieChart,
    Wallet,
    Clock,
    CreditCard
} from 'lucide-react';

interface Investment {
    id: string;
    uid: string;
    poolId: string;
    amount: number;
    investorName: string;
    poolName: string;
    date: any;
    paymentMethod?: string;
    status: 'active' | 'completed' | 'withdrawn';
    expectedReturn?: number;
}

export const InvestmentManager: React.FC = () => {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const fetchInvestments = async () => {
            try {
                const q = query(collection(db, 'investments'), orderBy('date', 'desc'));
                const querySnapshot = await getDocs(q);
                const list = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Investment[];
                setInvestments(list);
            } catch (error) {
                console.error('Error fetching investments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvestments();
    }, []);

    const filteredInvestments = investments.filter(inv => {
        const matchesSearch =
            inv.investorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.poolName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        totalCapital: investments.reduce((acc, inv) => acc + (inv.amount || 0), 0),
        activeCount: investments.filter(inv => inv.status === 'active').length,
        averageSize: Math.round(investments.reduce((acc, inv) => acc + (inv.amount || 0), 0) / (investments.length || 1)),
        projectedYield: Math.round(investments.reduce((acc, inv) => acc + (inv.amount || 0), 0) * 0.15) // Mock 15% avg
    };

    if (loading) {
        return (
            <div className="space-y-10 animate-pulse">
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
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Capital Management</h1>
                    <p className="text-slate-500 font-bold mt-1">Monitor all active investment contracts and yields</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-fami-green transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find by investor or pool..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green focus:shadow-lg focus:shadow-fami-green/10 transition-all w-full sm:w-64 font-medium text-slate-600"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none pl-10 pr-8 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green transition-all font-bold text-slate-600 text-xs cursor-pointer hover:bg-slate-50 uppercase tracking-widest"
                        >
                            <option value="all">Any Status</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="withdrawn">Withdrawn</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <SimpleStatCard
                    label="Active Assets"
                    value={`KES ${(stats.totalCapital / 1000000).toFixed(1)}M`}
                    sub="Total AUM"
                    icon={TrendingUp}
                    color="bg-fami-dark text-fami-green"
                />
                <SimpleStatCard
                    label="Open Contracts"
                    value={stats.activeCount}
                    sub="Individual investments"
                    icon={PieChart}
                    color="bg-blue-50 text-blue-600"
                />
                <SimpleStatCard
                    label="Yield Projection"
                    value={`KES ${stats.projectedYield.toLocaleString()}`}
                    sub="Expected total payouts"
                    icon={Sprout}
                    color="bg-emerald-50 text-emerald-600"
                />
                <SimpleStatCard
                    label="Avg. Position"
                    value={`KES ${stats.averageSize.toLocaleString()}`}
                    sub="Per investor"
                    icon={Wallet}
                    color="bg-purple-50 text-purple-600"
                />
            </div>

            {/* Investments List */}
            <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200/60 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Investor Name</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Target Pool</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Capital Placement</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Date</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredInvestments.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/30 transition-all duration-300 group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-slate-900 text-fami-green flex items-center justify-center font-black text-sm shadow-lg group-hover:scale-110 transition-transform">
                                            {inv.investorName?.charAt(0) || 'I'}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 uppercase italic tracking-tight">{inv.investorName}</p>
                                            <p className="text-[10px] font-bold text-slate-400">UID: ...{inv.uid?.slice(-8).toUpperCase()}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <Sprout size={14} className="text-emerald-500" />
                                        <span className="font-bold text-slate-700 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                                            {inv.poolName}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-lg font-black tracking-tighter text-slate-900 italic">
                                            KES {inv.amount?.toLocaleString()}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <CreditCard size={10} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{inv.paymentMethod || 'Wallet'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2 text-slate-400 italic">
                                        <Calendar size={14} className="text-fami-green" />
                                        <span className="text-xs font-black uppercase">
                                            {inv.date?.seconds ? new Date(inv.date.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <div className="flex justify-end items-center gap-4">
                                        <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic border ${inv.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            inv.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                'bg-slate-50 text-slate-400 border-slate-100'
                                            }`}>
                                            {inv.status}
                                        </div>
                                        <button className="p-2 text-slate-300 hover:text-fami-dark hover:bg-slate-100 rounded-xl transition-all">
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredInvestments.length === 0 && (
                    <div className="py-32 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-50 rounded-full mb-8 italic border border-slate-100 shadow-inner">
                            <Wallet size={44} className="text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm italic">No investment records found.</p>
                    </div>
                )}
            </div>

            {/* Performance Banner */}
            <div className="bg-gradient-to-r from-fami-dark to-slate-900 rounded-[3.5rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-fami-green/10 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-fami-green/20 transition-all duration-1000"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-fami-green">
                            <Clock size={26} />
                        </div>
                        <h4 className="text-3xl font-black italic uppercase tracking-tighter">Contract Maturity</h4>
                    </div>
                    <p className="text-slate-400 font-bold max-w-xl text-lg leading-relaxed">
                        Platform investments are locked for the duration of the farming cycle (typically 3-6 months). Yields are distributed within 48 hours of pool completion.
                    </p>
                </div>

                <div className="relative z-10 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md min-w-[300px]">
                    <p className="text-[10px] font-black text-fami-green uppercase tracking-[0.3em] mb-4">Yield Liquidity</p>
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-white/5 pb-2">
                            <span className="text-slate-400 font-black uppercase text-[11px] italic">Ready for Payout</span>
                            <span className="text-2xl font-black italic tracking-tighter">
                                KES 0
                            </span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-slate-400 font-black uppercase text-[11px] italic">Locked Capital</span>
                            <span className="text-2xl font-black italic tracking-tighter text-fami-green">
                                KES {stats.totalCapital.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SimpleStatCard: React.FC<{ label: string, value: string | number, sub: string, icon: any, color: string }> = ({ label, value, sub, icon: Icon, color }) => (
    <div className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col hover:shadow-2xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden`}>
        <div className={`absolute -top-6 -right-6 w-20 h-20 ${color} opacity-[0.05] rounded-full blur-xl group-hover:scale-150 transition-transform`}></div>
        <div className={`h-14 w-14 rounded-2xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform mb-6 shadow-sm`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{value}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 italic">{sub}</p>
        </div>
    </div>
);
