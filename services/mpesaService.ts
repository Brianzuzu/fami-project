import { auth } from '../app/firebaseConfig';
import { Platform } from 'react-native';

const BACKEND_URL = 'https://fami-project.onrender.com';

/**
 * Initiates an M-Pesa STK Push
 */
export async function initiateSTKPush(phoneNumber: string, amount: number, poolId: string, poolName: string) {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required");

    const token = await user.getIdToken();

    const response = await fetch(`${BACKEND_URL}/api/mpesa/stk-push`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            phoneNumber,
            amount,
            poolId,
            poolName,
            uid: user.uid
        })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'M-Pesa request failed');
    }

    return result;
}
