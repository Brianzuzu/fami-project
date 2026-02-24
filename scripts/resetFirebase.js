/**
 * ⚠️  DESTRUCTIVE OPERATION — CANNOT BE UNDONE
 * 
 * This script deletes:
 *   - ALL Firebase Authentication users
 *   - ALL documents in the Firestore collections listed below
 *
 * HOW TO RUN:
 *   1. Place your Firebase service account key at:
 *        c:\Users\Brian\Desktop\Fami\scripts\serviceAccountKey.json
 *   2. From the Fami root directory, run:
 *        node scripts/resetFirebase.js
 */

const admin = require('../functions/node_modules/firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

// ─── Collections to wipe ─────────────────────────────────────────────────────
const COLLECTIONS = [
    'users',
    'pools',
    'investments',
    'transactions',
    'inputs',
    'input_orders',
    'marketplace',
    'market_prices',
    'local_markets',
    'loans',
    'notifications',
    'admin_actions',
    'community_groups',
];

// ─── Delete all Auth users in batches ────────────────────────────────────────
async function deleteAllAuthUsers() {
    console.log('\n🔑  Deleting Firebase Auth users...');
    let total = 0;
    let pageToken;

    do {
        const result = pageToken
            ? await auth.listUsers(1000, pageToken)
            : await auth.listUsers(1000);

        const uids = result.users.map(u => u.uid);
        if (uids.length > 0) {
            await auth.deleteUsers(uids);
            total += uids.length;
            console.log(`   ✓ Deleted ${uids.length} users (running total: ${total})`);
        }

        pageToken = result.pageToken;
    } while (pageToken);

    console.log(`   ✅ Done — ${total} Auth users removed.`);
}

// ─── Delete all documents in a collection ────────────────────────────────────
async function deleteCollection(collectionName) {
    const ref = db.collection(collectionName);
    let deleted = 0;

    while (true) {
        const snapshot = await ref.limit(400).get();
        if (snapshot.empty) break;

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        deleted += snapshot.size;
    }

    return deleted;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n⚠️  FAMI FIREBASE RESET SCRIPT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await deleteAllAuthUsers();

    console.log('\n🗄️   Clearing Firestore collections...');
    for (const col of COLLECTIONS) {
        const count = await deleteCollection(col);
        if (count > 0) {
            console.log(`   ✓ ${col}: ${count} documents deleted`);
        } else {
            console.log(`   — ${col}: already empty`);
        }
    }

    console.log('\n✅  Firebase has been reset. Fresh start ready!\n');
    process.exit(0);
}

main().catch(err => {
    console.error('\n❌  Error during reset:', err.message);
    process.exit(1);
});
