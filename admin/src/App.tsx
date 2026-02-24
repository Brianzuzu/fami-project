import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewPage } from './pages/OverviewPage';
import { UsersPage } from './pages/UsersPage';
import { PoolsPage } from './pages/PoolsPage';
import { FinancialsPage } from './pages/FinancialsPage';
import { AuditPage } from './pages/AuditPage';
import { InventoryManager } from './pages/InventoryManager';
import { MarketplaceManager } from './pages/MarketplaceManager';
import { CreditManager } from './pages/CreditManager';
import { CommunityManager } from './pages/CommunityManager';
import { InvestmentManager } from './pages/InvestmentManager';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/pools" element={<PoolsPage />} />
            <Route path="/inventory" element={<InventoryManager />} />
            <Route path="/marketplace" element={<MarketplaceManager />} />
            <Route path="/credit" element={<CreditManager />} />
            <Route path="/community" element={<CommunityManager />} />
            <Route path="/financials" element={<FinancialsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/investments" element={<InvestmentManager />} />
            <Route path="/settings" element={<div className="p-8"><h1 className="text-2xl font-bold">Settings (Coming Soon)</h1></div>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
