import { auth } from '../app/firebaseConfig';

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND URL CONFIGURATION
//
//  • Android Emulator  → 'http://10.0.2.2:3000'
//  • iOS Simulator     → 'http://localhost:3000'
//  • Physical device   → use your machine's actual LAN IP, e.g.:
//                        'http://172.16.13.53:3000'
//
// Change this ONE line to switch environments:
// ─────────────────────────────────────────────────────────────────────────────
const BACKEND_URL = 'http://172.16.33.66:3000';

const ENDPOINT_MAP: Record<string, string> = {
    'processInvestment': '/api/investments/process',
    'requestWithdrawal': '/api/investments/withdrawal-request',
    'createMarketAccessPlan': '/api/marketplace/market-access',
    'approveWithdrawal': '/api/admin/withdrawals/approve',
};

/**
 * Call a named backend function.
 * Automatically attaches the Firebase ID token as a Bearer token.
 */
export async function callBackend(functionName: string, data: any) {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';

    const endpoint =
        ENDPOINT_MAP[functionName] ||
        `/api/${functionName.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Backend error: ${response.status}`);
    }

    return await response.json();
}
