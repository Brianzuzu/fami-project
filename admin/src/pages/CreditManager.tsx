import React, { useState, useEffect } from 'react';
import {
    collection, getDocs, doc, updateDoc, query,
    orderBy, Timestamp, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    Wallet, ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
    ArrowUpRight, Calendar, Search, TrendingUp, Clock, Building2,
    Phone, Leaf, ChevronDown, ChevronUp, Filter, UserCheck, Eye
} from 'lucide-react';

interface TrustReview {
    uid: string;
    displayName: string;
    email: string;
    trustScoreStatus: 'pending' | 'granted' | 'declined';
    pendingTrustScore: {
        overall: number; bank: number; mpesa: number; fami: number; level: string;
    };
    pendingUpdatedAt?: any;
}

interface Loan {
    id: string;
    uid: string;
    amount: number;
    lender: string;
    interest: string;
    term: string;
    type: string;
    status: string;
    repaidAmount?: number;
    balance?: number;
    requestedAt?: any;
    createdAt?: any;
    purpose?: string;
    userName?: string;
    userEmail?: string;
    trustScore?: number;
    trustLevel?: string;
}

const STATUS_COLORS: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-600 border-amber-100',
    Approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Partially Repaid': 'bg-blue-50 text-blue-600 border-blue-100',
    Repaid: 'bg-slate-50 text-slate-500 border-slate-100',
    Rejected: 'bg-red-50 text-red-500 border-red-100',
};

const LENDER_ICONS: Record<string, React.ElementType> = {
    bank: Building2, mpesa: Phone, fami: Leaf,
};

const scoreColor = (s: number) =>
    s > 750 ? 'text-emerald-600 bg-emerald-50' :
        s > 500 ? 'text-amber-600 bg-amber-50' :
            'text-red-500 bg-red-50';

export const CreditManager: React.FC = () => {
    const [tab, setTab] = useState<'reviews' | 'loans'>('reviews');

    // Trust score review state
    const [reviews, setReviews] = useState<TrustReview[]>([]);
    const [reviewLoading, setReviewLoading] = useState(true);
    const [processingUid, setProcessingUid] = useState<string | null>(null);

    // Loan requests state
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loansLoading, setLoansLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [processingLoan, setProcessingLoan] = useState<string | null>(null);

    useEffect(() => {
        fetchReviews();
        fetchLoans();
    }, []);

    // ── Fetch users with pending trust scores ──────────────────────────────────
    const fetchReviews = async () => {
        setReviewLoading(true);
        try {
            const snap = await getDocs(collection(db, 'users'));
            const pending: TrustReview[] = [];
            snap.forEach(d => {
                const u = d.data();
                if (u.trustScoreStatus === 'pending' && u.pendingTrustScore) {
                    pending.push({
                        uid: d.id,
                        displayName: u.displayName || u.username || 'Unknown Farmer',
                        email: u.email || '',
                        trustScoreStatus: u.trustScoreStatus,
                        pendingTrustScore: u.pendingTrustScore,
                        pendingUpdatedAt: u.pendingUpdatedAt,
                    });
                }
            });
            setReviews(pending);
        } catch (err) {
            console.error('Error fetching reviews:', err);
        } finally {
            setReviewLoading(false);
        }
    };

    // Grant trust score → writes granted score to user doc and unlocks loan offers in app
    const handleGrant = async (review: TrustReview) => {
        setProcessingUid(review.uid);
        try {
            await updateDoc(doc(db, 'users', review.uid), {
                trustScoreStatus: 'granted',
                trustScore: review.pendingTrustScore,       // exact score the app will display
                trustLevel: review.pendingTrustScore.level,
                grantedAt: Timestamp.now(),
            });
            setReviews(prev => prev.filter(r => r.uid !== review.uid));
        } catch (err) {
            console.error('Grant failed:', err);
            alert('Failed to grant. Check Firestore permissions.');
        } finally {
            setProcessingUid(null);
        }
    };

    // Decline → mark as declined so user sees a different message in the app
    const handleDecline = async (review: TrustReview) => {
        setProcessingUid(review.uid);
        try {
            await updateDoc(doc(db, 'users', review.uid), {
                trustScoreStatus: 'declined',
                declinedAt: Timestamp.now(),
            });
            setReviews(prev => prev.filter(r => r.uid !== review.uid));
        } catch (err) {
            console.error('Decline failed:', err);
            alert('Failed to decline. Try again.');
        } finally {
            setProcessingUid(null);
        }
    };

    // ── Fetch loans ───────────────────────────────────────────────────────────
    const fetchLoans = async () => {
        setLoansLoading(true);
        try {
            let snapshot;
            try {
                const q = query(collection(db, 'loans'), orderBy('requestedAt', 'desc'));
                snapshot = await getDocs(q);
            } catch {
                snapshot = await getDocs(collection(db, 'loans'));
            }

            const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Loan[];

            const enriched = await Promise.all(raw.map(async loan => {
                if (!loan.userName && loan.uid) {
                    try {
                        const uSnap = await getDoc(doc(db, 'users', loan.uid));
                        if (uSnap.exists()) {
                            const u = uSnap.data();
                            return {
                                ...loan,
                                userName: u.displayName || u.username || 'Unknown Farmer',
                                userEmail: u.email || '',
                                trustScore: u.trustScore?.overall || loan.trustScore || 300,
                                trustLevel: u.trustLevel || loan.trustLevel || 'Bronze Mkulima',
                            };
                        }
                    } catch { /* not found */ }
                }
                return loan;
            }));

            setLoans(enriched);
        } catch (err) {
            console.error('Error fetching loans:', err);
        } finally {
            setLoansLoading(false);
        }
    };

    const updateLoanStatus = async (id: string, status: string, extra?: object) => {
        setProcessingLoan(id);
        try {
            await updateDoc(doc(db, 'loans', id), { status, updatedAt: Timestamp.now(), ...extra });
            setLoans(prev => prev.map(l => l.id === id ? { ...l, status, ...extra } : l));
        } catch { alert('Update failed.'); }
        finally { setProcessingLoan(null); }
    };

    const handleApproveLoan = (loan: Loan) => updateLoanStatus(loan.id, 'Approved', { approvedAt: Timestamp.now() });
    const handleRejectLoan = (loan: Loan) => updateLoanStatus(loan.id, 'Rejected', { rejectedAt: Timestamp.now() });
    const handleRepayment = async (loan: Loan) => {
        const input = prompt(`Record repayment for ${loan.userName || 'borrower'} (KES):`, '5000');
        if (!input || isNaN(parseFloat(input))) return;
        const amt = parseFloat(input);
        const total = (loan.repaidAmount || 0) + amt;
        const newStatus = total >= (loan.amount || 0) ? 'Repaid' : 'Partially Repaid';
        await updateLoanStatus(loan.id, newStatus, { repaidAmount: total });
    };

    const filteredLoans = loans.filter(l => {
        const name = (l.userName || '').toLowerCase();
        const lender = (l.lender || '').toLowerCase();
        const matchSearch = name.includes(searchTerm.toLowerCase()) || lender.includes(searchTerm.toLowerCase()) || l.id.includes(searchTerm);
        const matchStatus = filterStatus === 'all' || l.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const loanStats = {
        pending: loans.filter(l => l.status === 'Pending').length,
        active: loans.filter(l => l.status === 'Approved' || l.status === 'Partially Repaid').length,
        repaid: loans.filter(l => l.status === 'Repaid').length,
        totalOut: loans.filter(l => l.status === 'Approved').reduce((s, l) => s + (l.amount || 0), 0),
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Credit & Loans</h1>
                    <p className="text-slate-500 font-bold mt-1">Grant trust scores, review applications and track repayments</p>
                </div>
                <div className="flex items-center gap-3 bg-fami-dark text-white p-5 rounded-3xl shadow-xl">
                    <div className="p-3 bg-fami-green text-fami-dark rounded-xl">
                        <ShieldCheck size={22} strokeWidth={3} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Score Reviews</p>
                        <p className="text-2xl font-black tracking-tighter">{reviews.length} Users</p>
                    </div>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit">
                {(['reviews', 'loans'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${tab === t ? 'bg-fami-dark text-fami-green shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {t === 'reviews' ? <><UserCheck size={14} /> Trust Score Reviews {reviews.length > 0 && <span className="ml-1 bg-amber-400 text-white rounded-full px-2 py-0.5 text-[9px]">{reviews.length}</span>}</> : <><Wallet size={14} /> Loan Requests</>}
                    </button>
                ))}
            </div>

            {/* ══════════ TAB: Trust Score Reviews ══════════ */}
            {tab === 'reviews' && (
                <div className="space-y-6">
                    {reviewLoading ? (
                        <div className="space-y-4 animate-pulse">
                            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-[2.5rem]" />)}
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="py-28 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                            <CheckCircle2 size={52} className="mx-auto text-emerald-200 mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No pending trust score reviews.</p>
                            <p className="text-slate-300 text-xs mt-2">When farmers submit their profile, they'll appear here.</p>
                        </div>
                    ) : reviews.map(review => {
                        const s = review.pendingTrustScore;
                        const submittedAt = review.pendingUpdatedAt?.toDate?.();
                        return (
                            <div key={review.uid} className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                                <div className="p-8 flex flex-col md:flex-row md:items-center gap-6">
                                    {/* User info */}
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="h-14 w-14 rounded-2xl bg-fami-dark text-fami-green font-black text-xl italic flex items-center justify-center flex-shrink-0">
                                            {review.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 italic uppercase tracking-tight">{review.displayName}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{review.email}</p>
                                            {submittedAt && (
                                                <p className="text-[10px] text-slate-300 font-bold mt-0.5">
                                                    Submitted {submittedAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Score breakdown */}
                                    <div className="flex items-center gap-6 flex-shrink-0">
                                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${scoreColor(s.overall)}`}>
                                            <ShieldCheck size={18} strokeWidth={3} />
                                            <div>
                                                <p className="text-lg font-black italic leading-none">{s.overall}</p>
                                                <p className="text-[9px] font-black uppercase opacity-70">{s.level}</p>
                                            </div>
                                        </div>
                                        <div className="hidden lg:grid grid-cols-3 gap-3">
                                            {[
                                                { label: 'Bank', val: s.bank, icon: Building2 },
                                                { label: 'M-Pesa', val: s.mpesa, icon: Phone },
                                                { label: 'Fami', val: s.fami, icon: Leaf },
                                            ].map(({ label, val, icon: Icon }) => (
                                                <div key={label} className="text-center px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <Icon size={14} className="mx-auto text-slate-400 mb-1" />
                                                    <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
                                                    <p className="text-sm font-black text-slate-900 italic">{val}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Loan products this score unlocks */}
                                    <div className="flex-shrink-0 hidden xl:block">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Unlocks</p>
                                        <div className="space-y-1">
                                            {['Fami CredLink (≥300)', 'M-Pesa Business (≥400)', 'KCB Bank (≥600)'].map(offer => {
                                                const minScore = offer.includes('300') ? 300 : offer.includes('400') ? 400 : 600;
                                                const eligible = s.overall >= minScore;
                                                return (
                                                    <div key={offer} className={`flex items-center gap-2 text-[10px] font-bold ${eligible ? 'text-emerald-600' : 'text-slate-300 line-through'}`}>
                                                        {eligible ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                                        {offer.split(' (')[0]}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <button
                                            onClick={() => handleGrant(review)}
                                            disabled={processingUid === review.uid}
                                            className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase italic tracking-tighter hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                        >
                                            <CheckCircle2 size={16} strokeWidth={3} />
                                            Grant Access
                                        </button>
                                        <button
                                            onClick={() => handleDecline(review)}
                                            disabled={processingUid === review.uid}
                                            className="flex items-center gap-2 px-6 py-3.5 bg-red-50 text-red-500 border border-red-200 rounded-2xl font-black text-xs uppercase italic tracking-tighter hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                        >
                                            <XCircle size={16} strokeWidth={3} />
                                            Decline
                                        </button>
                                    </div>
                                </div>

                                {/* Score bar */}
                                <div className="px-8 pb-6">
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                                        <span>Score: {s.overall} / 1000</span>
                                        <span>{Math.round((s.overall / 1000) * 100)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${s.overall > 750 ? 'bg-emerald-500' : s.overall > 500 ? 'bg-amber-400' : 'bg-red-400'}`}
                                            style={{ width: `${Math.min((s.overall / 1000) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════ TAB: Loan Requests ══════════ */}
            {tab === 'loans' && (
                <div className="space-y-8">
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Pending', val: loanStats.pending, icon: Clock, color: 'text-amber-500 bg-amber-50' },
                            { label: 'Active Loans', val: loanStats.active, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
                            { label: 'Total Approved', val: `KES ${loanStats.totalOut.toLocaleString()}`, icon: ArrowUpRight, color: 'text-blue-600 bg-blue-50' },
                            { label: 'Rejected', val: loans.filter(l => l.status === 'Rejected').length, icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
                        ].map((s, i) => (
                            <div key={i} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                    <h3 className="text-xl font-black text-slate-900 italic tracking-tighter">{s.val}</h3>
                                </div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.color}`}>
                                    <s.icon size={24} strokeWidth={2.5} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, lender or ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green font-bold text-slate-700"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                            <Filter size={14} className="text-slate-300 ml-3" />
                            {['all', 'Pending', 'Approved', 'Partially Repaid', 'Repaid', 'Rejected'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === s ? 'bg-fami-dark text-fami-green' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {s === 'all' ? 'All' : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Loan list */}
                    {loansLoading ? (
                        <div className="space-y-4 animate-pulse">
                            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-[2.5rem]" />)}
                        </div>
                    ) : filteredLoans.length === 0 ? (
                        <div className="py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                            <Wallet size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No loan requests match your filters.</p>
                        </div>
                    ) : filteredLoans.map(loan => {
                        const LenderIcon = LENDER_ICONS[loan.type] || Building2;
                        const isExpanded = expandedId === loan.id;
                        const repaidPct = loan.amount ? Math.round(((loan.repaidAmount || 0) / loan.amount) * 100) : 0;
                        const score = loan.trustScore || 300;
                        const requestDate = loan.requestedAt?.toDate?.() || loan.createdAt?.toDate?.();

                        return (
                            <div key={loan.id} className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-md transition-all">
                                <div className="flex flex-col md:flex-row md:items-center gap-6 p-8">
                                    {/* Borrower */}
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="h-14 w-14 rounded-2xl bg-fami-dark flex items-center justify-center text-fami-green font-black text-xl italic flex-shrink-0">
                                            {(loan.userName || 'F').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-slate-900 italic uppercase tracking-tight truncate">{loan.userName || 'Unknown Farmer'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold truncate">{loan.userEmail || `UID: ${loan.uid?.slice(0, 12)}...`}</p>
                                        </div>
                                    </div>

                                    {/* Lender + Amount */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="p-3 bg-slate-50 rounded-xl text-slate-400"><LenderIcon size={18} /></div>
                                        <div>
                                            <p className="font-black text-slate-900 tracking-tighter italic">KES {(loan.amount || 0).toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{loan.lender} · {loan.interest} · {loan.term}</p>
                                        </div>
                                    </div>

                                    {/* Score badge */}
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl flex-shrink-0 ${scoreColor(score)}`}>
                                        <ShieldCheck size={16} strokeWidth={3} />
                                        <div>
                                            <p className="text-sm font-black italic">{score}</p>
                                            <p className="text-[9px] font-black uppercase tracking-wide opacity-70">{loan.trustLevel || 'Bronze'}</p>
                                        </div>
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center gap-2 text-slate-400 flex-shrink-0">
                                        <Calendar size={14} className="text-fami-green" />
                                        <span className="text-xs font-black italic uppercase">
                                            {requestDate ? requestDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: '2-digit' }) : 'N/A'}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border flex-shrink-0 ${STATUS_COLORS[loan.status] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        {loan.status}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {loan.status === 'Pending' && (
                                            <>
                                                <button onClick={() => handleApproveLoan(loan)} disabled={processingLoan === loan.id}
                                                    className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase italic hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20">
                                                    <CheckCircle2 size={16} strokeWidth={3} /> Grant
                                                </button>
                                                <button onClick={() => handleRejectLoan(loan)} disabled={processingLoan === loan.id}
                                                    className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-500 border border-red-200 rounded-xl font-black text-xs uppercase italic hover:bg-red-500 hover:text-white transition-all disabled:opacity-50">
                                                    <XCircle size={16} strokeWidth={3} /> Deny
                                                </button>
                                            </>
                                        )}
                                        {(loan.status === 'Approved' || loan.status === 'Partially Repaid') && (
                                            <button onClick={() => handleRepayment(loan)} disabled={processingLoan === loan.id}
                                                className="flex items-center gap-2 px-5 py-3 bg-fami-dark text-fami-green rounded-xl font-black text-xs uppercase italic hover:scale-105 transition-all disabled:opacity-50 shadow-lg">
                                                <TrendingUp size={16} strokeWidth={3} /> Record Payment
                                            </button>
                                        )}
                                        {(loan.status === 'Repaid' || loan.status === 'Rejected') && (
                                            <span className="px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase border border-slate-100">
                                                {loan.status === 'Repaid' ? 'Closed' : 'Declined'}
                                            </span>
                                        )}
                                        <button onClick={() => setExpandedId(isExpanded ? null : loan.id)}
                                            className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded row */}
                                {isExpanded && (
                                    <div className="border-t border-slate-50 bg-slate-50/50 px-10 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Repayment Progress</p>
                                            <div className="flex justify-between text-xs font-black text-slate-600 mb-2">
                                                <span>KES {(loan.repaidAmount || 0).toLocaleString()} Repaid</span>
                                                <span>{repaidPct}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-fami-green rounded-full" style={{ width: `${Math.min(repaidPct, 100)}%` }} />
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold mt-2">Remaining: KES {Math.max(0, (loan.amount || 0) - (loan.repaidAmount || 0)).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Trust Score (at request)</p>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 rounded-2xl ${scoreColor(score)}`}><ShieldCheck size={20} strokeWidth={3} /></div>
                                                <div>
                                                    <p className="text-2xl font-black italic tracking-tighter text-slate-900">{score}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">{loan.trustLevel}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Loan Details</p>
                                            <div className="space-y-2">
                                                {[
                                                    { k: 'Lender', v: loan.lender },
                                                    { k: 'Interest', v: loan.interest },
                                                    { k: 'Term', v: loan.term },
                                                    { k: 'Purpose', v: loan.purpose || 'Agricultural Loan' },
                                                    { k: 'Loan ID', v: `#${loan.id.slice(0, 14)}` },
                                                ].map(({ k, v }) => (
                                                    <div key={k} className="flex justify-between text-xs">
                                                        <span className="font-bold text-slate-400 uppercase tracking-wider">{k}</span>
                                                        <span className="font-black text-slate-700 italic truncate max-w-[140px]">{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
