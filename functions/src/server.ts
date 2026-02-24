import express from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Import logic from existing functions
import { processInvestment } from './investments/processInvestment';
import { approvePool } from './pools/approvePool';
import { getDashboardStats } from './admin/getDashboardStats';
import { requestLoan } from './loans/requestLoan';
import { processPayout } from './loans/processPayout';
import { updateSystemSettings, getSystemSettings } from './admin/systemSettings';
import { requestWithdrawal } from './investments/requestWithdrawal';
import { buyProduce } from './marketplace/buyProduce';
import { createMarketAccessPlan } from './marketplace/marketAccess';
import { approveWithdrawal } from './admin/processWithdrawal';
import { initiateSTKPush, handleMpesaCallback } from './mpesa/mpesaController';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Firebase Admin Initialization ───────────────────────────────────────────
// Priority:
//   1. functions/serviceAccountKey.json  (local dev — download from Firebase Console)
//   2. GOOGLE_APPLICATION_CREDENTIALS_JSON env var (Render / CI)
//   3. Application Default Credentials (gcloud auth / Cloud Run)
// ─────────────────────────────────────────────────────────────────────────────
if (!admin.apps.length) {
    const keyFilePath = path.join(__dirname, '..', 'serviceAccountKey.json');

    if (fs.existsSync(keyFilePath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
        console.log('✅ Firebase Admin: loaded from serviceAccountKey.json');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
        console.log('✅ Firebase Admin: loaded from GOOGLE_APPLICATION_CREDENTIALS_JSON env var');
    } else {
        // Last resort — requires `gcloud auth application-default login`
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'fami-9b6bc'
        });
        console.warn('⚠️  Firebase Admin: using application-default credentials.');
        console.warn('   For local dev, place serviceAccountKey.json in functions/');
        console.warn('   Download it from Firebase Console → Project Settings → Service Accounts');
    }
    admin.firestore().settings({ ignoreUndefinedProperties: true });
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
// Verifies the Firebase ID token sent by the client as a Bearer token.
// Sets req.uid so routes can use it.
// ─────────────────────────────────────────────────────────────────────────────
const verifyToken = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: no token provided' });
        return;
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        (req as any).uid = decoded.uid;
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        res.status(401).json({ error: 'Unauthorized: invalid token' });
    }
};

// M-Pesa Callback (MUST BE PUBLIC)
app.post('/api/mpesa/callback', handleMpesaCallback);

// Apply token verification to all /api routes
app.use('/api', verifyToken);
app.post('/api/mpesa/stk-push', initiateSTKPush);


// Helper to convert Firebase https.onCall functions into Express route handlers.
// Uses the uid already verified by the verifyToken middleware.
const wrapFunction = (fn: any) => {
    return async (req: express.Request, res: express.Response) => {
        try {
            const uid = (req as any).uid;
            const context = { auth: uid ? { uid } : undefined };
            const result = await fn.run(req.body, context);
            res.json(result);
        } catch (error: any) {
            console.error('Route error:', error.message || error);
            const status = error.code === 'unauthenticated' ? 401
                : error.code === 'permission-denied' ? 403
                    : error.code === 'not-found' ? 404
                        : error.code === 'failed-precondition' ? 422
                            : 500;
            res.status(status).json({ error: error.message || 'Internal Server Error' });
        }
    };
};

// Routes
app.post('/api/investments/process', wrapFunction(processInvestment));
app.post('/api/pools/approve', wrapFunction(approvePool));
app.post('/api/admin/stats', wrapFunction(getDashboardStats));
app.post('/api/loans/request', wrapFunction(requestLoan));
app.post('/api/loans/payout', wrapFunction(processPayout));

// System Settings & Advanced Admin
app.post('/api/admin/settings/update', wrapFunction(updateSystemSettings));
app.get('/api/admin/settings', wrapFunction(getSystemSettings));

// Investments & Withdrawals
app.post('/api/investments/withdrawal-request', wrapFunction(requestWithdrawal));

// Marketplace & Farmer Services
app.post('/api/marketplace/buy', wrapFunction(buyProduce));
app.post('/api/marketplace/market-access', wrapFunction(createMarketAccessPlan));
app.post('/api/admin/withdrawals/approve', wrapFunction(approveWithdrawal));

// Health check
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
