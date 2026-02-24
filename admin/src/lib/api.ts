import { auth } from './firebase';

// CONFIGURATION: Set this to your standalone server URL (e.g. from Render/Railway)
// Set it to null to use Firebase Cloud Functions (requires Blaze plan)
const STANDALONE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Helper to call backend functions.
 * Automatically handles switching between Firebase Functions and Standalone Express server.
 */
export async function callBackend(functionName: string, data: any) {
    if (!STANDALONE_BACKEND_URL) {
        // Use Firebase Functions (Requires Blaze)
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const fn = httpsCallable(functions, functionName);
        const result = await fn(data);
        return result.data;
    } else {
        // Use Standalone Server (FREE)
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : '';

        const endpoint = getEndpointForFunction(functionName);
        const response = await fetch(`${STANDALONE_BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Backend request failed');
        }

        return await response.json();
    }
}

function getEndpointForFunction(name: string): string {
    const mapping: Record<string, string> = {
        'processInvestment': '/api/investments/process',
        'approvePool': '/api/pools/approve',
        'getDashboardStats': '/api/admin/stats',
        'requestLoan': '/api/loans/request',
        'processPayout': '/api/loans/payout',
        'updateSystemSettings': '/api/admin/settings/update',
        'getSystemSettings': '/api/admin/settings',
        'requestWithdrawal': '/api/investments/withdrawal-request',
        'buyProduce': '/api/marketplace/buy',
        'createMarketAccessPlan': '/api/marketplace/market-access',
        'approveWithdrawal': '/api/admin/withdrawals/approve',
    };
    return mapping[name] || `/api/${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
}
