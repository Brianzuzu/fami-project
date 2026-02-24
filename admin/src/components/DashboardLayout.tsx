import React from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Sprout,
    Wallet,
    History,
    Settings,
    LogOut,
    Bell,
    Search as SearchIcon,
    Store,
    Package,
    ShieldCheck,
    Users2,
    TrendingUp
} from 'lucide-react';
import { auth } from '../lib/firebase';

export const DashboardLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Users', path: '/users', icon: Users },
        { name: 'Project Pools', path: '/pools', icon: Sprout },
        { name: 'Investments', path: '/investments', icon: TrendingUp },
        { name: 'Inventory Shop', path: '/inventory', icon: Package },
        { name: 'Market Intelligence', path: '/marketplace', icon: Store },
        { name: 'Credit & Loans', path: '/credit', icon: ShieldCheck },
        { name: 'Community', path: '/community', icon: Users2 },
        { name: 'Finance', path: '/financials', icon: Wallet },
        { name: 'Audit Logs', path: '/audit', icon: History },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans selection:bg-fami-green/30">
            {/* Sidebar */}
            <aside className="w-72 bg-fami-dark text-white flex flex-col relative overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.1)]">
                {/* Decorative background for sidebar */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-fami-green rounded-full blur-3xl"></div>
                    <div className="absolute bottom-40 -right-20 w-40 h-40 bg-fami-accent rounded-full blur-3xl"></div>
                </div>

                <div className="p-8 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-fami-green rounded-xl flex items-center justify-center shadow-lg shadow-fami-green/20">
                            <Sprout className="text-fami-dark" size={24} />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">FAMI</h1>
                    </div>
                    <p className="text-[10px] font-bold text-fami-green/60 uppercase tracking-[0.2em] ml-1">Admin Console v2.0</p>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 mt-4 relative z-10">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                border-radius="20px"
                                to={item.path}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${isActive
                                    ? 'bg-fami-green text-fami-dark font-black shadow-lg shadow-fami-green/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon size={20} className={`${isActive ? 'scale-110' : 'group-hover:translate-x-1'} transition-transform`} />
                                <span className="text-sm font-bold tracking-wide">{item.name}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-fami-dark/50"></div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-white/5 relative z-10">
                    <Link
                        to="/settings"
                        className="flex items-center gap-4 px-6 py-4 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all mb-2 group"
                    >
                        <Settings size={20} className="group-hover:rotate-45 transition-transform" />
                        <span className="text-sm font-bold">Settings</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-6 py-4 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all group"
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold">Log Out</span>
                    </button>

                    <div className="mt-8 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fami-green to-fami-accent flex items-center justify-center text-fami-dark font-black shadow-lg">
                                AD
                            </div>
                            <div>
                                <p className="text-xs font-black text-white truncate">Administrator</p>
                                <p className="text-[10px] text-slate-500 font-bold">System Level</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
                {/* Top Navbar */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-10 z-20">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic mr-8">
                            {navItems.find(item => item.path === location.pathname)?.name || 'Settings'}
                        </h2>
                        <div className="hidden md:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200/50">
                            <SearchIcon size={16} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Global Search..."
                                className="bg-transparent border-none text-sm focus:outline-none w-48 text-slate-600 font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="p-2.5 bg-slate-100 text-slate-500 hover:text-fami-dark hover:bg-slate-200 transition-all rounded-xl relative group">
                            <Bell size={20} className="group-hover:animate-bounce" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-fami-green rounded-full border-2 border-slate-100"></span>
                        </button>

                        <div className="h-10 w-[1px] bg-slate-200"></div>

                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-slate-900 group-hover:text-fami-dark transition-colors">Admin Core</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Super Admin</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-white border-2 border-slate-100 p-0.5 shadow-sm group-hover:border-fami-green transition-all">
                                <div className="h-full w-full rounded-[10px] bg-fami-dark flex items-center justify-center text-fami-green font-black text-sm">
                                    AC
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-10 bg-gradient-to-b from-white/30 to-slate-50/50">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};
