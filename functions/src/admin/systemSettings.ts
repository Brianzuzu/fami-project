import * as functions from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdmin } from "../utils/auth";

export const updateSystemSettings = functions.https.onCall(async (data, context) => {
    await requireAdmin(context);
    const db = getFirestore();

    const {
        investorDefaultInterest,
        famiLoanProfitMargin,
        famiInvestmentFee,
        famiServiceMarkup
    } = data;

    const settingsRef = db.collection("system").doc("settings");
    await settingsRef.set({
        investorDefaultInterest: investorDefaultInterest || 0.12,
        famiLoanProfitMargin: famiLoanProfitMargin || 0.05,
        famiInvestmentFee: famiInvestmentFee || 0.02,
        famiServiceMarkup: famiServiceMarkup || 0.1,
        updatedAt: new Date(),
        updatedBy: context.auth?.uid
    }, { merge: true });

    return { success: true };
});

export const getSystemSettings = functions.https.onCall(async (data, context) => {
    const db = getFirestore();
    const settingsDoc = await db.collection("system").doc("settings").get();

    if (!settingsDoc.exists) {
        return {
            investorDefaultInterest: 0.12,
            famiLoanProfitMargin: 0.05,
            famiInvestmentFee: 0.02,
            famiServiceMarkup: 0.1
        };
    }

    return settingsDoc.data();
});
