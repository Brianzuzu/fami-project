import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "../utils/auth";
import { validateInvestmentData } from "../utils/validators";

interface InvestmentRequest {
    poolId: string;
    amount: number;
    contractType: 'standard' | 'revenue';
    paymentMethod?: string;
    paymentReference?: string;
}

/**
 * Process investment in a farming pool
 * Validates balance, creates investment record, updates pool funding
 */
export const processInvestment = functions.https.onCall(
    async (data: InvestmentRequest, context) => {
        try {
            // 1. Authenticate user
            const uid = requireAuth(context);
            const db = getFirestore();

            // 2. Validate input
            const validation = validateInvestmentData(data);
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            const { poolId, amount, contractType, paymentMethod = 'Wallet', paymentReference = '' } = data;

            // 3. Get user data
            const userRef = db.collection("users").doc(uid);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new Error("User profile not found");
            }

            const userData = userDoc.data();
            if (!userData) {
                throw new Error("Invalid user data");
            }

            // Check balance only if paying with Wallet
            if (paymentMethod === 'Wallet' && userData.balance < amount) {
                throw new Error("Insufficient wallet balance");
            }

            // 4. Get pool data and validate
            const poolRef = db.collection("pools").doc(poolId);
            const poolDoc = await poolRef.get();

            if (!poolDoc.exists) {
                throw new Error("Pool not found");
            }

            const poolData = poolDoc.data();
            if (!poolData) {
                throw new Error("Invalid pool data");
            }

            if (poolData.status !== 'active') {
                throw new Error("Pool is not accepting investments");
            }

            // 5. Calculate maturity date
            const durationMonths = parseInt(poolData.duration) || 6;
            const maturityDate = new Date();
            maturityDate.setMonth(maturityDate.getMonth() + durationMonths);

            // 6. Calculate expected return
            const roiString = contractType === 'standard' ?
                poolData.standardROI :
                (poolData.revenueROI || poolData.roi);
            const roiPercent = parseFloat(roiString?.replace('%', '') || '0') / 100;
            const expectedReturn = amount * (1 + roiPercent);

            // 7. Use a batch write for atomicity
            const batch = db.batch();

            // Status determination
            const isExternal = paymentMethod !== 'Wallet';
            const investmentStatus = isExternal ? 'pending' : 'active';
            const transactionStatus = isExternal ? 'pending' : 'completed';

            // If external payment (M-Pesa/Bank), record the Deposit to Wallet first
            if (isExternal) {
                const depositRef = db.collection("transactions").doc();
                batch.set(depositRef, {
                    uid,
                    userName: userData.displayName || userData.username || 'Investor',
                    amount: amount.toString(),
                    type: 'Deposit',
                    category: 'Funding',
                    method: paymentMethod,
                    reference: paymentReference,
                    description: `External funding for investment in ${poolData.name}`,
                    status: transactionStatus,
                    date: FieldValue.serverTimestamp(),
                });
            } else {
                // If using existing wallet balance, decrement it
                batch.update(userRef, {
                    balance: FieldValue.increment(-amount),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }

            // Create investment record
            const investmentRef = db.collection("investments").doc();
            batch.set(investmentRef, {
                uid,
                investorName: userData.displayName || userData.username || 'Investor',
                poolId,
                poolName: poolData.name,
                amount,
                contractType,
                roi: roiString,
                duration: poolData.duration,
                paymentMethod: paymentMethod,
                paymentReference: paymentReference,
                status: investmentStatus,
                date: FieldValue.serverTimestamp(),
                maturityDate: maturityDate,
                expectedReturn,
            });

            // Create investment transaction record (Withdrawal/Investment)
            const transactionRef = db.collection("transactions").doc();
            batch.set(transactionRef, {
                uid,
                userName: userData.displayName || userData.username || 'Investor',
                amount: amount.toString(),
                type: 'Withdrawal',
                category: 'Investment',
                method: paymentMethod,
                description: `Investment in ${poolData.name}`,
                status: transactionStatus,
                date: FieldValue.serverTimestamp(),
                metadata: {
                    poolId,
                    investmentId: investmentRef.id,
                    paymentReference: paymentReference
                },
            });

            // Update pool funding
            const currentFunded = parseInt(poolData.funded?.replace('%', '') || '0');
            const newFunded = Math.min(currentFunded + 5, 100); // Mock funding progress increment
            batch.update(poolRef, {
                funded: `${newFunded}%`,
                currentAmount: FieldValue.increment(amount),
                updatedAt: FieldValue.serverTimestamp(),
            });

            // Create notification
            const notificationRef = db.collection("notifications").doc();
            batch.set(notificationRef, {
                uid,
                title: 'Investment Successful',
                body: `You've invested KES ${amount.toLocaleString()} in ${poolData.name}`,
                type: 'investment',
                read: false,
                data: {
                    poolId,
                    investmentId: investmentRef.id,
                },
                createdAt: FieldValue.serverTimestamp(),
            });

            // Commit the batch
            await batch.commit();

            return {
                success: true,
                investmentId: investmentRef.id,
                transactionId: transactionRef.id,
                newBalance: paymentMethod === 'Wallet' ? userData.balance - amount : userData.balance,
                message: 'Investment processed successfully',
            };

        } catch (error: any) {
            console.error('Investment processing error:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to process investment'
            );
        }
    }
);
