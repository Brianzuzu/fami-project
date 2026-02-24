import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../utils/auth";

interface ApprovalRequest {
    poolId: string;
    approved: boolean;
    reason?: string;
}

/**
 * Admin function to approve or reject pool applications
 */
export const approvePool = functions.https.onCall(
    async (data: ApprovalRequest, context) => {
        try {
            // 1. Verify admin role
            const adminUid = await requireAdmin(context);
            const db = getFirestore();

            const { poolId, approved, reason } = data;

            if (!poolId) {
                throw new Error("Pool ID is required");
            }

            // 2. Get pool data
            const poolRef = db.collection("pools").doc(poolId);
            const poolDoc = await poolRef.get();

            if (!poolDoc.exists) {
                throw new Error("Pool not found");
            }

            const poolData = poolDoc.data();
            if (!poolData) {
                throw new Error("Invalid pool data");
            }

            // 3. Update pool status
            const newStatus = approved ? 'active' : 'cancelled';
            const batch = db.batch();

            batch.update(poolRef, {
                status: newStatus,
                approvedBy: adminUid,
                approvalDate: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

            // 4. Log admin action
            const actionRef = db.collection("admin_actions").doc();
            batch.set(actionRef, {
                adminUid,
                action: approved ? 'approve_pool' : 'reject_pool',
                targetId: poolId,
                targetType: 'pool',
                reason: reason || '',
                timestamp: FieldValue.serverTimestamp(),
                metadata: {
                    poolName: poolData.name,
                    farmerId: poolData.farmerId,
                },
            });

            // 5. Notify farmer
            const notificationRef = db.collection("notifications").doc();
            batch.set(notificationRef, {
                uid: poolData.farmerId,
                title: approved ? 'Pool Approved!' : 'Pool Application Rejected',
                body: approved
                    ? `Your pool "${poolData.name}" has been approved and is now live.`
                    : `Your pool "${poolData.name}" was not approved. ${reason || ''}`,
                type: 'pool_update',
                read: false,
                data: {
                    poolId,
                    approved,
                },
                createdAt: FieldValue.serverTimestamp(),
            });

            await batch.commit();

            return {
                success: true,
                poolId,
                status: newStatus,
                message: `Pool ${approved ? 'approved' : 'rejected'} successfully`,
            };

        } catch (error: any) {
            console.error('Pool approval error:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to process pool approval'
            );
        }
    }
);
