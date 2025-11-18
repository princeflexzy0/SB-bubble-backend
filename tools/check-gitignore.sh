#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 CHECKING FOR UNWANTED FILES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ISSUES=0

# Check for .env file (should not be committed)
if [ -f ".env" ]; then
    echo "⚠️  WARNING: .env file found (should be in .gitignore)"
    ((ISSUES++))
else
    echo "✅ No .env file in repo (correct)"
fi

# Check for node_modules
if [ -d "node_modules" ]; then
    if git check-ignore node_modules > /dev/null 2>&1; then
        echo "✅ node_modules properly ignored"
    else
        echo "⚠️  WARNING: node_modules not in .gitignore"
        ((ISSUES++))
    fi
else
    echo "✅ No node_modules directory"
fi

# Check for log files
LOG_FILES=$(find . -name "*.log" -not -path '*/node_modules/*' 2>/dev/null)
if [ -z "$LOG_FILES" ]; then
    echo "✅ No log files in repo"
else
    echo "⚠️  WARNING: Log files found:"
    echo "$LOG_FILES"
    ((ISSUES++))
fi

# Check for test coverage directories
if [ -d "coverage" ]; then
    if git check-ignore coverage > /dev/null 2>&1; then
        echo "✅ coverage/ properly ignored"
    else
        echo "⚠️  WARNING: coverage/ should be in .gitignore"
        ((ISSUES++))
    fi
else
    echo "✅ No coverage directory"
fi

# Check for OS files
OS_FILES=$(find . -name ".DS_Store" -o -name "Thumbs.db" 2>/dev/null)
if [ -z "$OS_FILES" ]; then
    echo "✅ No OS-specific files"
else
    echo "⚠️  WARNING: OS-specific files found:"
    echo "$OS_FILES"
    ((ISSUES++))
fi

# Check .gitignore exists
if [ -f ".gitignore" ]; then
    echo "✅ .gitignore file exists"
    echo ""
    echo "📋 .gitignore contents:"
    cat .gitignore
else
    echo "❌ ERROR: .gitignore is missing!"
    ((ISSUES++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ISSUES -eq 0 ]; then
    echo "✅ Repository is CLEAN!"
else
    echo "⚠️  Found $ISSUES issue(s) - review above"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
