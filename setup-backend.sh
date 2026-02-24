#!/bin/bash

# Fami Backend Setup Script
# Run this script using Git Bash to install and build Firebase Functions

echo "========================================="
echo "Fami Backend Setup"
echo "========================================="
echo ""

# Navigate to functions directory
cd "$(dirname "$0")/functions" || exit 1

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🔨 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build functions"
    exit 1
fi

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'firebase login' to authenticate"
echo "2. Run 'firebase deploy --only functions' to deploy"
echo "3. Run 'firebase deploy --only firestore:rules' to deploy security rules"
echo ""
echo "See DEPLOYMENT.md for detailed instructions"
