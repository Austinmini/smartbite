#!/bin/bash
# Deploy API to Railway

set -e

echo "🚀 Smartbite Railway Deployment Helper"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Ensure we're in the repo root
cd "$(dirname "$0")/.."

echo "1️⃣  Logging into Railway..."
railway login

echo ""
echo "2️⃣  Initializing Railway project..."
railway init

echo ""
echo "3️⃣  Link your Railway project (from dashboard URL)"
read -p "Enter your Railway project ID: " PROJECT_ID
railway link "$PROJECT_ID"

echo ""
echo "4️⃣  Set environment variables in Railway dashboard:"
echo "    https://railway.app/project/${PROJECT_ID}/settings"
echo ""
echo "    Required variables:"
echo "    • SUPABASE_URL"
echo "    • SUPABASE_ANON_KEY"
echo "    • SUPABASE_SERVICE_KEY"
echo "    • ANTHROPIC_API_KEY"
echo "    • NODE_ENV=production"
echo ""
echo "    Then run: railway up"
echo ""
echo "5️⃣  After deployment, copy your Railway API URL"
echo "    Update: apps/mobile/.env"
echo "    Set: EXPO_PUBLIC_API_URL=https://your-railway-url.railway.app"
