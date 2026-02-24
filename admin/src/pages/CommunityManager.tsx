import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CommunityGroup } from '../types';
import {
    Users, MessageSquare, Plus, Trash2, Shield,
    Search, Hash, X
} from 'lucide-react';

export const CommunityManager: React.FC = () => {
    // ── Community Groups ──
    const [groups, setGroups] = useState<CommunityGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [groupSearch, setGroupSearch] = useState('');
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupForm, setGroupForm] = useState({ name: '', description: '', category: '' });
    const [savingGroup, setSavingGroup] = useState(false);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setGroupsLoading(true);
        try {
            const snap = await getDocs(collection(db, 'community_groups'));
            setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CommunityGroup[]);
        } catch (e) { console.error(e); }
        finally { setGroupsLoading(false); }
    };

    const handleCreateGroup = async () => {
        if (!groupForm.name || !groupForm.category) return;
        setSavingGroup(true);
        try {
            const ref = await addDoc(collection(db, 'community_groups'), {
                ...groupForm,
                memberCount: 0,
                createdAt: Timestamp.now(),
            });
            setGroups(prev => [...prev, { id: ref.id, ...groupForm, memberCount: 0, createdAt: Timestamp.now() }]);
            setShowGroupModal(false);
            setGroupForm({ name: '', description: '', category: '' });
        } catch (e) { console.error(e); alert('Failed to create group.'); }
        finally { setSavingGroup(false); }
    };

    const deleteGroup = async (id: string) => {
        if (!confirm('Dissolve this community group?')) return;
        await deleteDoc(doc(db, 'community_groups', id));
        setGroups(prev => prev.filter(g => g.id !== id));
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
        g.category.toLowerCase().includes(groupSearch.toLowerCase())
    );

    return (
        <div className="space-y-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Community Governance</h1>
                    <p className="text-slate-500 font-bold mt-1">Manage discussion groups and ecosystem participation</p>
                </div>
                <div className="flex items-center gap-3 bg-fami-dark text-white p-5 rounded-3xl">
                    <div className="p-3 bg-fami-green text-fami-dark rounded-xl"><Users size={20} strokeWidth={3} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Groups</p>
                        <p className="text-2xl font-black tracking-tighter">{groups.length}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        value={groupSearch}
                        onChange={e => setGroupSearch(e.target.value)}
                        placeholder="Search community groups..."
                        className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green font-bold text-slate-700 shadow-sm"
                    />
                </div>

                {groupsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => <div key={i} className="h-72 bg-slate-100 rounded-[3rem] animate-pulse" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* New Group Card */}
                        <button
                            onClick={() => setShowGroupModal(true)}
                            className="h-full min-h-[280px] border-4 border-dashed border-slate-100 rounded-[3rem] p-12 flex flex-col items-center justify-center text-slate-300 hover:border-fami-green hover:text-fami-green transition-all group bg-white hover:shadow-2xl hover:shadow-fami-green/5"
                        >
                            <Plus size={50} strokeWidth={3} className="mb-4 group-hover:scale-110 transition-transform" />
                            <span className="font-black text-sm uppercase tracking-widest italic">New Community Group</span>
                        </button>

                        {filteredGroups.map(group => (
                            <div key={group.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-fami-green/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>

                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className="p-4 bg-slate-900 text-fami-green rounded-2xl group-hover:rotate-6 transition-transform">
                                        <Hash size={28} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-fami-dark hover:text-white transition-all">
                                            <MessageSquare size={18} />
                                        </button>
                                        <button onClick={() => deleteGroup(group.id)} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg mb-4 relative z-10">
                                    {group.category}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter mb-3 leading-tight relative z-10">{group.name}</h3>
                                <p className="text-slate-500 font-medium text-sm mb-8 line-clamp-2 leading-relaxed relative z-10">{group.description}</p>

                                <div className="pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
                                    <span className="text-sm font-black italic text-fami-dark tracking-tighter">{(group.memberCount || 0).toLocaleString()} Participants</span>
                                    <button className="h-10 w-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-fami-dark hover:text-white transition-all flex items-center justify-center">
                                        <Shield size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Create Community Group */}
            {showGroupModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">New Community Group</h2>
                            <button onClick={() => setShowGroupModal(false)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"><X size={18} /></button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Group Name *</label>
                                <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                    placeholder="e.g. Rift Valley Maize Farmers" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green font-bold text-slate-800" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category *</label>
                                <input value={groupForm.category} onChange={e => setGroupForm({ ...groupForm, category: e.target.value })}
                                    placeholder="e.g. Maize farmers, Dairy cooperative" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green font-bold text-slate-800" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                                <textarea value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                                    rows={3} placeholder="What is the purpose of this group?" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-fami-green font-bold text-slate-800 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowGroupModal(false)} className="flex-1 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-50 transition-all">Cancel</button>
                            <button onClick={handleCreateGroup} disabled={savingGroup || !groupForm.name}
                                className="flex-1 py-4 bg-fami-dark text-fami-green rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-105 transition-all disabled:opacity-50 shadow-xl shadow-slate-900/20">
                                {savingGroup ? 'Creating...' : 'Create Group'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
