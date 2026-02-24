import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    Timestamp,
    runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Transaction } from '../types';
import {
    Search,
    ArrowUpCircle,
    ArrowDownCircle,
    TrendingUp,
    ExternalLink,
    Zap,
    DollarSign,
    RefreshCw,
    Clock,
    CheckCircle2,
    Shield,
    XCircle
} from 'lucide-react';

export const FinancialsPage: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
    const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
    const [activeInvestments, setActiveInvestments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'history' | 'withdrawals' | 'verification' | 'payouts' | 'config'>('history');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [processing, setProcessing] = useState<string | null>(null);
    const [settings, setSettings] = useState<any>({
        investorDefaultInterest: 0.12,
        famiLoanProfitMargin: 0.05,
        famiInvestmentFee: 0.02,
        famiServiceMarkup: 0.1
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Transactions
            const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            const txList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];
            setTransactions(txList);

            // Fetch Pending Withdrawals
            const pendingWQ = query(
                collection(db, 'transactions'),
                where('type', '==', 'Withdrawal'),
                where('status', '==', 'pending')
            );
            const pendingWSnapshot = await getDocs(pendingWQ);
            setWithdrawalRequests(pendingWSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Fetch Pending External Deposits (Verification Queue)
            const pendingDQ = query(
                collection(db, 'transactions'),
                where('type', '==', 'Deposit'),
                where('status', '==', 'pending')
            );
            const pendingDSnapshot = await getDocs(pendingDQ);
            setVerificationRequests(pendingDSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Fetch Active Investments for Payout Planning
            const invQ = query(collection(db, 'investments'), where('status', '==', 'active'));
            const invSnapshot = await getDocs(invQ);
            setActiveInvestments(invSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Fetch System Settings
            try {
                const { callBackend } = await import('../lib/api');
                const settingsData = await callBackend('getSystemSettings', {});
                if (settingsData) setSettings(settingsData);
            } catch (e) { console.error('Error fetching settings:', e); }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveWithdrawal = async (requestId: string) => {
        setProcessing(requestId);
        try {
            const { callBackend } = await import('../lib/api');
            await callBackend('approveWithdrawal', {
                transactionId: requestId,
                action: 'approve'
            });

            setWithdrawalRequests(prev => prev.filter(r => r.id !== requestId));
            setTransactions(prev => prev.map(tx => tx.id === requestId ? { ...tx, status: 'completed' } : tx));
            alert('Withdrawal approved and disbursed successfully.');
        } catch (error: any) {
            console.error('Error approving withdrawal:', error);
            alert(error.message || 'Failed to approve withdrawal.');
        } finally {
            setProcessing(null);
        }
    };

    const handleApproveDeposit = async (requestId: string, uid: string) => {
        setProcessing(requestId);
        try {
            await runTransaction(db, async (transaction) => {
                const txRef = doc(db, 'transactions', requestId);
                const txSnap = await transaction.get(txRef);
                const txData = txSnap.data();

                // 1. Mark Deposit as completed
                transaction.update(txRef, {
                    status: 'completed',
                    processedAt: Timestamp.now()
                });

                // 2. Find and Activate the associated Investment
                // Since processInvestment creates a Withdrawal tx for the investment, 
                // we search for that based on the paymentReference if available
                const invId = txData?.metadata?.investmentId;
                if (invId) {
                    const invRef = doc(db, 'investments', invId);
                    transaction.update(invRef, { status: 'active' });
                }

                // Also find the 'Withdrawal' (Investment) txn linked to this
                const q = query(
                    collection(db, 'transactions'),
                    where('uid', '==', uid),
                    where('type', '==', 'Withdrawal'),
                    where('status', '==', 'pending')
                );
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(d => {
                    if (d.data().metadata?.paymentReference === txData?.reference) {
                        transaction.update(doc(db, 'transactions', d.id), { status: 'completed' });
                    }
                });

                const auditRef = doc(collection(db, 'admin_actions'));
                transaction.set(auditRef, {
                    action: 'APPROVE_DEPOSIT',
                    targetId: requestId,
                    targetUser: uid,
                    amount: txData?.amount,
                    timestamp: Timestamp.now(),
                    admin: 'Admin Console'
                });
            });

            setVerificationRequests(prev => prev.filter(r => r.id !== requestId));
            setTransactions(prev => prev.map(tx => tx.id === requestId ? { ...tx, status: 'completed' } : tx));
            alert('Deposit verified and investment activated.');
        } catch (error) {
            console.error('Error approving deposit:', error);
            alert('Failed to approve deposit.');
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectWithdrawal = async (requestId: string) => {
        setProcessing(requestId);
        try {
            const { callBackend } = await import('../lib/api');
            await callBackend('approveWithdrawal', {
                transactionId: requestId,
                action: 'reject'
            });

            setWithdrawalRequests(prev => prev.filter(r => r.id !== requestId));
            setTransactions(prev => prev.map(tx => tx.id === requestId ? { ...tx, status: 'rejected' } : tx));
            alert('Withdrawal request rejected and balance reverted if applicable.');
        } catch (error: any) {
            console.error('Error rejecting withdrawal:', error);
            alert(error.message || 'Failed to reject withdrawal.');
        } finally {
            setProcessing(null);
        }
    };

    const handleUpdateSettings = async () => {
        setProcessing('settings');
        try {
            const { callBackend } = await import('../lib/api');
            await callBackend('updateSystemSettings', settings);
            alert('System settings updated successfully.');
        } catch (error) {
            console.error('Error updating settings:', error);
            alert('Failed to update settings.');
        } finally {
            setProcessing(null);
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch =
            (tx.uid || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.reference || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || tx.type.toLowerCase() === filterType.toLowerCase();

        return matchesSearch && matchesType;
    });

    const stats = {
        totalVolume: transactions.reduce((acc, tx) => acc + (tx.amount || 0), 0),
        deposits: transactions
            .filter(tx => tx.type.toLowerCase() === 'deposit')
            .reduce((acc, tx) => acc + (tx.amount || 0), 0),
        payouts: transactions
            .filter(tx => ['payout', 'withdrawal'].includes(tx.type.toLowerCase()) && tx.status === 'completed')
            .reduce((acc, tx) => acc + (tx.amount || 0), 0),
        projectedPayouts: activeInvestments.reduce((acc, inv) => acc + (inv.expectedReturn || 0), 0)
    };

    if (loading) {
        return (
            <div className="space-y-10 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-slate-200/50 rounded-[2.5rem] border border-slate-100"></div>
                    ))}
                </div>
                <div className="h-96 bg-slate-200/50 rounded-[3rem] border border-slate-100"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Financial Ledger</h1>
                    <p className="text-slate-500 font-bold mt-1">Audit platform capital movements and process disbursements</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-fami-green hover:border-fami-green transition-all shadow-sm"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <div className="h-12 w-[1px] bg-slate-200 mx-2"></div>
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-lg shadow-black/5' : 'text-slate-400'}`}
                        >
                            History
                        </button>
                        <button
                            onClick={() => setActiveTab('withdrawals')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'withdrawals' ? 'bg-white text-slate-900 shadow-lg shadow-black/5' : 'text-slate-400'}`}
                        >
                            Withdrawals
                            {withdrawalRequests.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white">{withdrawalRequests.length}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('verification')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'verification' ? 'bg-white text-slate-900 shadow-lg shadow-black/5' : 'text-slate-400'}`}
                        >
                            Verification
                            {verificationRequests.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-fami-green text-fami-dark text-[8px] flex items-center justify-center rounded-full border-2 border-white font-black">{verificationRequests.length}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('payouts')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'payouts' ? 'bg-white text-slate-900 shadow-lg shadow-black/5' : 'text-slate-400'}`}
                        >
                            Payouts
                        </button>
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-white text-slate-900 shadow-lg shadow-black/5' : 'text-slate-400'}`}
                        >
                            Config
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'history' && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        <StatCard
                            label="Total Throughput"
                            value={`KES ${stats.totalVolume.toLocaleString()}`}
                            sub="Platform volume"
                            icon={TrendingUp}
                            color="from-fami-dark to-slate-800"
                        />
                        <StatCard
                            label="Capital Inflow"
                            value={`KES ${stats.deposits.toLocaleString()}`}
                            sub="Gross deposits"
                            icon={ArrowDownCircle}
                            color="from-emerald-500 to-teal-600"
                        />
                        <StatCard
                            label="Disbursements"
                            value={`KES ${stats.payouts.toLocaleString()}`}
                            sub="Completed payouts"
                            icon={ArrowUpCircle}
                            color="from-blue-500 to-indigo-600"
                        />
                        <StatCard
                            label="Locked Yields"
                            value={`KES ${stats.projectedPayouts.toLocaleString()}`}
                            sub="Projected liabilities"
                            icon={Shield}
                            color="from-purple-500 to-pink-600"
                        />
                    </div>

                    {/* Controls & Table */}
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit">
                                {['all', 'deposit', 'withdrawal', 'investment', 'payout'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFilterType(t)}
                                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${filterType === t ? 'bg-fami-dark text-fami-green shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {t === 'all' ? 'All' : `${t}s`}
                                    </button>
                                ))}
                            </div>

                            <div className="relative group self-end">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-fami-green transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Find ID or Reference..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green focus:shadow-lg focus:shadow-fami-green/10 transition-all w-full sm:w-64 font-medium text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200/60 overflow-hidden relative">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Transaction Detail</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Originator</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Amount</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic">Date</th>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/30 transition-all duration-300 group">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-5">
                                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 border-4 border-white ${['deposit', 'payout'].includes(tx.type.toLowerCase()) ? 'bg-emerald-50 text-emerald-600' :
                                                        ['withdrawal'].includes(tx.type.toLowerCase()) ? 'bg-rose-50 text-rose-600' :
                                                            'bg-fami-dark text-fami-green'
                                                        }`}>
                                                        {tx.type.toLowerCase() === 'deposit' ? <ArrowDownCircle size={18} /> :
                                                            ['withdrawal', 'payout'].includes(tx.type.toLowerCase()) ? <ArrowUpCircle size={18} /> :
                                                                <DollarSign size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 uppercase italic tracking-tight text-xs">{tx.type}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{tx.method || 'System'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <p className="font-black text-slate-700 text-[10px] italic uppercase tracking-tight">{tx.userName || 'User'}</p>
                                                    <span className="text-[8px] font-mono text-slate-400 mt-1">...{tx.uid?.slice(-6).toUpperCase()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`text-sm font-black tracking-tighter italic ${tx.type.toLowerCase() === 'deposit' ? 'text-emerald-600' : 'text-slate-900'
                                                    }`}>
                                                    KES {tx.amount?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-black text-slate-400 uppercase italic">
                                                    {tx.date?.seconds ? new Date(tx.date.seconds * 1000).toLocaleDateString() : 'Recent'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase italic ${tx.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                    tx.status?.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    {tx.status || 'Success'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'withdrawals' && (
                <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200/60 overflow-hidden min-h-[500px]">
                    <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Withdrawal Queue</h2>
                            <p className="text-slate-400 font-bold text-sm">Action required on capital exit requests</p>
                        </div>
                        <div className="bg-rose-50 px-6 py-3 rounded-2xl border border-rose-100 flex items-center gap-3 font-black text-rose-600 text-xs uppercase italic">
                            {withdrawalRequests.length} Pending
                        </div>
                    </div>

                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {withdrawalRequests.length === 0 ? (
                            <div className="col-span-2 py-32 text-center">
                                <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Queue Synchronized</p>
                            </div>
                        ) : (
                            withdrawalRequests.map(req => (
                                <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 group hover:border-fami-green transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-500">
                                                <ArrowUpCircle size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase italic">{req.userName || 'Member'}</p>
                                                <p className="text-[10px] font-mono text-slate-400">ID: {req.uid?.slice(-8)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-slate-900 tracking-tighter italic">KES {parseFloat(req.amount).toLocaleString()}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase italic mt-1">via {req.paymentMethod || req.method}</p>
                                        </div>
                                    </div>

                                    {req.metadata?.poolName && (
                                        <div className="mb-4 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">Pool Payout:</span>
                                            <span className="text-xs font-bold text-emerald-700">{req.metadata.poolName}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleApproveWithdrawal(req.id)}
                                            disabled={processing === req.id}
                                            className="flex-1 bg-fami-dark text-fami-green py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                                        >
                                            {processing === req.id ? <RefreshCw className="animate-spin" size={16} /> : 'Approve Release'}
                                        </button>
                                        <button
                                            onClick={() => handleRejectWithdrawal(req.id)}
                                            disabled={processing === req.id}
                                            className="px-4 aspect-square bg-white border border-slate-200 rounded-2xl text-slate-300 hover:text-rose-500 transition-colors"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'verification' && (
                <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200/60 overflow-hidden min-h-[500px]">
                    <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Inbound Verification</h2>
                            <p className="text-slate-400 font-bold text-sm">Cross-verify manual payments (M-Pesa / Bank)</p>
                        </div>
                        <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-3 font-black text-emerald-600 text-xs uppercase italic">
                            {verificationRequests.length} Pending
                        </div>
                    </div>

                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {verificationRequests.length === 0 ? (
                            <div className="col-span-2 py-32 text-center">
                                <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">All Funds Verified</p>
                            </div>
                        ) : (
                            verificationRequests.map(req => (
                                <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 group hover:border-fami-green transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-500 shadow-inner">
                                                <ArrowDownCircle size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase italic">{req.userName || 'Member'}</p>
                                                <p className="text-[10px] font-bold text-slate-400">Method: {req.method}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-slate-900 tracking-tighter italic">KES {parseFloat(req.amount).toLocaleString()}</p>
                                            <div className="flex items-center gap-2 justify-end mt-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase italic">Ref:</span>
                                                <span className="text-xs font-mono font-black text-fami-dark bg-white px-2 py-0.5 rounded border border-slate-200">{req.reference || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleApproveDeposit(req.id, req.uid)}
                                            disabled={processing === req.id}
                                            className="flex-1 bg-fami-dark text-fami-green py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3 border border-fami-green/20"
                                        >
                                            {processing === req.id ? <RefreshCw className="animate-spin" size={16} /> : 'Verify & Credit'}
                                        </button>
                                        <button
                                            className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-500 transition-colors font-black text-[10px] uppercase italic"
                                        >
                                            Decline
                                        </button>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-slate-200/50">
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase italic">
                                            <Shield size={10} className="text-fami-green" />
                                            <span>Target: {req.description || 'Investment Funding'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'payouts' && (
                <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200/60 overflow-hidden min-h-[500px]">
                    <div className="p-10 border-b border-slate-100">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Yield Obligations</h2>
                        <p className="text-slate-400 font-bold text-sm">Projected payouts according to set investment pools</p>
                    </div>

                    <div className="p-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {activeInvestments.length === 0 ? (
                                <div className="col-span-full py-32 text-center text-slate-400 font-black uppercase italic text-xs tracking-widest">
                                    No active investments found.
                                </div>
                            ) : (
                                activeInvestments.map(inv => (
                                    <div key={inv.id} className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                                                <TrendingUp size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase italic leading-none">{inv.poolName}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Contract: {inv.contractType}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="flex justify-between border-b border-slate-200/50 pb-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase italic">Principal</span>
                                                <span className="text-xs font-black italic text-slate-600">KES {inv.amount?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-200/50 pb-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase italic">ROI (%)</span>
                                                <span className="text-xs font-black italic text-emerald-600">{inv.roi}</span>
                                            </div>
                                            <div className="flex justify-between pt-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase italic">Expected Payout</span>
                                                <span className="text-lg font-black italic text-fami-dark tracking-tighter">KES {inv.expectedReturn?.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200">
                                            <Clock size={12} className="text-fami-green" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Exp: {inv.maturityDate?.seconds ? new Date(inv.maturityDate.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200/60 overflow-hidden min-h-[500px]">
                    <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">System Configuration</h2>
                            <p className="text-slate-400 font-bold text-sm">Fine-tune global profit margins and ecosystem rates</p>
                        </div>
                        <div className="bg-slate-900 text-fami-green px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase italic tracking-widest">
                            <Shield size={16} /> Governance Mode
                        </div>
                    </div>

                    <div className="p-10 space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-widest border-l-4 border-fami-green pl-4">Investor Settings</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase italic">Default Investor Interest (Decimal)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings.investorDefaultInterest}
                                            onChange={e => setSettings({ ...settings, investorDefaultInterest: parseFloat(e.target.value) })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700"
                                        />
                                        <p className="text-[8px] text-slate-400 mt-1 italic font-bold">e.g. 0.12 for 12% APR</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-widest border-l-4 border-emerald-500 pl-4">Fami Revenue Margins</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase italic">Loan Profit Margin (Decimal)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings.famiLoanProfitMargin}
                                            onChange={e => setSettings({ ...settings, famiLoanProfitMargin: parseFloat(e.target.value) })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase italic">Investment Processing fee (Decimal)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings.famiInvestmentFee}
                                            onChange={e => setSettings({ ...settings, famiInvestmentFee: parseFloat(e.target.value) })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase italic">Input Shop Service Markup (Decimal)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings.famiServiceMarkup}
                                            onChange={e => setSettings({ ...settings, famiServiceMarkup: parseFloat(e.target.value) })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleUpdateSettings}
                                disabled={processing === 'settings'}
                                className="bg-fami-dark text-fami-green px-12 py-5 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-4"
                            >
                                {processing === 'settings' ? <RefreshCw className="animate-spin" size={18} /> : (
                                    <>
                                        <Zap size={18} strokeWidth={3} /> Commit System Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reconciliation Banner */}
            <div className="bg-gradient-to-br from-fami-dark to-slate-900 rounded-[3.5rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-16 h-16 bg-fami-green text-fami-dark rounded-2xl flex items-center justify-center shadow-lg shadow-fami-green/20">
                        <Zap size={32} strokeWidth={3} />
                    </div>
                    <div>
                        <h4 className="text-3xl font-black italic uppercase tracking-tighter">Financial Integrity Unit</h4>
                        <p className="text-slate-400 font-bold max-w-lg mt-2 font-medium">Monitoring KES {stats.totalVolume.toLocaleString()} across 4 gateways. Projected yields are currently KES {stats.projectedPayouts.toLocaleString()}.</p>
                    </div>
                </div>
                <button className="relative z-10 bg-white text-fami-dark px-10 py-5 rounded-2xl font-black text-xs hover:bg-fami-green hover:scale-105 transition-all shadow-2xl flex items-center gap-3 uppercase italic tracking-tighter">
                    Download Ledger <ExternalLink size={16} />
                </button>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string, value: string, sub: string, icon: any, color: string }> = ({ label, value, sub, icon: Icon, color }) => (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-2xl transition-all group overflow-hidden relative">
        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${color} opacity-[0.05] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${color} text-white shadow-xl mb-6 w-fit`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">{label}</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic whitespace-nowrap overflow-hidden text-ellipsis">{value}</h3>
            <p className="mt-3 text-[9px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 inline-flex px-3 py-1.5 rounded-lg border border-slate-100">{sub}</p>
        </div>
    </div>
);
