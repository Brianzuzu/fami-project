import {
    doc,
    getDoc,
    writeBatch,
    serverTimestamp,
    increment,
    collection
} from "firebase/firestore";
import { db, auth } from "../app/firebaseConfig";

export interface InvestmentParams {
    poolId: string;
    amount: number;
    contractType: 'standard' | 'revenue';
    paymentMethod: string;
    paymentReference?: string;
}

/**
 * PROCESS INVESTMENT (Client-Side)
 * This is a simplified version of the cloud function that runs directly in the app.
 * It's faster and doesn't require the Cloud Functions Blaze plan.
 */
export const processLocalInvestment = async (params: InvestmentParams) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const { poolId, amount, contractType, paymentMethod, paymentReference = "" } = params;

    try {
        // 1. Get User Data
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error("User profile not found");
        const userData = userSnap.data();

        // 2. Get Pool Data
        let poolData: any = { name: "General Investment", duration: "6", standardROI: "10%" };
        let poolRef = null;

        if (poolId === "WALLET_TOPUP") {
            poolData = {
                name: "Fami Wallet Top-up",
                duration: "0",
                standardROI: "0%",
                category: "Wallet"
            };
        } else {
            poolRef = doc(db, "pools", poolId);
            const poolSnap = await getDoc(poolRef);
            if (!poolSnap.exists()) {
                console.warn("Pool not found, using placeholder data for ID:", poolId);
            } else {
                poolData = poolSnap.data();
            }
        }

        // 3. Validation
        if (paymentMethod === 'Wallet' && (userData.balance || 0) < amount) {
            throw new Error("Insufficient wallet balance");
        }

        // 4. Calculations
        const durationMonths = parseInt(poolData.duration) || 6;
        const maturityDate = new Date();
        maturityDate.setMonth(maturityDate.getMonth() + durationMonths);

        const roiString = contractType === 'standard' ? poolData.standardROI : (poolData.revenueROI || poolData.roi);
        const roiPercent = parseFloat(roiString?.replace('%', '') || '0') / 100;
        const expectedReturn = amount * (1 + roiPercent);

        // 5. Atomic Batch Write
        const batch = writeBatch(db);
        const isExternal = paymentMethod !== 'Wallet';
        const status = isExternal ? 'pending' : 'active';
        const transStatus = isExternal ? 'pending' : 'completed';

        // Transaction A: The Investment Entry
        const investmentRef = doc(collection(db, "investments"));
        batch.set(investmentRef, {
            uid: user.uid,
            investorName: userData.displayName || userData.username || 'Investor',
            poolId,
            poolName: poolData.name,
            amount,
            contractType,
            roi: roiString,
            duration: poolData.duration,
            paymentMethod,
            paymentReference,
            status,
            date: serverTimestamp(),
            maturityDate: maturityDate,
            expectedReturn,
        });

        // Transaction B: The Withdrawal/Record
        const transRef = doc(collection(db, "transactions"));
        batch.set(transRef, {
            uid: user.uid,
            userName: userData.displayName || userData.username || 'Investor',
            amount: amount.toString(),
            type: poolId === "WALLET_TOPUP" ? 'Deposit' : 'Withdrawal',
            category: poolId === "WALLET_TOPUP" ? 'Funding' : 'Investment',
            method: paymentMethod,
            description: poolId === "WALLET_TOPUP" ? "Wallet Top-up via M-Pesa" : `Investment in ${poolData.name}`,
            status: transStatus,
            date: serverTimestamp(),
            metadata: { poolId, investmentId: investmentRef.id, paymentReference }
        });

        // Update User Balance if Wallet
        if (!isExternal) {
            batch.update(userRef, {
                balance: increment(-amount),
                updatedAt: serverTimestamp()
            });
        }

        // Update Pool Funding (Skip for Wallet top-ups)
        if (poolRef) {
            batch.update(poolRef, {
                currentAmount: increment(amount),
                updatedAt: serverTimestamp()
            });
        }

        // Add Notification
        const notifRef = doc(collection(db, "notifications"));
        batch.set(notifRef, {
            uid: user.uid,
            title: isExternal ? 'Payment Submitted' : 'Investment Successful',
            body: isExternal
                ? `Your payment for ${poolData.name} is being verified.`
                : `You've invested KES ${amount.toLocaleString()} in ${poolData.name}`,
            type: 'investment',
            read: false,
            createdAt: serverTimestamp()
        });

        await batch.commit();
        return { success: true, message: "Investment processed successfully" };

    } catch (error: any) {
        console.error("Local Investment Error:", error);
        throw error;
    }
};
