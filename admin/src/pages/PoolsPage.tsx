import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    addDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { callBackend } from '../lib/api';
import type { Pool } from '../types';
import {
    Search,
    CheckCircle2,
    XCircle,
    Sprout,
    ChevronRight,
    Filter,
    ArrowUpRight,
    TrendingUp,
    Shield,
    Plus,
    Trash2
} from 'lucide-react';

const EMPTY_POOL = {
    name: '',
    category: 'crops',
    description: '',
    location: '',
    duration: '',
    roi: '',
    standardROI: '',
    revenueROI: '',
    risk: 'Low',
    riskScore: 75,
    funded: '0%',
    impact: [''],
    status: 'active',
    targetAmount: 0,
    raisedAmount: 0,
    interestType: 'percentage', // percentage, roi, revenue_share
    interestRate: 15,
};

export const PoolsPage: React.FC = () => {
    const [pools, setPools] = useState<Pool[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPool, setNewPool] = useState({ ...EMPTY_POOL });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPools();
    }, []);

    const fetchPools = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'pools'));
            const poolsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Pool[];
            setPools(poolsList);
        } catch (error) {
            console.error('Error fetching pools:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprovePool = async (poolId: string, approved: boolean) => {
        try {
            await callBackend('approvePool', { poolId, approved });
            setPools(pools.map(p => p.id === poolId ? { ...p, status: approved ? 'active' : 'cancelled' } : p));
        } catch (error) {
            console.error('Error processing pool approval:', error);
            alert('Failed to process pool approval.');
        }
    };

    const handleCreatePool = async () => {
        if (!newPool.name || !newPool.description) {
            alert('Pool name and description are required.');
            return;
        }
        setSaving(true);
        try {
            const poolData = {
                ...newPool,
                impact: newPool.impact.filter(i => i.trim() !== ''),
                riskScore: Number(newPool.riskScore),
                targetAmount: Number(newPool.targetAmount),
                raisedAmount: Number(newPool.raisedAmount),
                interestRate: Number(newPool.interestRate),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            const ref = await addDoc(collection(db, 'pools'), poolData);
            setPools([...pools, { id: ref.id, ...poolData } as any]);
            setIsModalOpen(false);
            setNewPool({ ...EMPTY_POOL });
        } catch (error) {
            console.error('Error creating pool:', error);
            alert('Failed to create pool.');
        } finally {
            setSaving(false);
        }
    };

    const updateImpact = (index: number, value: string) => {
        const updated = [...newPool.impact];
        updated[index] = value;
        setNewPool({ ...newPool, impact: updated });
    };

    const addImpactRow = () => setNewPool({ ...newPool, impact: [...newPool.impact, ''] });

    const removeImpactRow = (index: number) => {
        const updated = newPool.impact.filter((_, i) => i !== index);
        setNewPool({ ...newPool, impact: updated.length ? updated : [''] });
    };

    const filteredPools = pools.filter(pool => {
        const matchesSearch =
            pool.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pool.farmerName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || pool.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="space-y-10 animate-pulse">
                <div className="h-24 bg-slate-200/50 rounded-[2.5rem] w-full border border-slate-100"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-80 bg-slate-200/50 rounded-[3rem] border border-slate-100 w-full"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Project Pools</h1>
                    <p className="text-slate-500 font-bold mt-1">Manage and approve farming investment opportunities</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-fami-green transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search pools or farmers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green transition-all w-full sm:w-64 font-medium text-slate-600"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green transition-all font-bold text-slate-600 text-sm cursor-pointer hover:bg-slate-50"
                        >
                            <option value="all">Global Status</option>
                            <option value="draft">Review Required</option>
                            <option value="active">Active Pools</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-fami-dark text-fami-green rounded-2xl font-black text-sm uppercase italic tracking-tighter shadow-xl shadow-fami-dark/10 hover:scale-105 transition-all"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Create Pool
                    </button>
                </div>
            </div>

            {/* Pools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                {filteredPools.map((pool) => (
                    <div key={pool.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-200/60 overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative">
                        <div className={`h-1.5 w-full ${pool.status === 'active' ? 'bg-fami-green' :
                            pool.status === 'draft' ? 'bg-amber-400' :
                                pool.status === 'completed' ? 'bg-blue-500' : 'bg-slate-300'
                            }`}></div>

                        <div className="p-8 pb-4">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic ${pool.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    pool.status === 'draft' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                        pool.status === 'completed' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                            'bg-slate-50 text-slate-600 border border-slate-100'
                                    }`}>
                                    {pool.status === 'draft' ? 'Action Required' : pool.status}
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-fami-dark group-hover:text-fami-green transition-all shadow-inner">
                                    <Sprout size={20} />
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-2 truncate group-hover:text-fami-dark transition-colors tracking-tight">{pool.name}</h3>
                            <div className="flex items-center gap-2 mb-8 bg-slate-50 w-full p-2.5 rounded-2xl border border-dashed border-slate-200">
                                <div className="h-8 w-8 rounded-lg bg-fami-dark text-[10px] font-black text-fami-green flex items-center justify-center">
                                    {pool.farmerName?.charAt(0) || 'A'}
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Project Lead</p>
                                    <p className="text-sm font-bold text-slate-700">{pool.farmerName || 'Admin'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <TrendingUp size={12} /> Target
                                    </p>
                                    <p className="text-lg font-black text-slate-900 tracking-tighter">KES {pool.targetAmount?.toLocaleString()}</p>
                                </div>
                                <div className="bg-fami-green/5 p-4 rounded-[2rem] border border-fami-green/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-12 h-12 bg-fami-green/10 rounded-full blur-xl translate-x-4 -translate-y-4"></div>
                                    <p className="text-[10px] font-black text-fami-green/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <ArrowUpRight size={12} /> ROI
                                    </p>
                                    <p className="text-lg font-black text-fami-dark tracking-tighter">{(pool as any).roi || pool.expectedROI}%</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Funding Progress</p>
                                        <p className="text-xs font-bold text-slate-600">KES {pool.raisedAmount?.toLocaleString() || 0} Raised</p>
                                    </div>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-xl font-black text-fami-dark leading-none">{Math.round((pool.raisedAmount / pool.targetAmount) * 100) || 0}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase">%</span>
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full p-0.5 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-fami-green to-fami-accent rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(121,191,78,0.4)]"
                                        style={{ width: `${Math.min(100, (pool.raisedAmount / pool.targetAmount) * 100) || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                            {pool.status === 'draft' ? (
                                <>
                                    <button
                                        onClick={() => handleApprovePool(pool.id, true)}
                                        className="flex-[2] bg-fami-green hover:bg-fami-accent text-fami-dark font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-fami-green/20 uppercase italic tracking-tighter"
                                    >
                                        <CheckCircle2 size={18} />
                                        Approve Project
                                    </button>
                                    <button
                                        onClick={() => handleApprovePool(pool.id, false)}
                                        className="flex-1 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center group/reject"
                                    >
                                        <XCircle size={20} className="group-hover/reject:scale-110 transition-transform" />
                                    </button>
                                </>
                            ) : (
                                <button className="w-full bg-white border border-slate-200 text-slate-700 font-black py-4 rounded-2xl hover:bg-fami-dark hover:text-white transition-all duration-300 flex items-center justify-center gap-3 uppercase italic tracking-tighter">
                                    Analysis & Details <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredPools.length === 0 && (
                <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-inner">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 rounded-full mb-6">
                        <Sprout size={40} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No project pools match your criteria.</p>
                    <button
                        onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                        className="mt-6 text-fami-green font-bold text-sm hover:text-fami-dark transition-colors underline underline-offset-4"
                    >
                        Clear all filters
                    </button>
                </div>
            )}

            {/* Global Stats Footer */}
            <div className="bg-fami-dark rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="relative z-10">
                    <h4 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <Shield className="text-fami-green" />
                        Pool Management
                    </h4>
                    <p className="text-slate-400 font-bold mt-1 max-w-md">Security protocol active. All approvals are logged for audit purposes.</p>
                </div>
                <div className="flex gap-10 relative z-10">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-fami-green uppercase tracking-[0.2em] mb-2">Active</p>
                        <p className="text-3xl font-black tracking-tighter">{pools.filter(p => p.status === 'active').length}</p>
                    </div>
                    <div className="w-[1px] h-12 bg-white/10 hidden md:block"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-2">In Review</p>
                        <p className="text-3xl font-black tracking-tighter">{pools.filter(p => p.status === 'draft').length}</p>
                    </div>
                    <div className="w-[1px] h-12 bg-white/10 hidden md:block"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total</p>
                        <p className="text-3xl font-black tracking-tighter">{pools.length}</p>
                    </div>
                </div>
            </div>

            {/* ─── Create Pool Modal ─────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-6 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl my-8 space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">New Investment Pool</h2>
                                <p className="text-slate-400 font-bold text-sm mt-1">Fill in the pool details. Investors will see this on the app.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Pool Name */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Pool Name *</label>
                            <input
                                type="text"
                                value={newPool.name}
                                onChange={e => setNewPool({ ...newPool, name: e.target.value })}
                                placeholder="e.g. Standard Maize Pool A"
                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                            />
                        </div>

                        {/* Category & Risk */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Category</label>
                                <select
                                    value={newPool.category}
                                    onChange={e => setNewPool({ ...newPool, category: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green appearance-none"
                                >
                                    <option value="crops">Crops</option>
                                    <option value="livestock">Livestock</option>
                                    <option value="aquaculture">Aquaculture</option>
                                    <option value="horticulture">Horticulture</option>
                                    <option value="dairy">Dairy</option>
                                    <option value="poultry">Poultry</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Risk Level</label>
                                <select
                                    value={newPool.risk}
                                    onChange={e => setNewPool({ ...newPool, risk: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green appearance-none"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Description *</label>
                            <textarea
                                value={newPool.description}
                                onChange={e => setNewPool({ ...newPool, description: e.target.value })}
                                rows={3}
                                placeholder="e.g. High-yield hybrid maize cycle with guaranteed buyer contracts."
                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green resize-none"
                            />
                        </div>

                        {/* Location & Duration */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Location</label>
                                <input
                                    type="text"
                                    value={newPool.location}
                                    onChange={e => setNewPool({ ...newPool, location: e.target.value })}
                                    placeholder="e.g. Nakuru, Kenya"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Duration</label>
                                <input
                                    type="text"
                                    value={newPool.duration}
                                    onChange={e => setNewPool({ ...newPool, duration: e.target.value })}
                                    placeholder="e.g. 4 Months"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                />
                            </div>
                        </div>

                        {/* Interest & ROI Settings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Interest Rate Type</label>
                                <select
                                    value={newPool.interestType}
                                    onChange={e => setNewPool({ ...newPool, interestType: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green appearance-none"
                                >
                                    <option value="percentage">Percentage Interest</option>
                                    <option value="roi">Fixed ROI %</option>
                                    <option value="revenue_share">Revenue Share %</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Rate Value (%)</label>
                                <input
                                    type="number"
                                    value={newPool.interestRate}
                                    onChange={e => setNewPool({ ...newPool, interestRate: parseFloat(e.target.value) })}
                                    placeholder="e.g. 15"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Target Amount (KES)</label>
                                <input
                                    type="number"
                                    value={newPool.targetAmount}
                                    onChange={e => setNewPool({ ...newPool, targetAmount: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Risk Score (0-100)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={newPool.riskScore}
                                    onChange={e => setNewPool({ ...newPool, riskScore: parseInt(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                />
                            </div>
                        </div>

                        {/* Impact Array */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Impact Points</label>
                                <button
                                    onClick={addImpactRow}
                                    className="flex items-center gap-1 text-fami-green font-black text-xs uppercase tracking-widest hover:text-fami-dark transition-colors"
                                >
                                    <Plus size={14} /> Add Point
                                </button>
                            </div>
                            {newPool.impact.map((item, i) => (
                                <div key={i} className="flex gap-3 items-center">
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={e => updateImpact(i, e.target.value)}
                                        placeholder="e.g. Produces 200 tons of food"
                                        className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                    />
                                    <button
                                        onClick={() => removeImpactRow(i)}
                                        className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-8 py-5 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreatePool}
                                disabled={saving}
                                className="flex-[2] px-8 py-5 bg-fami-dark text-fami-green rounded-2xl font-black text-sm uppercase italic tracking-tighter shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                            >
                                <Sprout size={18} />
                                {saving ? 'Publishing...' : 'Publish Pool'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
