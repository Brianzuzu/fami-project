import { db } from '../app/firebaseConfig';
import {
    collection, query, where, getDocs,
    doc, getDoc, updateDoc, setDoc, Timestamp
} from 'firebase/firestore';

export interface TrustScore {
    overall: number;
    bank: number;
    mpesa: number;
    fami: number;
    level: string;
}

/**
 * Calculates the trust score from the farmer's farm_records activity,
 * then SAVES it to the user's Firestore document as `pendingTrustScore`.
 * The admin must grant it before it becomes visible in the app.
 */
export const calculateAndSaveTrustScore = async (userId: string): Promise<TrustScore> => {
    try {
        // 1. Fetch farm activity records
        const recordsRef = collection(db, 'farm_records');
        const q = query(recordsRef, where('uid', '==', userId));
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(d => d.data());

        // 2. Score components
        const manualRecords = records.filter(r => r.source === 'manual').length;
        const marketplaceSales = records.filter(r => r.source === 'marketplace').length;
        const shopPurchases = records.filter(r => r.source === 'shop').length;

        // All farm_records without a source field also count as manual entries
        const loggedRecords = records.length;

        const baseScore = 300;
        const recordPoints = Math.min((manualRecords + loggedRecords) * 5, 200);
        const commercePoints = Math.min((marketplaceSales + shopPurchases) * 20, 300);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentRecords = records.filter(r => r.date?.toDate?.() > thirtyDaysAgo).length;
        const consistencyPoints = Math.min(recentRecords * 15, 100);

        const overall = baseScore + recordPoints + commercePoints + consistencyPoints;
        const bankScore = Math.floor(overall * 0.85);
        const mpesaScore = Math.floor(overall * 0.92);
        const famiScore = overall;

        let level = 'Bronze Mkulima';
        if (overall > 800) level = 'Platinum Mkulima';
        else if (overall > 650) level = 'Gold Mkulima';
        else if (overall > 500) level = 'Silver Mkulima';

        const computed: TrustScore = { overall, bank: bankScore, mpesa: mpesaScore, fami: famiScore, level };

        // 3. Check if admin has already granted a score — don't overwrite granted status
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        // Save/refresh pending score for admin review.
        // Only update status to 'pending' if not already 'granted'.
        const prevStatus = userData.trustScoreStatus;
        await updateDoc(userRef, {
            pendingTrustScore: computed,
            pendingUpdatedAt: Timestamp.now(),
            // Mark as pending review only if not already granted
            ...(prevStatus !== 'granted' ? { trustScoreStatus: 'pending' } : {}),
        });

        return computed;
    } catch (error) {
        console.error('Error calculating trust score:', error);
        return { overall: 300, bank: 255, mpesa: 276, fami: 300, level: 'Bronze Mkulima' };
    }
};

/** @deprecated Use calculateAndSaveTrustScore. Kept for any legacy callers. */
export const calculateTrustScore = calculateAndSaveTrustScore;

export type { TrustScore as default };
