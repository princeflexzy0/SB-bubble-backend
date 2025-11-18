#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 GIT REPOSITORY STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Current branch
echo "🌿 Current Branch:"
git branch --show-current
echo ""

# Status
echo "📝 Git Status:"
git status --short
echo ""

# Recent commits
echo "📜 Recent Commits (Last 5):"
git log --oneline -5
echo ""

# Uncommitted changes
CHANGES=$(git status --porcelain | wc -l)
if [ $CHANGES -eq 0 ]; then
    echo "✅ No uncommitted changes"
else
    echo "⚠️  You have $CHANGES uncommitted change(s):"
    git status --short
fi
echo ""

# Remote status
echo "🌐 Remote Status:"
git remote -v
echo ""

# Check if ahead/behind
AHEAD=$(git rev-list --count HEAD ^origin/main 2>/dev/null || echo "0")
BEHIND=$(git rev-list --count origin/main ^HEAD 2>/dev/null || echo "0")

if [ "$AHEAD" -gt 0 ]; then
    echo "📤 Your branch is $AHEAD commit(s) ahead of origin/main"
fi
if [ "$BEHIND" -gt 0 ]; then
    echo "📥 Your branch is $BEHIND commit(s) behind origin/main"
fi
if [ "$AHEAD" -eq 0 ] && [ "$BEHIND" -eq 0 ]; then
    echo "✅ Your branch is up to date with origin/main"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
