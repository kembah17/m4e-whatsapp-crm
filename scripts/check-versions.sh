#!/bin/bash
# M4E CRM — Software Version Check Script
# Usage: bash scripts/check-versions.sh

set -e

echo "============================================"
echo "  M4E WhatsApp CRM — Version Check Report"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

echo "=== Runtime ==="
echo "  Node.js:     $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "  npm:         $(npm --version 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

echo "=== Framework ==="
echo "  Next.js:     $(node -e "console.log(require('next/package.json').version)" 2>/dev/null || echo 'NOT INSTALLED')"
echo "  React:       $(node -e "console.log(require('react/package.json').version)" 2>/dev/null || echo 'NOT INSTALLED')"
echo "  React DOM:   $(node -e "console.log(require('react-dom/package.json').version)" 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

echo "=== Language & Types ==="
echo "  TypeScript:  $(npx tsc --version 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

echo "=== Database & Auth ==="
echo "  Supabase JS: $(node -e "console.log(require('@supabase/supabase-js/package.json').version)" 2>/dev/null || echo 'NOT INSTALLED')"
echo "  Supabase SSR:$(node -e "console.log(require('@supabase/ssr/package.json').version)" 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

echo "=== Styling ==="
echo "  Tailwind CSS: $(node -e "console.log(require('tailwindcss/package.json').version)" 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

echo "=== Testing ==="
echo "  Vitest:      $(node -e "console.log(require('vitest/package.json').version)" 2>/dev/null || echo 'NOT INSTALLED')"
echo "  Testing Lib: $(node -e "console.log(require('@testing-library/react/package.json').version)" 2>/dev/null || echo 'NOT INSTALLED')"
echo "  Happy DOM:   $(node -e "console.log(require('happy-dom/package.json').version)" 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

echo "=== Dev Tools ==="
echo "  ESLint:      $(npx eslint --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "  Prettier:    $(npx prettier --version 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

echo "=== Outdated Packages ==="
npm outdated 2>/dev/null || echo "  All packages up to date!"
echo ""

echo "=== Security Audit ==="
npm audit --audit-level=moderate 2>/dev/null || echo "  Run 'npm audit' for details"
echo ""

echo "=== Test Suite ==="
echo "  Test files:  $(find src -name '*.test.*' -o -name '*.spec.*' | wc -l)"
echo "  Run: npm run test"
echo ""

echo "============================================"
echo "  Check complete!"
echo "============================================"
