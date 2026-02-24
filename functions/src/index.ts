import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Export all cloud functions
export { onUserCreate } from "./auth/onUserCreate";
export { processInvestment } from "./investments/processInvestment";
export { approvePool } from "./pools/approvePool";
export { getDashboardStats } from "./admin/getDashboardStats";
export { requestLoan } from "./loans/requestLoan";
export { processPayout } from "./loans/processPayout";
