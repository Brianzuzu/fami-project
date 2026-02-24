import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../utils/auth";

export const buyProduce = functions.https.onCall(async (data, context) => {
    // Admin or designated buyer app buys produce from farmer
    await requireAdmin(context);
    const db = getFirestore();

    const { listingId, price, buyerName = "Fami Admin" } = data;

    const listingRef = db.collection("marketplace").doc(listingId);
    const listingDoc = await listingRef.get();

    if (!listingDoc.exists) throw new functions.https.HttpsError("not-found", "Listing not found");
    const listingData = listingDoc.data();

    if (listingData?.status === "Sold") {
        throw new functions.https.HttpsError("failed-precondition", "Item already sold");
    }

    const batch = db.batch();

    // 1. Mark listing as sold
    batch.update(listingRef, {
        status: "Sold",
        paymentStatus: "Paid",
        updatedAt: FieldValue.serverTimestamp(),
        buyerId: "fami_admin",
        buyerName: buyerName
    });

    // 2. Notify farmer
    const farmerId = listingData?.farmerId;
    if (farmerId) {
        const notificationRef = db.collection("notifications").doc();
        batch.set(notificationRef, {
            uid: farmerId,
            title: "Produce Sold & Paid!",
            body: `Fami has sold your '${listingData?.name}' for KES ${price?.toLocaleString()}. Funds have been added to your wallet.`,
            type: "marketplace",
            read: false,
            createdAt: FieldValue.serverTimestamp(),
            data: { listingId }
        });

        // 3. Record income for farmer
        const recordRef = db.collection("farm_records").doc();
        batch.set(recordRef, {
            uid: farmerId,
            type: "Income",
            amount: parseFloat(price),
            category: "Sales",
            description: `Sold ${listingData?.name} via Fami Admin`,
            produce: listingData?.name,
            quantity: listingData?.quantity || "1 unit",
            source: "marketplace",
            date: FieldValue.serverTimestamp(),
            metadata: { listingId }
        });

        // 4. Update farmer balance (Disburse to wallet)
        const farmerRef = db.collection("users").doc(farmerId);
        batch.update(farmerRef, {
            balance: FieldValue.increment(parseFloat(price)),
            updatedAt: FieldValue.serverTimestamp()
        });
    }

    await batch.commit();

    return { success: true, message: "Produce purchase processed and farmer notified." };
});
