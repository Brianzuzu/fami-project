import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { getAccessToken, getTimestamp } from './mpesaUtils';

export const initiateSTKPush = async (req: Request, res: Response) => {
    try {
        const { amount, phoneNumber, poolId, poolName, uid } = req.body;

        if (!amount || !phoneNumber || !poolId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Format phone number to 2547XXXXXXXX
        let formattedPhone = phoneNumber.replace('+', '').replace(/\s/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        }

        const accessToken = await getAccessToken();
        const timestamp = getTimestamp();
        const shortCode = process.env.MPESA_SHORTCODE || '174379';
        const passkey = process.env.MPESA_PASSKEY;
        const callbackUrl = `${process.env.APP_URL}/api/mpesa/callback`;

        if (!passkey) {
            return res.status(500).json({ error: 'M-Pesa Passkey not configured' });
        }

        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

        const stkResponse = await fetch(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    BusinessShortCode: shortCode,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: 'CustomerPayBillOnline',
                    Amount: Math.round(amount),
                    PartyA: formattedPhone,
                    PartyB: shortCode,
                    PhoneNumber: formattedPhone,
                    CallBackURL: callbackUrl,
                    AccountReference: poolName || 'FamiPool',
                    TransactionDesc: `Investment in ${poolName || 'Fami'}`,
                }),
            }
        );

        const data: any = await stkResponse.json();

        if (data.ResponseCode === '0') {
            // Store the request in Firestore to verify later
            await admin.firestore().collection('mpesa_requests').doc(data.CheckoutRequestID).set({
                uid,
                amount,
                phoneNumber: formattedPhone,
                poolId,
                poolName,
                status: 'pending',
                checkoutRequestID: data.CheckoutRequestID,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.json({
                success: true,
                checkoutRequestID: data.CheckoutRequestID,
                message: 'STK Push initiated. Please enter your PIN on your phone.',
            });
        } else {
            console.error('M-Pesa STK Error:', data);
            return res.status(400).json({ error: data.ResponseDescription || 'STK Push failed' });
        }
    } catch (error: any) {
        console.error('STK Push Catch Error:', error);
        return res.status(500).json({ error: error.message || 'Server error initiating payment' });
    }
};

export const handleMpesaCallback = async (req: Request, res: Response) => {
    try {
        const { Body } = req.body;
        const callbackData = Body.stkCallback;
        const checkoutRequestID = callbackData.CheckoutRequestID;
        const resultCode = callbackData.ResultCode;
        const resultDesc = callbackData.ResultDesc;

        console.log(`M-Pesa Callback received for ${checkoutRequestID}. ResultCode: ${resultCode}`);

        const db = admin.firestore();
        const requestRef = db.collection('mpesa_requests').doc(checkoutRequestID);
        const requestDoc = await requestRef.get();

        if (!requestDoc.exists) {
            return res.status(404).send('Request not found');
        }

        const requestData = requestDoc.data()!;

        if (resultCode === 0) {
            // Success!
            const metadata = callbackData.CallbackMetadata.Item;
            const amount = metadata.find((i: any) => i.Name === 'Amount').Value;
            const mpesaReceiptNumber = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber').Value;

            // 1. Mark request as successful
            await requestRef.update({
                status: 'completed',
                mpesaReceiptNumber,
                resultCode,
                resultDesc,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 2. Find and update the corresponding investment
            const investmentsRef = db.collection('investments');
            const investmentQuery = await investmentsRef
                .where('paymentReference', '==', checkoutRequestID)
                .limit(1)
                .get();

            if (!investmentQuery.empty) {
                const investmentDoc = investmentQuery.docs[0];
                await investmentDoc.ref.update({
                    status: 'active', // Mark it as active now that payment is confirmed
                    mpesaReceipt: mpesaReceiptNumber,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            // 3. Create a clean transaction record
            const txRef = db.collection('transactions').doc();
            await txRef.set({
                uid: requestData.uid,
                amount: amount.toString(),
                type: 'Deposit',
                category: 'Funding',
                method: 'M-Pesa',
                reference: mpesaReceiptNumber,
                description: `Investment in ${requestData.poolName}`,
                status: 'completed',
                date: admin.firestore.FieldValue.serverTimestamp(),
                metadata: {
                    poolId: requestData.poolId,
                    checkoutRequestID
                }
            });

            // 4. Send Success Notification
            await db.collection('notifications').add({
                uid: requestData.uid,
                title: 'Investment Active!',
                body: `Your payment of KES ${amount} for ${requestData.poolName} has been confirmed. Your investment is now active!`,
                type: 'investment',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } else {
            // Failed
            await requestRef.update({
                status: 'failed',
                resultCode,
                resultDesc,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('Callback Error:', error);
        return res.status(500).send('Error');
    }
};
