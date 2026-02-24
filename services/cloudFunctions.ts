import {
    getFunctions,
    httpsCallable,
    connectFunctionsEmulator
} from 'firebase/functions';
import app from '../app/firebaseConfig'; // Ensure we use the initialized app
import { Platform } from 'react-native';

const functions = getFunctions(app);

// BACKEND URL — change this to switch environments:
//   Android Emulator : 'http://10.0.2.2:3000'
//   iOS Simulator    : 'http://localhost:3000'
//   Physical device  : 'http://172.16.33.66:3000'  ← your machine's LAN IP
const STANDALONE_BACKEND_URL = Platform.OS === 'android'
    ? 'http://172.16.33.66:3000'   // Physical Android device (use 10.0.2.2 for emulator)
    : 'http://172.16.33.66:3000';  // Physical iOS device (use localhost for simulator)

// Connect to functions emulator in development if no standalone URL is set
if (__DEV__ && !STANDALONE_BACKEND_URL) {
    const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
    console.log(`Routing Cloud Functions to local emulator at ${host}:5001`);
    connectFunctionsEmulator(functions, host, 5001);
}

/**
 * Universal caller that handles both Firebase and Standalone Express
 */
async function callBackend<TReq, TRes>(functionName: string, data: TReq): Promise<TRes> {
    if (!STANDALONE_BACKEND_URL) {
        const callable = httpsCallable<TReq, TRes>(functions, functionName);
        const result = await callable(data);
        return result.data;
    } else {
        const { auth } = await import('../app/firebaseConfig');
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : '';

        const endpointMapping: Record<string, string> = {
            'processInvestment': '/api/investments/process',
            'approvePool': '/api/pools/approve',
            'getDashboardStats': '/api/admin/stats',
            'requestLoan': '/api/loans/request',
            'processPayout': '/api/loans/payout',
        };
        const endpoint = endpointMapping[functionName] || `/api/${functionName}`;

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

// ===== Investment Functions =====

export interface ProcessInvestmentParams {
    poolId: string;
    amount: number;
    contractType: 'standard' | 'revenue';
    paymentMethod?: string;
    paymentReference?: string;
}

export interface ProcessInvestmentResult {
    success: boolean;
    investmentId: string;
    transactionId: string;
    newBalance: number;
    message: string;
}

/**
 * Process an investment in a farming pool
 */
export const processInvestment = async (
    params: ProcessInvestmentParams
): Promise<ProcessInvestmentResult> => {
    console.log("Calling processInvestment with params:", params);
    try {
        return await callBackend<ProcessInvestmentParams, ProcessInvestmentResult>(
            'processInvestment',
            params
        );
    } catch (error: any) {
        console.error("Cloud Function Error [processInvestment]:", error);
        throw error;
    }
};

// ===== Admin Functions =====

export interface ApprovePoolParams {
    poolId: string;
    approved: boolean;
    reason?: string;
}

export interface ApprovePoolResult {
    success: boolean;
    poolId: string;
    status: string;
    message: string;
}

/**
 * Approve or reject a pool (Admin only)
 */
export const approvePool = async (
    params: ApprovePoolParams
): Promise<ApprovePoolResult> => {
    return await callBackend<ApprovePoolParams, ApprovePoolResult>(
        'approvePool',
        params
    );
};

export interface DashboardStats {
    success: boolean;
    stats: {
        users: {
            total: number;
            investors: number;
            farmers: number;
            admins: number;
            pendingKYC: number;
        };
        pools: {
            total: number;
            active: number;
            pending: number;
            completed: number;
        };
        investments: {
            total: number;
            active: number;
            totalVolume: number;
        };
        transactions: {
            total: number;
            pending: number;
            totalVolume: number;
        };
    };
    recentActivity: any[];
}

/**
 * Get admin dashboard statistics (Admin only)
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
    return await callBackend<void, DashboardStats>(
        'getDashboardStats',
        undefined as any
    );
};

// ===== Loan Functions =====

export interface RequestLoanParams {
    amount: number;
    purpose: string;
    description: string;
    terms?: string;
}

export interface RequestLoanResult {
    success: boolean;
    loanId: string;
    message: string;
}

/**
 * Request a loan (Farmer only)
 */
export const requestLoan = async (
    params: RequestLoanParams
): Promise<RequestLoanResult> => {
    return await callBackend<RequestLoanParams, RequestLoanResult>(
        'requestLoan',
        params
    );
};

export interface ProcessPayoutParams {
    loanId: string;
    approved: boolean;
    reason?: string;
}

export interface ProcessPayoutResult {
    success: boolean;
    message: string;
}

/**
 * Process loan payout (Admin only)
 */
export const processPayout = async (
    params: ProcessPayoutParams
): Promise<ProcessPayoutResult> => {
    return await callBackend<ProcessPayoutParams, ProcessPayoutResult>(
        'processPayout',
        params
    );
};

// ===== Error Handling Helper =====

export const handleCloudFunctionError = (error: any): string => {
    if (error.code === 'unauthenticated') {
        return 'Please sign in to continue.';
    } else if (error.code === 'permission-denied') {
        return 'You do not have permission to perform this action.';
    } else if (error.code === 'invalid-argument') {
        return error.message || 'Invalid input provided.';
    } else if (error.code === 'not-found') {
        if (__DEV__) {
            return 'Cloud Function not found. Please ensure your local emulator is running with: npx firebase emulators:start --only functions';
        }
        return 'The requested service is temporarily unavailable.';
    } else {
        return error.message || 'An unexpected error occurred. Please try again.';
    }
};
