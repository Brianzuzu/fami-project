import { CallableContext } from "firebase-functions/v1/https";
import { getFirestore } from "firebase-admin/firestore";
import { UserRole } from "../types";

/**
 * Verify that the user is authenticated
 */
export function requireAuth(context: CallableContext): string {
    if (!context.auth) {
        throw new Error("Unauthenticated. Please sign in to continue.");
    }
    return context.auth.uid;
}

/**
 * Verify that the user has a specific role
 */
export async function requireRole(
    context: CallableContext,
    requiredRole: UserRole
): Promise<string> {
    const uid = requireAuth(context);

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
        throw new Error("User profile not found.");
    }

    const userData = userDoc.data();
    if (userData?.role !== requiredRole) {
        throw new Error(`Access denied. ${requiredRole} role required.`);
    }

    return uid;
}

/**
 * Verify that the user is an admin
 */
export async function requireAdmin(context: CallableContext): Promise<string> {
    return requireRole(context, 'admin');
}

/**
 * Verify that the user is a farmer
 */
export async function requireFarmer(context: CallableContext): Promise<string> {
    return requireRole(context, 'farmer');
}

/**
 * Get user role
 */
export async function getUserRole(uid: string): Promise<UserRole> {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
        throw new Error("User not found.");
    }

    return userDoc.data()?.role as UserRole;
}
