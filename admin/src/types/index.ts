export interface User {
    uid: string;
    email: string;
    displayName: string;
    username?: string; // Added this
    role: 'investor' | 'farmer' | 'admin';
    kycStatus: 'pending' | 'verified' | 'rejected' | 'none';
    trustScoreStatus?: 'pending' | 'granted' | 'declined'; // Added this
    phoneNumber?: string;
    createdAt: any;
}

export interface Pool {
    id: string;
    name: string;
    farmerId: string;
    farmerName: string;
    sector: string;
    targetAmount: number;
    raisedAmount: number;
    status: 'draft' | 'active' | 'completed' | 'cancelled';
    description: string;
    expectedROI: number;
    durationDays: number;
    createdAt: any;
}

export interface Investment {
    id: string;
    poolId: string;
    poolName: string;
    investorId: string;
    investorName: string;
    amount: number;
    paymentMethod?: string;
    expectedReturn?: number;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    createdAt: any;
}

export interface Transaction {
    id: string;
    uid: string;
    userName: string;
    amount: number;
    type: string;
    status: 'pending' | 'completed' | 'failed' | 'rejected';
    method: string;
    paymentMethod?: string;
    reference: string;
    timestamp?: any;
    date?: any;
    category?: string;
}

export interface MarketPrice {
    id: string;
    produce: string;
    price: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    location: string;
    updatedAt: any;
}

export interface InputItem {
    id: string;
    name: string;
    category: string;
    price: number;
    originalPrice?: number;
    unit: string;
    description?: string;
    stock: number;
    isActive: boolean;
}

export interface InputOrder {
    id: string;
    userId: string;
    userName: string;
    items: {
        id: string;
        name: string;
        quantity: number;
        price: number;
    }[];
    totalAmount: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    deliveryMethod: 'Pickup' | 'Delivery';
    location: string;
    phone: string;
    createdAt: any;
}

export interface LoanRecord {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    interestRate: number;
    durationMonths: number;
    status: 'pending' | 'active' | 'repaid' | 'overdue' | 'defaulted';
    repaidAmount: number;
    nextPaymentDate: any;
    creditScoreCurrent: number;
    createdAt: any;
}

export interface CommunityGroup {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    category: string;
    createdAt: any;
}

export interface LocalMarket {
    id: string;
    name: string;
    location: string;
    operatingDays: string;
    description: string;
    type?: string;
    memberCount?: number;
    createdAt?: any;
}
