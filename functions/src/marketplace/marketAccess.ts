import * as functions from "firebase-functions";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireAuth } from "../utils/auth";

export const createMarketAccessPlan = functions.https.onCall(async (data, context) => {
    // Farmer pays for market access (payment plan)
    const uid = requireAuth(context);
    const db = getFirestore();

    const { planId, amount, durationMonths } = data;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (userData?.balance < amount) {
        throw new functions.https.HttpsError("failed-precondition", "Insufficient balance to activate market access plan");
    }

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (durationMonths || 1));

    const batch = db.batch();

    // Deduct balance
    batch.update(userRef, {
        balance: FieldValue.increment(-amount),
        marketAccessStatus: "active",
        marketAccessExpiry: Timestamp.fromDate(expiryDate),
        updatedAt: FieldValue.serverTimestamp()
    });

    // Record expense
    const recordRef = db.collection("farm_records").doc();
    batch.set(recordRef, {
        uid,
        type: "Expense",
        amount,
        category: "Marketing",
        description: `Market Access Plan: ${planId}`,
        date: FieldValue.serverTimestamp(),
    });

    // Transaction record
    const txRef = db.collection("transactions").doc();
    batch.set(txRef, {
        uid,
        userName: userData?.username || "Farmer",
        amount,
        type: "Withdrawal",
        category: "Service",
        method: "Wallet",
        description: `Market Access Fee - ${planId}`,
        status: "completed",
        date: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return { success: true, message: "Market access plan activated successfully." };
});
