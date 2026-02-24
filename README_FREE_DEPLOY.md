# Fami 100% Free Backend Deployment

This guide explains how to deploy your backend for FREE without using the Firebase Blaze plan.

## Overview
Instead of Firebase Cloud Functions (which require a paid plan), we are using a standard **Node.js + Express** server. This server will run on a free platform like **Render** or **Railway** and connect to your **Free Firebase (Spark)** database.

## Prerequisites
1.  **Firebase Project**: You already have one (`fami-9b6bc`).
2.  **Service Account Key**:
    *   Go to [Firebase Console](https://console.firebase.google.com/)
    *   Project Overview > Project Settings > **Service Accounts**
    *   Click **Generate new private key**
    *   Save this JSON file securely. **DO NOT commit it to Git.**

## Local Setup
1.  Install dependencies:
    ```bash
    cd functions
    npm install
    ```
2.  Add your Service Account JSON file inside the `functions` folder (e.g., as `service-account.json`).
3.  Set the environment variable:
    *   Windows (PowerShell): `$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\fami-9b6bc-firebase-adminsdk.json"`
    *   Mac/Linux: `export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/fami-9b6bc-firebase-adminsdk.json"`
4.  Run the server:
    ```bash
    npm start
    ```
    Your server will now be running on `http://localhost:3000`.

## Deployment to Render (Recommended)
1.  **Create a GitHub Repository** for your project and push your code.
2.  Login to [Render.com](https://render.com/).
3.  Click **New +** > **Web Service**.
4.  Connect your GitHub repository.
5.  Set the following:
    *   **Root Directory**: `functions`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `node lib/server.js`
6.  Go to **Environment Variables**:
    *   Add `GOOGLE_APPLICATION_CREDENTIALS_JSON`: (Paste the entire content of your service-account JSON file here).
    *   *Note: Our server.ts will need a small update to handle this env var if you use the JSON string directly.*

## Updating the Client App
You need to change how the app calls the functions.

**Before (Mobile App):**
```typescript
const processInvestment = httpsCallable(functions, 'processInvestment');
const result = await processInvestment(data);
```

**After (Mobile App):**
```typescript
const response = await fetch('YOUR_SERVER_URL/api/investments/process', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.uid}` 
  },
  body: JSON.stringify(data)
});
const result = await response.json();
```

## Important Note
The `server.ts` I created uses a simple "trust" authentication where it takes the UID from the Bearer token. In production, you should update `server.ts` to verify the ID token using `admin.auth().verifyIdToken(token)`.
