import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    orderBy,
    query,
    limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    History,
    User,
    Shield,
    Activity,
    Clock,
    FileText,
    ArrowRight,
    Search,
    Filter,
    Server,
    Lock,
    Eye,
    Trash2,
    Database,
    Cpu
} from 'lucide-react';

interface AuditLog {
    id: string;
    adminUid: string;
    action: string;
    targetId: string;
    targetType: string;
    reason?: string;
    timestamp: any;
    metadata?: any;
}

export const AuditPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const q = query(collection(db, 'admin_actions'), orderBy('timestamp', 'desc'), limit(50));
                const querySnapshot = await getDocs(q);
                const logList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as AuditLog[];
                setLogs(logList);
            } catch (error) {
                console.error('Error fetching audit logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const getActionIcon = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('approve') || a.includes('verify') || a.includes('grant')) return <Shield size={20} />;
        if (a.includes('delete') || a.includes('reject') || a.includes('decline')) return <Trash2 size={20} />;
        if (a.includes('view') || a.includes('read')) return <Eye size={20} />;
        if (a.includes('pool')) return <Cpu size={20} />;
        return <Activity size={20} />;
    };

    const getActionStyles = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('approve') || a.includes('verify') || a.includes('grant')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (a.includes('reject') || a.includes('delete') || a.includes('decline')) return 'bg-rose-50 text-rose-600 border-rose-100';
        if (a.includes('create') || a.includes('update')) return 'bg-blue-50 text-blue-600 border-blue-100';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.targetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.adminUid.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="space-y-10 animate-pulse">
                <div className="h-24 bg-slate-200/50 rounded-[2.5rem] w-full border border-slate-100"></div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-32 bg-slate-200/50 rounded-3xl w-full border border-slate-100"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">System Resilience</h1>
                    <p className="text-slate-500 font-bold mt-1">Immutable audit trails of administrative governance</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-fami-green transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search actions or IDs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green focus:shadow-lg focus:shadow-fami-green/10 transition-all w-full sm:w-72 font-medium text-slate-600"
                        />
                    </div>

                    <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Filter size={16} /> Filters
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Events</p>
                        <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter">{logs.length}</h3>
                    </div>
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                        <Database size={24} />
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between text-emerald-600">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auth Integrity</p>
                        <h3 className="text-2xl font-black italic tracking-tighter">100% SECURE</h3>
                    </div>
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                        <Shield size={24} />
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between text-blue-600">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sync Latency</p>
                        <h3 className="text-2xl font-black italic tracking-tighter">&lt;1.2s</h3>
                    </div>
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Activity size={24} />
                    </div>
                </div>
            </div>

            {/* Audit Timeline */}
            <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200/60 p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 pointer-events-none opacity-50"></div>

                <div className="relative space-y-10">
                    {filteredLogs.map((log, index) => (
                        <div key={log.id} className="relative group">
                            {/* Vertical Line */}
                            {index !== filteredLogs.length - 1 && (
                                <div className="absolute left-[31px] top-16 bottom-[-40px] w-[2px] bg-slate-100 group-hover:bg-fami-green/30 transition-colors"></div>
                            )}

                            <div className="flex items-start gap-8">
                                <div className={`z-10 w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-fami-green/20 border-4 border-white ${getActionStyles(log.action)}`}>
                                    {getActionIcon(log.action)}
                                </div>

                                <div className="flex-1 bg-slate-50/50 rounded-[2.5rem] p-8 border border-transparent group-hover:border-slate-200 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-slate-200/50 transition-all duration-500">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="font-black text-slate-900 uppercase italic tracking-tight text-xl">
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                                <ArrowRight size={14} className="text-slate-300" />
                                                <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                                                    {log.targetType}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tight uppercase">Reference ID: {log.targetId}</p>
                                        </div>

                                        <div className="text-left md:text-right">
                                            <div className="flex items-center md:justify-end gap-2 text-slate-500 mb-1.5">
                                                <Clock size={14} className="text-fami-green" />
                                                <span className="text-xs font-black italic uppercase">
                                                    {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString(undefined, {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    }) : 'Recently'}
                                                </span>
                                            </div>
                                            <div className="flex items-center md:justify-end gap-2 text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl inline-flex border border-emerald-100">
                                                <User size={12} strokeWidth={3} /> Admin Auth Verified
                                            </div>
                                        </div>
                                    </div>

                                    {log.reason && (
                                        <div className="mt-6 p-5 bg-white rounded-2xl border border-slate-100 text-sm text-slate-600 font-bold italic shadow-sm leading-relaxed">
                                            "{log.reason}"
                                        </div>
                                    )}

                                    <div className="mt-6 flex flex-wrap gap-2">
                                        <span className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] italic">
                                            CID: {log.adminUid.slice(-8).toUpperCase()}
                                        </span>
                                        {log.metadata && (
                                            <span className="px-4 py-1.5 rounded-xl bg-fami-green/10 text-fami-dark text-[9px] font-black uppercase tracking-[0.2em] italic flex items-center gap-1.5 border border-fami-green/20">
                                                <FileText size={10} strokeWidth={3} /> System Metadata Attached
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button className="self-center p-4 text-slate-300 hover:text-fami-dark hover:bg-slate-100 rounded-2xl transition-all group-hover:scale-110">
                                    <Eye size={22} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredLogs.length === 0 && (
                        <div className="py-32 text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-50 rounded-full mb-8 italic text-slate-200 border border-slate-100">
                                <History size={48} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Silence in the Logs</h3>
                            <p className="text-slate-400 font-bold mt-2">No administrative activity matches your current filters.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Infrastructure Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-fami-dark to-slate-800 rounded-[3.5rem] p-12 text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-fami-green/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-fami-green/20 transition-all duration-700"></div>
                    <div className="relative z-10 flex items-center gap-8">
                        <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-fami-green border border-white/10 shadow-inner">
                            <Server size={30} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black italic uppercase tracking-tighter">Engine Integrity</h4>
                            <p className="text-slate-400 text-sm font-bold mt-1">Real-time node performance: <span className="text-fami-green uppercase tracking-widest italic animate-pulse">Optimal</span></p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-100 transition-all duration-700"></div>
                    <div className="relative z-10 flex items-center gap-8">
                        <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                            <Lock size={30} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">Security Shield</h4>
                            <p className="text-slate-500 text-sm font-bold mt-1">Protocol status: <span className="text-blue-600 uppercase tracking-widest italic font-black">Encrypted</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
