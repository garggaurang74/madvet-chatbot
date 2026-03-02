#!/bin/bash
# Run from your project root: bash diagnose.sh

echo "=== Checking font files ==="
ls -lh public/fonts/ 2>/dev/null || echo "❌ public/fonts/ does not exist"

echo ""
echo "=== Checking route.tsx first 20 lines ==="
head -20 "app/api/share-card/[id]/route.tsx" 2>/dev/null || echo "❌ route.tsx not found"

echo ""
echo "=== Checking next.config.js ==="
cat next.config.js 2>/dev/null || echo "❌ next.config.js not found"

echo ""
echo "=== Checking if fonts are embedded in route.tsx ==="
grep -c "base64" "app/api/share-card/[id]/route.tsx" 2>/dev/null && echo "✅ base64 found in route.tsx" || echo "❌ No base64 in route.tsx - fonts NOT embedded"

echo ""
echo "=== Git status ==="
git log --oneline -5
