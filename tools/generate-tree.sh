#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌳 BUBBLE BACKEND API - REPOSITORY TREE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Generated: $(date)"
echo ""

# Show directory structure
tree -L 3 -I 'node_modules|.git|*.log' --dirsfirst || find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | sort

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 PROJECT STATISTICS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count files
echo "📁 Total Directories: $(find . -type d -not -path '*/node_modules/*' -not -path '*/.git/*' | wc -l)"
echo "📄 Total Files: $(find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | wc -l)"
echo ""
echo "By Type:"
echo "  JavaScript: $(find . -name "*.js" -not -path '*/node_modules/*' | wc -l)"
echo "  SQL: $(find . -name "*.sql" | wc -l)"
echo "  JSON: $(find . -name "*.json" -not -path '*/node_modules/*' | wc -l)"
echo "  Markdown: $(find . -name "*.md" | wc -l)"
echo "  Config: $(find . -name ".*" -type f -not -path '*/.git/*' | wc -l)"
echo ""

# Lines of code
echo "📝 Lines of Code:"
echo "  JavaScript: $(find . -name "*.js" -not -path '*/node_modules/*' -not -path '*/.git/*' | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
echo "  SQL: $(find . -name "*.sql" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
echo ""
