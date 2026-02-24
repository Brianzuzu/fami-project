import * as functions from "firebase-functions";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireFarmer } from "../utils/auth";
import { validateLoanData } from "../utils/validators";
import { Loan } from "../types";

/**
 * Request a loan (Farmer only)
 * Input: { amount: number, purpose: string, description: string, terms?: string }
 */
export const requestLoan = functions.https.onCall(async (data, context) => {
    // 1. Authenticate and authorize (must be a farmer)
    const uid = await requireFarmer(context);

    // 2. Validate input
    const { valid, errors } = validateLoanData(data);
    if (!valid) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            errors.join(", ")
        );
    }

    const { amount, purpose, description, terms = "Standard Fami loan terms apply." } = data;
    const db = getFirestore();

    try {
        // 3. Get farmer's current profile for trust score calculation or verification
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();

        if (userData?.kycStatus !== 'verified') {
            throw new functions.https.HttpsError(
                "failed-precondition",
                "Your account must be KYC verified to request a loan."
            );
        }

        // 4. Create loan application
        const loanRef = db.collection("loans").doc();
        const loan: Omit<Loan, 'id'> = {
            uid,
            farmerName: userData?.username || "Farmer",
            amount,
            purpose,
            description,
            status: 'Requested',
            requestedAt: Timestamp.now(),
            repaidAmount: 0,
            balance: amount,
            interestRate: 0.1, // 10% default interest
            terms,
            metadata: {
                trustScoreAtRequest: userData?.trustScore || 0,
            }
        };

        await loanRef.set(loan);

        // 5. Create notification for admins (optional, but good for internal logging)
        await db.collection("notifications").add({
            title: "New Loan Request",
            body: `${loan.farmerName} has requested a loan of KES ${amount.toLocaleString()}`,
            type: 'system',
            uid: 'admin', // Flag for admin dashboard
            read: false,
            createdAt: Timestamp.now(),
            data: {
                loanId: loanRef.id,
                farmerId: uid
            }
        });

        return {
            success: true,
            loanId: loanRef.id,
            message: "Loan request submitted successfully and is pending review."
        };

    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) throw error;

        console.error("Error in requestLoan:", error);
        throw new functions.https.HttpsError(
            "internal",
            "An error occurred while processing your loan request."
        );
    }
});
