import { Timestamp } from "firebase-admin/firestore";

export type UserRole = 'investor' | 'farmer' | 'admin';
export type KYCStatus = 'pending' | 'verified' | 'rejected';
export type PoolStatus = 'draft' | 'active' | 'funded' | 'completed' | 'cancelled';
export type InvestmentStatus = 'active' | 'matured' | 'cancelled';
export type TransactionType = 'Deposit' | 'Withdrawal' | 'Investment' | 'Payout' | 'Refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type PoolCategory = 'poultry' | 'livestock' | 'horticulture' | 'orchards' | 'grain' | 'institutions';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ContractType = 'standard' | 'revenue';
export type LoanStatus = 'Requested' | 'Approved' | 'Disbursed' | 'Active' | 'Repaid' | 'Defaulted' | 'Rejected';

export interface User {
    uid: string;
    email: string;
    username: string;
    role: UserRole;
    phoneNumber: string;
    balance: number;
    kycStatus: KYCStatus;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    metadata: {
        lastLogin: Timestamp;
        deviceTokens: string[];
    };
}

export interface Pool {
    id: string;
    name: string;
    category: PoolCategory;
    description: string;
    location: string;
    targetAmount: number;
    currentAmount: number;
    funded: string;
    roi: string;
    risk: RiskLevel;
    duration: string;
    status: PoolStatus;
    farmerId: string;
    approvedBy?: string;
    approvalDate?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    riskScore: number;
    weatherRisk: string;
    marketRisk: string;
    standardROI: string;
    revenueROI?: string;
    impact: string[];
    color: string;
    isChamaReady: boolean;
    institutionType?: string;
    assetBase?: string;
}

export interface Investment {
    id: string;
    uid: string;
    poolId: string;
    poolName: string;
    amount: number;
    contractType: ContractType;
    roi: string;
    duration: string;
    status: InvestmentStatus;
    date: Timestamp;
    maturityDate: Timestamp;
    expectedReturn: number;
    actualReturn?: number;
    payoutDate?: Timestamp;
}

export interface Transaction {
    id: string;
    uid: string;
    amount: string;
    type: TransactionType;
    category: string;
    description: string;
    status: TransactionStatus;
    date: Timestamp;
    metadata: {
        paymentMethod?: string;
        referenceId?: string;
        poolId?: string;
        loanId?: string;
    };
}

export interface Loan {
    id: string;
    uid: string;
    farmerName: string;
    amount: number;
    description: string;
    purpose: string;
    status: LoanStatus;
    requestedAt: Timestamp;
    approvedAt?: Timestamp;
    disbursedAt?: Timestamp;
    maturityDate?: Timestamp;
    repaidAmount: number;
    balance: number;
    interestRate: number;
    terms: string;
    metadata: {
        trustScoreAtRequest: number;
        rejectionReason?: string;
        adminUid?: string;
    };
}

export interface AdminAction {
    id: string;
    adminUid: string;
    action: 'approve_pool' | 'verify_user' | 'reject_pool' | 'suspend_user' | 'approve_loan' | 'reject_loan' | 'disburse_loan';
    targetId: string;
    targetType: 'pool' | 'user' | 'loan';
    reason?: string;
    timestamp: Timestamp;
    metadata: Record<string, any>;
}

export interface Notification {
    id: string;
    uid: string;
    title: string;
    body: string;
    type: 'investment' | 'payout' | 'pool_update' | 'system';
    read: boolean;
    data?: Record<string, any>;
    createdAt: Timestamp;
}

export interface DailyAnalytics {
    id: string;
    date: string;
    metrics: {
        totalInvestments: number;
        totalUsers: number;
        totalPools: number;
        totalVolume: number;
        activeInvestors: number;
        activeFarmers: number;
    };
    updatedAt: Timestamp;
}
