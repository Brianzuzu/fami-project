# Fami Backend - Firebase Cloud Functions

This directory contains the Firebase Cloud Functions backend for the Fami agricultural investment platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project configured

### Installation

```bash
cd functions
npm install
```

### Development

```bash
# Build TypeScript
npm run build

# Run functions locally with emulators
npm run serve

# Deploy to Firebase
npm run deploy
```

## 📁 Project Structure

```
functions/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── utils/
│   │   ├── auth.ts           # Authentication helpers
│   │   └── validators.ts     # Input validation
│   ├── auth/
│   │   └── onUserCreate.ts   # User creation trigger
│   ├── investments/
│   │   └── processInvestment.ts  # Investment processing
│   ├── pools/
│   │   └── approvePool.ts    # Pool approval (admin)
│   └── admin/
│       └── getDashboardStats.ts  # Dashboard stats
├── package.json
└── tsconfig.json
```

## 🔧 Available Functions

### Authentication Triggers

#### `onUserCreate`
- **Type**: Auth Trigger
- **Description**: Automatically creates user profile when new user signs up
- **Actions**: 
  - Creates user document in Firestore
  - Sets default role and balance
  - Sends welcome notification

### Callable Functions

#### `processInvestment`
- **Type**: HTTPS Callable
- **Auth**: Required (Investor)
- **Input**: `{ poolId, amount, contractType }`
- **Description**: Processes investment in a farming pool
- **Actions**:
  - Validates user balance
  - Creates investment record
  - Updates pool funding
  - Creates transaction record
  - Sends notification

#### `approvePool`
- **Type**: HTTPS Callable
- **Auth**: Required (Admin only)
- **Input**: `{ poolId, approved, reason }`
- **Description**: Approves or rejects pool applications
- **Actions**:
  - Updates pool status
  - Logs admin action
  - Notifies farmer

#### `getDashboardStats`
- **Type**: HTTPS Callable
- **Auth**: Required (Admin only)
- **Description**: Aggregates dashboard statistics
- **Returns**:
  - User counts by role
  - Pool statistics
  - Investment metrics
  - Recent admin activity

## 🔐 Security

### Firestore Security Rules
Located in `../firestore.rules`

**Key Rules**:
- Users can read all user profiles but only update their own
- Only active pools are visible to investors
- Farmers can create pools (status: draft)
- Admins can approve/reject pools
- Investments and transactions are read-only (managed by Cloud Functions)

### Role-Based Access Control

**Roles**:
- `investor`: Can invest in pools, view own investments
- `farmer`: Can create and manage pools
- `admin`: Full access, can approve pools and verify users

## 📊 Database Collections

### `users`
User profiles with role, balance, and KYC status

### `pools`
Farming investment pools with status workflow

### `investments`
User investments in pools (managed by Cloud Functions)

### `transactions`
Financial transaction history (managed by Cloud Functions)

### `admin_actions`
Audit log of admin actions

### `notifications`
User notifications

### `analytics`
Daily aggregated statistics

## 🧪 Testing

```bash
# Run tests
npm test

# Test with emulators
firebase emulators:start
```

## 📝 Client Integration

### Example: Process Investment

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const processInvestment = httpsCallable(functions, 'processInvestment');

const result = await processInvestment({
  poolId: 'pool123',
  amount: 10000,
  contractType: 'standard'
});

console.log(result.data); // { success: true, investmentId: '...', ... }
```

### Example: Get Dashboard Stats (Admin)

```typescript
const getDashboardStats = httpsCallable(functions, 'getDashboardStats');

const result = await getDashboardStats();
console.log(result.data.stats); // { users: {...}, pools: {...}, ... }
```

## 🚨 Error Handling

All callable functions throw `HttpsError` with appropriate codes:
- `unauthenticated`: User not signed in
- `permission-denied`: Insufficient permissions
- `invalid-argument`: Invalid input data
- `internal`: Server error

## 📈 Monitoring

View logs:
```bash
firebase functions:log
```

## 🔄 Deployment

```bash
# Deploy all functions
npm run deploy

# Deploy specific function
firebase deploy --only functions:processInvestment

# Deploy security rules
firebase deploy --only firestore:rules
```

## 🛠️ Future Enhancements

- [ ] Scheduled functions for maturity calculations
- [ ] Payment gateway integration (M-Pesa, Airtel Money)
- [ ] Email notifications
- [ ] Advanced analytics and reporting
- [ ] Automated KYC verification
- [ ] Pool milestone tracking

## 📞 Support

For issues or questions, contact the development team.
