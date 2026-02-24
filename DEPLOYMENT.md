# Backend Deployment Guide

## Prerequisites

Before deploying the backend, ensure you have:

1. **Node.js 18+** installed
2. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```
3. **Firebase Project** created at [console.firebase.google.com](https://console.firebase.google.com)

## Step 1: Firebase Login

```bash
firebase login
```

## Step 2: Initialize Firebase (if not already done)

In your project root (`c:/Users/Brian/Desktop/Fami`):

```bash
firebase init
```

Select:
- ✅ Functions
- ✅ Firestore
- Choose your existing Firebase project
- Use TypeScript for Functions
- Use default options for other prompts

## Step 3: Install Dependencies

### Option A: If PowerShell execution policy allows
```bash
cd functions
npm install
```

### Option B: If you get execution policy error
Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try again:
```bash
cd functions
npm install
```

### Option C: Use Command Prompt instead
Open Command Prompt (cmd) and run:
```cmd
cd c:\Users\Brian\Desktop\Fami\functions
npm install
```

## Step 4: Build Functions

```bash
npm run build
```

## Step 5: Deploy to Firebase

### Deploy Everything
```bash
firebase deploy
```

### Deploy Only Functions
```bash
firebase deploy --only functions
```

### Deploy Only Security Rules
```bash
firebase deploy --only firestore:rules
```

## Step 6: Verify Deployment

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Functions** section
4. You should see:
   - `onUserCreate`
   - `processInvestment`
   - `approvePool`
   - `getDashboardStats`

## Step 7: Test Functions Locally (Optional)

Before deploying, you can test locally:

```bash
# Start Firebase emulators
firebase emulators:start
```

This will start:
- Functions emulator on http://localhost:5001
- Firestore emulator on http://localhost:8080

## Step 8: Update Client App

The client app (`ConfirmPay.tsx`) has been updated to use Cloud Functions. No additional changes needed.

## Troubleshooting

### Issue: "npm command not found"
**Solution**: Ensure Node.js is installed and added to PATH

### Issue: "Firebase command not found"
**Solution**: Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

### Issue: "Permission denied" errors
**Solution**: Run terminal as Administrator

### Issue: Functions not deploying
**Solution**: Check that you're in the correct directory and Firebase project is initialized

## Next Steps After Deployment

1. **Create Admin User**: Manually set a user's role to 'admin' in Firestore
2. **Test Investment Flow**: Try investing in a pool from the mobile app
3. **Monitor Logs**: Use `firebase functions:log` to view function execution logs
4. **Set up Billing**: Enable Blaze plan for production use (required for Cloud Functions)

## Important Notes

- ⚠️ Cloud Functions require Firebase **Blaze (Pay as you go)** plan
- 🔒 Security rules will prevent direct database writes once deployed
- 📊 All critical operations must go through Cloud Functions
- 🔔 Users will receive notifications automatically

## Manual Steps Required

### 1. Create First Admin User
After deployment, manually update a user document in Firestore:

```javascript
// In Firebase Console > Firestore
users/{userId}
  role: "admin"  // Change from "investor" to "admin"
```

### 2. Add User Balance (for testing)
```javascript
users/{userId}
  balance: 50000  // Add test balance
```

## Cost Estimation

Firebase Cloud Functions pricing (Blaze plan):
- First 2 million invocations/month: **FREE**
- Additional invocations: $0.40 per million
- Typical monthly cost for small app: **$0-5**

## Support

If you encounter issues during deployment, check:
1. Firebase Console for error messages
2. Function logs: `firebase functions:log`
3. Ensure all dependencies are installed
