import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Send a notification to a specific user
 */
export async function notifyUser(uid: string, title: string, body: string, type: string = 'system', data: any = {}) {
    const db = getFirestore();
    await db.collection("notifications").add({
        uid,
        title,
        body,
        type,
        data,
        read: false,
        createdAt: FieldValue.serverTimestamp()
    });
}

/**
 * Send a notification to all admins
 */
export async function notifyAdmin(title: string, body: string, type: string = 'admin_alert', data: any = {}) {
    const db = getFirestore();
    // In a real system, you might send emails or post to a specific 'admin_tasks' collection
    await db.collection("admin_notifications").add({
        title,
        body,
        type,
        data,
        read: false,
        createdAt: FieldValue.serverTimestamp()
    });
}
