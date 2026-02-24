import * as functions from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdmin } from "../utils/auth";

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = functions.https.onCall(
    async (data, context) => {
        try {
            // Verify admin role
            await requireAdmin(context);
            const db = getFirestore();

            // Get counts from collections
            const [
                usersSnapshot,
                poolsSnapshot,
                investmentsSnapshot,
                transactionsSnapshot,
            ] = await Promise.all([
                db.collection("users").get(),
                db.collection("pools").get(),
                db.collection("investments").get(),
                db.collection("transactions").get(),
            ]);

            // Calculate user role breakdown
            let investors = 0;
            let farmers = 0;
            let admins = 0;
            let pendingKYC = 0;

            usersSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.role === 'investor') investors++;
                if (data.role === 'farmer') farmers++;
                if (data.role === 'admin') admins++;
                if (data.kycStatus === 'pending') pendingKYC++;
            });

            // Calculate pool status breakdown
            let activePools = 0;
            let pendingPools = 0;
            let completedPools = 0;

            poolsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === 'active') activePools++;
                if (data.status === 'draft') pendingPools++;
                if (data.status === 'completed') completedPools++;
            });

            // Calculate investment metrics
            let totalInvestmentVolume = 0;
            let activeInvestments = 0;

            investmentsSnapshot.forEach((doc) => {
                const data = doc.data();
                totalInvestmentVolume += data.amount || 0;
                if (data.status === 'active') activeInvestments++;
            });

            // Calculate transaction metrics
            let totalTransactionVolume = 0;
            let pendingTransactions = 0;

            transactionsSnapshot.forEach((doc) => {
                const data = doc.data();
                totalTransactionVolume += parseFloat(data.amount || '0');
                if (data.status === 'pending') pendingTransactions++;
            });

            // Get recent activity (last 10 admin actions)
            const recentActionsSnapshot = await db
                .collection("admin_actions")
                .orderBy("timestamp", "desc")
                .limit(10)
                .get();

            const recentActivity = recentActionsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                stats: {
                    users: {
                        total: usersSnapshot.size,
                        investors,
                        farmers,
                        admins,
                        pendingKYC,
                    },
                    pools: {
                        total: poolsSnapshot.size,
                        active: activePools,
                        pending: pendingPools,
                        completed: completedPools,
                    },
                    investments: {
                        total: investmentsSnapshot.size,
                        active: activeInvestments,
                        totalVolume: totalInvestmentVolume,
                    },
                    transactions: {
                        total: transactionsSnapshot.size,
                        pending: pendingTransactions,
                        totalVolume: totalTransactionVolume,
                    },
                },
                recentActivity,
            };

        } catch (error: any) {
            console.error('Dashboard stats error:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to fetch dashboard statistics'
            );
        }
    }
);
