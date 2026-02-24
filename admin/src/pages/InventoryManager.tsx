import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { InputItem, InputOrder } from '../types';
import {
    ShoppingBag,
    Package,
    Plus,
    Trash2,
    Edit,
    CheckCircle,
    XCircle,
    Truck,
    Clock,
    Search
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
    const [inputs, setInputs] = useState<InputItem[]>([]);
    const [orders, setOrders] = useState<InputOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'items' | 'orders'>('items');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        category: 'Fertilizer',
        price: 0,
        originalPrice: 0,
        unit: 'Bag',
        stock: 0,
        isActive: true,
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const inputsSnapshot = await getDocs(collection(db, 'inputs'));
            const inputsList = inputsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InputItem[];
            setInputs(inputsList);

            const ordersSnapshot = await getDocs(collection(db, 'input_orders'));
            const ordersList = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InputOrder[];
            setOrders(ordersList.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
        } catch (error) {
            console.error('Error fetching inventory data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleItemStatus = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, 'inputs', id), { isActive: !currentStatus });
            setInputs(inputs.map(item => item.id === id ? { ...item, isActive: !currentStatus } : item));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const updateOrderStatus = async (orderId: string, status: InputOrder['status']) => {
        try {
            await updateDoc(doc(db, 'input_orders', orderId), { status });
            setOrders(orders.map(order => order.id === orderId ? { ...order, status } : order));
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm('Are you sure you want to remove this item from the shop?')) return;
        try {
            await deleteDoc(doc(db, 'inputs', id));
            setInputs(inputs.filter(item => item.id !== id));
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    const handleAddItem = async () => {
        try {
            await addDoc(collection(db, 'inputs'), newItem);
            setIsModalOpen(false);
            setNewItem({
                name: '',
                category: 'Fertilizer',
                price: 0,
                originalPrice: 0,
                unit: 'Bag',
                stock: 0,
                isActive: true,
                description: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const filteredItems = inputs.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredOrders = orders.filter(order =>
        order.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 animate-pulse">Loading Inventory...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase">Inventory & Shop</h1>
                    <p className="text-slate-500 font-bold">Manage Input Shop catalog and track user purchases</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
                    <button
                        onClick={() => setActiveTab('items')}
                        className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'items' ? 'bg-fami-dark text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        ITEM CATALOG
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'orders' ? 'bg-fami-dark text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        USER ORDERS
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder={activeTab === 'items' ? "Search items..." : "Search orders by name or ID..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:outline-none focus:border-fami-green text-slate-600 font-medium"
                />
            </div>

            {activeTab === 'items' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="h-full border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-slate-400 hover:border-fami-green hover:text-fami-green transition-all group"
                    >
                        <Plus size={48} className="mb-4 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-lg uppercase">Add New Input</span>
                    </button>

                    {filteredItems.map(item => (
                        <div key={item.id} className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group ${!item.isActive ? 'opacity-60' : ''}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${item.isActive ? 'bg-fami-green/10 text-fami-dark' : 'bg-slate-100 text-slate-400'}`}>
                                    <Package size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 text-slate-400 hover:text-fami-dark"><Edit size={18} /></button>
                                    <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-1">{item.name}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{item.category} • {item.unit}</p>

                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-2xl font-black text-fami-dark">KES {item.price.toLocaleString()}</span>
                                {item.originalPrice && (
                                    <span className="text-sm text-slate-400 line-through">KES {item.originalPrice.toLocaleString()}</span>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Stock Levels</span>
                                    <span className={`font-black tracking-tighter ${item.stock < 10 ? 'text-red-500' : 'text-slate-900'}`}>{item.stock} Units</span>
                                </div>
                                <button
                                    onClick={() => toggleItemStatus(item.id, item.isActive)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all ${item.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                >
                                    {item.isActive ? 'Live' : 'Hidden'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Order Details</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Customer</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Delivery Info</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Total</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest italic text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-400">
                                                <ShoppingBag size={16} />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm italic uppercase tracking-tighter">#{order.id.slice(0, 8)}</p>
                                                <p className="text-xs text-slate-400 font-bold">{order.items.length} items</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-bold text-slate-700">{order.userName}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            {order.deliveryMethod === 'Delivery' ? <Truck size={14} className="text-fami-green" /> : <Clock size={14} className="text-amber-500" />}
                                            <span className="text-xs font-bold">{order.deliveryMethod} - {order.location}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-black text-fami-dark italic">KES {order.totalAmount.toLocaleString()}</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase italic ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                                            order.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                                'bg-blue-50 text-blue-600'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            {order.status === 'pending' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'processing')}
                                                    className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                                                    title="Process Order"
                                                >
                                                    <Truck size={18} />
                                                </button>
                                            )}
                                            {order.status !== 'delivered' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                                                    className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                                                    title="Mark as Delivered"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                title="Cancel Order"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Modal for adding new item */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl space-y-8">
                        <h2 className="text-2xl font-black italic uppercase italic tracking-tighter text-slate-900">New Catalog Item</h2>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Product Name</label>
                                <input
                                    type="text"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                    placeholder="e.g. DAP Fertilizer"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Category</label>
                                    <select
                                        value={newItem.category}
                                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green appearance-none"
                                    >
                                        <option value="Fertilizer">Fertilizer</option>
                                        <option value="Seeds">Seeds</option>
                                        <option value="Tools">Tools</option>
                                        <option value="Feed">Feed</option>
                                        <option value="Livestock">Livestock</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Unit</label>
                                    <input
                                        type="text"
                                        value={newItem.unit}
                                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                        placeholder="e.g. 50kg Bag"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Sale Price (KES)</label>
                                    <input
                                        type="number"
                                        value={newItem.price}
                                        onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Current Stock</label>
                                    <input
                                        type="number"
                                        value={newItem.stock}
                                        onChange={(e) => setNewItem({ ...newItem, stock: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-fami-green"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-8 py-5 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddItem}
                                className="flex-1 px-8 py-5 bg-fami-dark text-fami-green rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-fami-green/5 hover:scale-105 transition-all"
                            >
                                Confirm Addition
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
