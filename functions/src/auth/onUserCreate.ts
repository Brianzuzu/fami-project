import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Triggered when a new user is created
 * Initializes user document in Firestore
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    try {
        const db = getFirestore();

        // Create user document
        await db.collection("users").doc(user.uid).set({
            uid: user.uid,
            email: user.email || '',
            username: user.displayName || user.email?.split('@')[0] || 'User',
            role: 'investor', // Default role
            phoneNumber: user.phoneNumber || '',
            balance: 0,
            kycStatus: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            metadata: {
                lastLogin: FieldValue.serverTimestamp(),
                deviceTokens: [],
            },
        });

        // Send welcome notification
        await db.collection("notifications").add({
            uid: user.uid,
            title: 'Welcome to Fami!',
            body: 'Start investing in agricultural pools and make an impact.',
            type: 'system',
            read: false,
            createdAt: FieldValue.serverTimestamp(),
        });

        console.log(`User profile created for ${user.uid}`);
    } catch (error) {
        console.error('Error creating user profile:', error);
    }
});
