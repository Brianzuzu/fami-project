import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { MarketPrice, LocalMarket } from '../types';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    MapPin,
    Plus,
    Trash2,
    Edit,
    Store,
    RefreshCw,
    Search,
    XCircle
} from 'lucide-react';

export const MarketplaceManager: React.FC = () => {
    const [prices, setPrices] = useState<MarketPrice[]>([]);
    const [markets, setMarkets] = useState<LocalMarket[]>([]);
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'prices' | 'markets' | 'listings'>('prices');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<any>({});
    const [buying, setBuying] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const pricesSnapshot = await getDocs(collection(db, 'market_prices'));
            const pricesList = pricesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MarketPrice[];
            setPrices(pricesList);

            const marketsSnapshot = await getDocs(collection(db, 'local_markets'));
            const marketsList = marketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LocalMarket[];
            setMarkets(marketsList);

            const listingsSnapshot = await getDocs(collection(db, 'marketplace'));
            const listingsList = listingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setListings(listingsList);
        } catch (error) {
            console.error('Error fetching marketplace data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePriceValue = async (id: string, newPrice: number) => {
        try {
            const oldPrice = prices.find(p => p.id === id)?.price || 0;
            const trend = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'stable';

            await updateDoc(doc(db, 'market_prices', id), {
                price: newPrice,
                trend: trend,
                updatedAt: Timestamp.now()
            });
            setPrices(prices.map(p => p.id === id ? { ...p, price: newPrice, trend, updatedAt: Timestamp.now() } : p));
        } catch (error) {
            console.error('Error updating price:', error);
        }
    };

    const deleteMarket = async (id: string) => {
        if (!confirm('Are you sure you want to remove this market?')) return;
        try {
            await deleteDoc(doc(db, 'local_markets', id));
            setMarkets(markets.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting market:', error);
        }
    };

    const deletePrice = async (id: string) => {
        if (!confirm('Are you sure you want to remove this price index?')) return;
        try {
            await deleteDoc(doc(db, 'market_prices', id));
            setPrices(prices.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting price:', error);
        }
    };

    const handleEdit = (item: any) => {
        setNewItem(item);
        setIsEditing(item.id);
        setIsModalOpen(true);
    };

    const handleBuyProduce = async (listing: any) => {
        if (!confirm(`Are you sure you want to buy ${listing.name} from ${listing.farmerName} for KES ${parseFloat(listing.price).toLocaleString()}?`)) return;

        setBuying(listing.id);
        try {
            const { callBackend } = await import('../lib/api');
            await callBackend('buyProduce', {
                listingId: listing.id,
                price: parseFloat(listing.price),
                buyerName: 'Fami Admin'
            });
            alert('Produce purchased successfully. Farmer has been notified and credited.');
            fetchData();
        } catch (error) {
            console.error('Error buying produce:', error);
            alert('Failed to process purchase.');
        } finally {
            setBuying(null);
        }
    };

    const deleteListing = async (id: string) => {
        if (!confirm('Are you sure you want to remove this listing?')) return;
        try {
            await deleteDoc(doc(db, 'marketplace', id));
            setListings(listings.filter(l => l.id !== id));
        } catch (error) {
            console.error('Error deleting listing:', error);
        }
    };

    const handleAdd = async () => {
        try {
            const collectionName = activeTab === 'prices' ? 'market_prices' : (activeTab === 'markets' ? 'local_markets' : 'marketplace');
            if (isEditing) {
                const { id, ...updateData } = newItem;

                // Calculate trend if updating a price index
                if (activeTab === 'prices') {
                    const oldPrice = prices.find(p => p.id === id)?.price || 0;
                    const newPrice = parseFloat(updateData.price);
                    if (newPrice > oldPrice) updateData.trend = 'up';
                    else if (newPrice < oldPrice) updateData.trend = 'down';
                    else updateData.trend = 'stable';
                }

                await updateDoc(doc(db, collectionName, id), {
                    ...updateData,
                    updatedAt: Timestamp.now()
                });
            } else {
                const saveData = { ...newItem, updatedAt: Timestamp.now() };
                if (activeTab === 'prices') saveData.trend = 'stable';

                await addDoc(collection(db, collectionName), saveData);
            }
            setIsModalOpen(false);
            setIsEditing(null);
            const defaults: any = {};
            if (activeTab === 'prices') defaults.price = 0;
            if (activeTab === 'markets') { defaults.memberCount = 0; defaults.type = ''; defaults.operatingDays = ''; }
            if (activeTab === 'listings') { defaults.price = 0; defaults.status = 'Available'; defaults.farmerName = 'Fami Admin'; defaults.category = 'Crops'; }
            setNewItem(defaults);
            fetchData();
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Failed to save. Check console for details.');
        }
    };

    if (loading) return <div className="p-8 animate-pulse text-slate-400 font-black italic uppercase">Synchronizing Market Data...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Market Intelligence</h1>
                    <p className="text-slate-500 font-bold">Control ecosystem-wide produce pricing and market availability</p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('listings')}
                        className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'listings' ? 'bg-fami-dark text-white shadow-xl italic' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        FARMER LISTINGS
                    </button>
                    <button
                        onClick={() => setActiveTab('prices')}
                        className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'prices' ? 'bg-fami-dark text-white shadow-xl italic' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        PRICE CONTROL
                    </button>
                    <button
                        onClick={() => setActiveTab('markets')}
                        className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'markets' ? 'bg-fami-dark text-white shadow-xl italic' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        LOCAL MARKETS
                    </button>
                </div>
            </div>

            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-fami-green transition-colors" size={20} />
                <input
                    type="text"
                    placeholder={activeTab === 'prices' ? "Search produce index..." : activeTab === 'listings' ? "Search farmer listings..." : "Search local markets..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-8 py-5 bg-white border border-slate-200 rounded-[2rem] focus:outline-none focus:border-fami-green focus:shadow-2xl focus:shadow-fami-green/5 text-slate-700 font-bold transition-all placeholder:italic placeholder:font-black placeholder:uppercase placeholder:text-slate-300"
                />
            </div>

            {activeTab === 'listings' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <button
                        onClick={() => {
                            setIsModalOpen(true);
                            setNewItem({ name: '', farmerName: 'Fami Admin', price: 0, quantity: '', location: '', status: 'Available' });
                        }}
                        className="h-full border-4 border-dashed border-slate-100 rounded-[3rem] p-12 flex flex-col items-center justify-center text-slate-300 hover:border-fami-green hover:text-fami-green transition-all group bg-white/50"
                    >
                        <Plus size={56} strokeWidth={3} className="mb-4 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-sm uppercase tracking-widest italic">Add New Listing</span>
                    </button>
                    {listings.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.farmerName?.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                        <div key={item.id} className={`bg-white p-10 rounded-[3rem] border shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all ${item.isForAdminSale ? 'border-fami-dark ring-2 ring-fami-green/20' : 'border-slate-100'}`}>
                            {item.isForAdminSale && (
                                <div className="absolute top-0 right-0 bg-fami-dark text-fami-green px-6 py-2 rounded-bl-3xl text-[10px] font-black italic uppercase tracking-widest z-10">
                                    FAMI MANAGED
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl ${item.isForAdminSale ? 'bg-fami-dark text-fami-green shadow-lg' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <Store size={24} />
                                </div>
                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic ${item.status === 'Sold' ? 'bg-rose-50 text-rose-600' : (item.isForAdminSale ? 'bg-fami-dark text-fami-green' : 'bg-emerald-50 text-emerald-600')}`}>
                                    {item.status || 'Available'}
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic mb-1">{item.name}</h3>
                            <div className="flex flex-col mb-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {item.farmerName || 'Farmer'} <span className="text-fami-dark font-black ml-1">{item.farmerFamiId}</span>
                                </p>
                                {item.isForAdminSale && (
                                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Payment Info</p>
                                        <p className="text-[11px] font-black text-slate-900">{item.paymentMethod}: {item.paymentDetails}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold uppercase text-[10px] italic">Price</span>
                                    <span className="font-black text-slate-900">KES {parseFloat(item.price).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold uppercase text-[10px] italic">Quantity</span>
                                    <span className="font-black text-slate-900">{item.quantity}</span>
                                </div>
                                {item.paymentStatus && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-bold uppercase text-[10px] italic">Payment</span>
                                        <span className={`font-black uppercase text-[10px] ${item.paymentStatus === 'Paid' ? 'text-fami-green' : 'text-orange-500'}`}>{item.paymentStatus}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {item.isForAdminSale ? (
                                    <button
                                        onClick={() => handleBuyProduce(item)}
                                        disabled={item.status === 'Sold' || buying === item.id}
                                        className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase italic tracking-widest transition-all flex items-center justify-center gap-3 ${item.status === 'Sold' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-fami-dark text-white hover:bg-black w-full shadow-2xl'}`}
                                    >
                                        {buying === item.id ? <RefreshCw className="animate-spin" size={16} /> : (item.status === 'Sold' ? 'PAID & SETTLED' : 'MARK SOLD & PAY')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleBuyProduce(item)}
                                        disabled={item.status === 'Sold' || buying === item.id}
                                        className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase italic tracking-widest transition-all flex items-center justify-center gap-3 ${item.status === 'Sold' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-fami-dark text-fami-green hover:scale-105 shadow-xl shadow-fami-dark/10'}`}
                                    >
                                        {buying === item.id ? <RefreshCw className="animate-spin" size={16} /> : (item.status === 'Sold' ? 'Purchased' : 'Buy')}
                                    </button>
                                )}
                                <button onClick={() => handleEdit(item)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                                    <Edit size={18} strokeWidth={2} />
                                </button>
                                <button onClick={() => deleteListing(item.id)} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all">
                                    <Trash2 size={18} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'prices' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <button
                        onClick={() => {
                            setIsModalOpen(true);
                            setNewItem({ produce: '', location: '', price: 0, unit: '90kg bag', trend: 'stable' });
                        }}
                        className="h-full border-4 border-dashed border-slate-100 rounded-[3rem] p-12 flex flex-col items-center justify-center text-slate-300 hover:border-fami-green hover:text-fami-green transition-all group bg-white/50"
                    >
                        <Plus size={56} strokeWidth={3} className="mb-4 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-sm uppercase tracking-widest italic">Add Price Index</span>
                    </button>

                    {prices.filter(p => p.produce.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                        <div key={item.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all">
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br transition-all duration-700 blur-3xl opacity-5 -mr-16 -mt-16 ${item.trend === 'up' ? 'from-emerald-500 to-teal-500' : item.trend === 'down' ? 'from-red-500 to-orange-500' : 'from-slate-500 to-slate-800'}`}></div>

                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className="p-4 bg-slate-50 rounded-[1.5rem] group-hover:scale-110 transition-transform">
                                    <Store size={28} className="text-fami-dark" />
                                </div>
                                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 ${item.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : item.trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                                    {item.trend === 'up' ? <TrendingUp size={12} strokeWidth={3} /> : item.trend === 'down' ? <TrendingDown size={12} strokeWidth={3} /> : <Minus size={12} strokeWidth={3} />}
                                    {item.trend}
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-1">{item.produce}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-8">
                                <MapPin size={10} className="text-fami-green" />
                                {item.location}
                            </p>

                            <div className="flex items-center justify-between mb-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <span className="text-3xl font-black italic tracking-tighter text-fami-dark">KES {item.price.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ {item.unit}</span>
                            </div>

                            <div className="flex gap-3 relative z-10">
                                <button
                                    onClick={() => {
                                        const p = prompt('Update price for ' + item.produce, item.price.toString());
                                        if (p && !isNaN(parseFloat(p))) updatePriceValue(item.id, parseFloat(p));
                                    }}
                                    className="flex-1 bg-slate-900 text-white italic py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-fami-dark transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={14} strokeWidth={3} />
                                    Update Price
                                </button>
                                <button onClick={() => handleEdit(item)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                                    <Edit size={18} strokeWidth={2} />
                                </button>
                                <button onClick={() => deletePrice(item.id)} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all">
                                    <Trash2 size={18} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button
                        onClick={() => {
                            setIsModalOpen(true);
                            setNewItem({ name: '', location: '', description: '', operatingDays: 'Daily' });
                        }}
                        className="border-4 border-dashed border-slate-100 rounded-[3rem] p-12 flex flex-col items-center justify-center text-slate-300 hover:border-fami-green hover:text-fami-green transition-all group bg-white/50"
                    >
                        <Plus size={48} strokeWidth={3} className="mb-4 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-sm uppercase tracking-widest italic">Register Local Market</span>
                    </button>

                    {markets.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(market => (
                        <div key={market.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 relative group overflow-hidden hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className="h-16 w-16 bg-fami-dark rounded-2xl flex items-center justify-center text-fami-green shadow-xl">
                                    <MapPin size={32} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(market)} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-fami-dark transition-colors"><Edit size={18} /></button>
                                    <button onClick={() => deleteMarket(market.id)} className="p-3 bg-red-50 rounded-xl text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                                </div>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">{market.name}</h3>
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-6">
                                <MapPin size={16} className="text-fami-green" />
                                {market.location}
                            </div>
                            <p className="text-slate-500 font-medium leading-relaxed mb-8">{market.description}</p>
                            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operational Window</span>
                                    <span className="text-sm font-black italic text-fami-dark tracking-tight">{market.operatingDays}</span>
                                </div>
                                <button className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest italic">ACTIVE</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for adding new items */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
                                {isEditing ? (activeTab === 'prices' ? 'Edit Price Index' : activeTab === 'markets' ? 'Edit Market' : 'Edit Listing') : (activeTab === 'prices' ? 'New Price Index' : activeTab === 'markets' ? 'Register Market' : 'New Listing')}
                            </h2>
                            <button onClick={() => { setIsModalOpen(false); setIsEditing(null); setNewItem({}); }} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {activeTab === 'prices' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Produce Name</label>
                                        <input
                                            type="text"
                                            value={newItem.produce}
                                            onChange={(e) => setNewItem({ ...newItem, produce: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Current Price</label>
                                            <input
                                                type="number"
                                                value={newItem.price}
                                                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Unit</label>
                                            <input
                                                type="text"
                                                value={newItem.unit}
                                                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Location</label>
                                        <input
                                            type="text"
                                            value={newItem.location}
                                            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'markets' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Market Name</label>
                                        <input
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Location</label>
                                        <input
                                            type="text"
                                            value={newItem.location}
                                            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Market Type</label>
                                            <input
                                                type="text"
                                                value={newItem.type}
                                                onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                                                placeholder="e.g. Grain Market"
                                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Members</label>
                                            <input
                                                type="number"
                                                value={newItem.memberCount}
                                                onChange={(e) => setNewItem({ ...newItem, memberCount: parseInt(e.target.value) })}
                                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Operating Days</label>
                                        <input
                                            type="text"
                                            value={newItem.operatingDays}
                                            onChange={(e) => setNewItem({ ...newItem, operatingDays: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'listings' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Category</label>
                                        <select
                                            value={newItem.category || 'Crops'}
                                            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green appearance-none"
                                        >
                                            <option value="Crops">Crops</option>
                                            <option value="Livestock">Livestock</option>
                                            <option value="Dairy">Dairy</option>
                                            <option value="Poultry">Poultry</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Produce Name</label>
                                        <input
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Price (KES)</label>
                                            <input
                                                type="number"
                                                value={newItem.price}
                                                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Quantity</label>
                                            <input
                                                type="text"
                                                value={newItem.quantity}
                                                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Farmer Name</label>
                                        <input
                                            type="text"
                                            value={newItem.farmerName}
                                            onChange={(e) => setNewItem({ ...newItem, farmerName: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Location</label>
                                        <input
                                            type="text"
                                            value={newItem.location}
                                            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => { setIsModalOpen(false); setIsEditing(null); setNewItem({}); }}
                                className="flex-1 px-8 py-5 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdd}
                                className="flex-1 px-8 py-5 bg-fami-dark text-fami-green rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-fami-green/5 hover:scale-105 transition-all"
                            >
                                {isEditing ? 'Save Changes' : 'Confirm Addition'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
