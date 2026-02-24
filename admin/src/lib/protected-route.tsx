import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth-context';

export const ProtectedRoute: React.FC = () => {
    const { user, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-fami-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fami-green"></div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
