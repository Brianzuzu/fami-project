import * as functions from "firebase-functions";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../utils/auth";
import { Loan, Transaction } from "../types";

/**
 * Process loan payout/approval (Admin only)
 * Input: { loanId: string, approved: boolean, reason?: string }
 */
export const processPayout = functions.https.onCall(async (data, context) => {
    // 1. Authenticate and authorize (must be an admin)
    const adminUid = await requireAdmin(context);

    const { loanId, approved, reason } = data;

    if (!loanId) {
        throw new functions.https.HttpsError("invalid-argument", "Loan ID is required.");
    }

    const db = getFirestore();

    try {
        // 2. Get loan record
        const loanRef = db.collection("loans").doc(loanId);
        const loanDoc = await loanRef.get();

        if (!loanDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Loan application not found.");
        }

        const loanData = loanDoc.data() as Loan;

        if (loanData.status !== 'Requested') {
            throw new functions.https.HttpsError(
                "failed-precondition",
                `Cannot process loan in status: ${loanData.status}`
            );
        }

        if (!approved) {
            // REJECT LOAN
            await loanRef.update({
                status: 'Rejected',
                'metadata.rejectionReason': reason || "Criteria not met",
                'metadata.adminUid': adminUid
            });

            // Log admin action
            await db.collection("admin_actions").add({
                adminUid,
                action: 'reject_loan',
                targetId: loanId,
                targetType: 'loan',
                reason: reason || "Criteria not met",
                timestamp: Timestamp.now(),
                metadata: { farmerId: loanData.uid }
            });

            // Notify farmer
            await db.collection("notifications").add({
                uid: loanData.uid,
                title: "Loan Request Rejected",
                body: `Your loan request for KES ${loanData.amount.toLocaleString()} was not approved. Reason: ${reason || "Criteria not met"}`,
                type: 'system',
                read: false,
                createdAt: Timestamp.now()
            });

            return { success: true, message: "Loan request rejected." };
        }

        // APPROVE AND DISBURSE LOAN
        // In a real app, this would trigger an M-Pesa B2C payout here.
        // For now, we simulate success and update balances.

        const batch = db.batch();

        // Update loan status
        batch.update(loanRef, {
            status: 'Active',
            approvedAt: Timestamp.now(),
            disbursedAt: Timestamp.now(),
            'metadata.adminUid': adminUid
        });

        // Update farmer balance (simulate payout)
        const farmerRef = db.collection("users").doc(loanData.uid);
        batch.update(farmerRef, {
            balance: FieldValue.increment(loanData.amount),
            updatedAt: Timestamp.now()
        });

        // Create transaction record
        const transRef = db.collection("transactions").doc();
        const transaction: Omit<Transaction, 'id'> = {
            uid: loanData.uid,
            amount: loanData.amount.toString(),
            type: 'Payout',
            category: 'Loan Disbursal',
            description: `Loan payout for ${loanData.purpose}`,
            status: 'completed',
            date: Timestamp.now(),
            metadata: {
                loanId: loanId,
                paymentMethod: 'Internal Wallet'
            }
        };
        batch.set(transRef, transaction);

        // Log admin action
        const actionRef = db.collection("admin_actions").doc();
        batch.set(actionRef, {
            adminUid,
            action: 'approve_loan',
            targetId: loanId,
            targetType: 'loan',
            timestamp: Timestamp.now(),
            metadata: { farmerId: loanData.uid, amount: loanData.amount }
        });

        // Notify farmer
        const notifyRef = db.collection("notifications").doc();
        batch.set(notifyRef, {
            uid: loanData.uid,
            title: "Loan Disbursed!",
            body: `Your loan of KES ${loanData.amount.toLocaleString()} has been approved and moved to your wallet.`,
            type: 'payout',
            read: false,
            createdAt: Timestamp.now(),
            data: { loanId }
        });

        await batch.commit();

        return {
            success: true,
            message: "Loan approved and funds disbursed successfully."
        };

    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) throw error;

        console.error("Error in processPayout:", error);
        throw new functions.https.HttpsError(
            "internal",
            "An error occurred while processing the loan payout."
        );
    }
});
