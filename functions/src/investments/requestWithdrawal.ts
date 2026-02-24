import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "../utils/auth";
import { notifyUser, notifyAdmin } from "../utils/notifications";

export const requestWithdrawal = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const db = getFirestore();

    const { amount, method, details, investmentId } = data;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) throw new functions.https.HttpsError("not-found", "User not found");
    const userData = userDoc.data();

    let withdrawalAmount = amount;
    let poolInfo = null;

    // 1. If investmentId is provided, validate maturity
    if (investmentId) {
        const invRef = db.collection("investments").doc(investmentId);
        const invDoc = await invRef.get();

        if (!invDoc.exists) throw new functions.https.HttpsError("not-found", "Investment not found");
        const invData = invDoc.data();

        if (invData?.uid !== uid) {
            throw new functions.https.HttpsError("permission-denied", "Unauthorized access to investment");
        }

        if (invData?.status === 'withdrawn' || invData?.status === 'liquidated') {
            throw new functions.https.HttpsError("failed-precondition", "Investment already withdrawn");
        }

        // Check maturity
        const maturityDate = invData?.maturityDate?.toDate();
        const now = new Date();
        if (maturityDate && maturityDate > now) {
            const diffDays = Math.ceil((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            throw new functions.https.HttpsError("failed-precondition", `This investment matures in ${diffDays} days on ${maturityDate.toLocaleDateString()}.`);
        }

        withdrawalAmount = invData?.expectedReturn || invData?.amount;
        poolInfo = {
            investmentId,
            poolId: invData?.poolId,
            poolName: invData?.poolName
        };
    } else {
        // Regular withdrawal from balance
        if (!amount || amount <= 0) {
            throw new functions.https.HttpsError("invalid-argument", "Amount must be greater than zero");
        }
        if (userData?.balance < amount) {
            throw new functions.https.HttpsError("failed-precondition", "Insufficient balance");
        }
    }

    const batch = db.batch();

    // Create withdrawal transaction
    const txRef = db.collection("transactions").doc();
    batch.set(txRef, {
        uid,
        userName: userData?.displayName || userData?.username || "Investor",
        amount: withdrawalAmount,
        type: "Withdrawal",
        category: investmentId ? "Pool Payout" : "Cashout",
        method: method || "M-Pesa",
        status: "pending",
        date: FieldValue.serverTimestamp(),
        details: details || {},
        metadata: {
            investmentId: investmentId || null,
            poolName: poolInfo?.poolName || null
        }
    });

    // If it's a balance withdrawal, lock the funds
    if (!investmentId) {
        batch.update(userRef, {
            balance: FieldValue.increment(-withdrawalAmount),
            updatedAt: FieldValue.serverTimestamp(),
        });
    } else {
        // Mark investment as pending withdrawal
        const invRef = db.collection("investments").doc(investmentId);
        batch.update(invRef, {
            status: 'pending_withdrawal',
            updatedAt: FieldValue.serverTimestamp()
        });
    }

    await batch.commit();

    // 2. Notify Investor
    await notifyUser(
        uid,
        "Withdrawal Request Received",
        `Your request to withdraw KES ${withdrawalAmount.toLocaleString()} is being processed. Please await approval by Fami(admin).`,
        "withdrawal",
        { transactionId: txRef.id, investmentId }
    );

    // 3. Notify Admin
    await notifyAdmin(
        "New Withdrawal Request",
        `${userData?.username || 'User'} requested a withdrawal of KES ${withdrawalAmount.toLocaleString()}${investmentId ? ` from pool ${poolInfo?.poolName}` : ''}.`,
        "withdrawal_pending",
        { transactionId: txRef.id, uid, investmentId }
    );

    return {
        success: true,
        transactionId: txRef.id,
        message: "Your withdrawal request has been submitted. Please await approval by Fami(admin)."
    };
});
