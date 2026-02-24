import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "../utils/auth";
import { notifyUser } from "../utils/notifications";

export const approveWithdrawal = functions.https.onCall(async (data, context) => {
    // 1. Authenticate Admin (Simplified for now - checking a 'role' in the user doc is better)
    const adminUid = requireAuth(context);
    const db = getFirestore();

    const { transactionId, action } = data; // action: 'approve' | 'reject'

    if (!transactionId || !['approve', 'reject'].includes(action)) {
        throw new functions.https.HttpsError("invalid-argument", "Transaction ID and valid action required");
    }

    const txRef = db.collection("transactions").doc(transactionId);
    const txDoc = await txRef.get();

    if (!txDoc.exists) throw new functions.https.HttpsError("not-found", "Transaction not found");
    const txData = txDoc.data();

    if (txData?.type !== 'Withdrawal' || txData?.status !== 'pending') {
        throw new functions.https.HttpsError("failed-precondition", "Transaction is not a pending withdrawal");
    }

    const { uid, amount, metadata } = txData;
    const investmentId = metadata?.investmentId;

    const batch = db.batch();

    if (action === 'approve') {
        // Mark transaction as completed
        batch.update(txRef, {
            status: 'completed',
            processedBy: adminUid,
            processedAt: FieldValue.serverTimestamp()
        });

        if (investmentId) {
            // Mark investment as withdrawn
            const invRef = db.collection("investments").doc(investmentId);
            batch.update(invRef, {
                status: 'withdrawn',
                updatedAt: FieldValue.serverTimestamp()
            });
        }

        // Notify user
        await notifyUser(
            uid,
            "Withdrawal Approved",
            `Your withdrawal of KES ${parseFloat(amount).toLocaleString()} has been approved and disbursed.`,
            "withdrawal_approved",
            { transactionId }
        );

    } else {
        // Reject - Mark transaction as rejected
        batch.update(txRef, {
            status: 'rejected',
            processedBy: adminUid,
            processedAt: FieldValue.serverTimestamp()
        });

        if (investmentId) {
            // Revert investment status
            const invRef = db.collection("investments").doc(investmentId);
            batch.update(invRef, {
                status: 'active', // Or whatever it was
                updatedAt: FieldValue.serverTimestamp()
            });
        } else {
            // Refund wallet balance if it was a balance withdrawal
            const userRef = db.collection("users").doc(uid);
            batch.update(userRef, {
                balance: FieldValue.increment(parseFloat(amount)),
                updatedAt: FieldValue.serverTimestamp()
            });
        }

        // Notify user
        await notifyUser(
            uid,
            "Withdrawal Rejected",
            `Your withdrawal request for KES ${parseFloat(amount).toLocaleString()} was rejected. Please contact support for details.`,
            "withdrawal_rejected",
            { transactionId }
        );
    }

    await batch.commit();

    return {
        success: true,
        message: `Withdrawal request successfully ${action}d.`
    };
});
