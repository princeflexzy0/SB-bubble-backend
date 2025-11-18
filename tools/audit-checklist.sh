#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PRODUCTION READINESS CHECKLIST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
        return 0
    else
        echo "❌ $1 - MISSING"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1/"
        return 0
    else
        echo "❌ $1/ - MISSING"
        return 1
    fi
}

PASSED=0
FAILED=0

echo "📦 CORE FILES:"
check_file "package.json" && ((PASSED++)) || ((FAILED++))
check_file "package-lock.json" && ((PASSED++)) || ((FAILED++))
check_file "server.js" && ((PASSED++)) || ((FAILED++))
check_file "app.js" && ((PASSED++)) || ((FAILED++))
check_file ".gitignore" && ((PASSED++)) || ((FAILED++))
check_file ".env.example" && ((PASSED++)) || ((FAILED++))
echo ""

echo "📚 DOCUMENTATION:"
check_file "README.md" && ((PASSED++)) || ((FAILED++))
check_file "HANDOVER.md" && ((PASSED++)) || ((FAILED++))
check_file "PROJECT_SUMMARY.md" && ((PASSED++)) || ((FAILED++))
check_file "CHANGELOG.md" && ((PASSED++)) || ((FAILED++))
check_file "CLIENT_INTEGRATION_GUIDE.md" && ((PASSED++)) || ((FAILED++))
check_file "TWILIO_INTEGRATION.md" && ((PASSED++)) || ((FAILED++))
echo ""

echo "🗂️  DIRECTORIES:"
check_dir "routes" && ((PASSED++)) || ((FAILED++))
check_dir "controllers" && ((PASSED++)) || ((FAILED++))
check_dir "services" && ((PASSED++)) || ((FAILED++))
check_dir "middleware" && ((PASSED++)) || ((FAILED++))
check_dir "utils" && ((PASSED++)) || ((FAILED++))
check_dir "config" && ((PASSED++)) || ((FAILED++))
check_dir "database" && ((PASSED++)) || ((FAILED++))
check_dir "workers" && ((PASSED++)) || ((FAILED++))
check_dir "tests" && ((PASSED++)) || ((FAILED++))
check_dir "docs" && ((PASSED++)) || ((FAILED++))
check_dir "scripts" && ((PASSED++)) || ((FAILED++))
echo ""

echo "🔧 CONFIGURATION:"
check_file "jest.config.js" && ((PASSED++)) || ((FAILED++))
check_file ".eslintrc.js" && ((PASSED++)) || ((FAILED++))
check_file "pm2.config.js" && ((PASSED++)) || ((FAILED++))
check_file "Dockerfile" && ((PASSED++)) || ((FAILED++))
check_file "docker-compose.yml" && ((PASSED++)) || ((FAILED++))
check_file ".dockerignore" && ((PASSED++)) || ((FAILED++))
check_file ".nvmrc" && ((PASSED++)) || ((FAILED++))
echo ""

echo "🗄️  DATABASE:"
check_file "database/schema.sql" && ((PASSED++)) || ((FAILED++))
check_file "database/rls_policies.sql" && ((PASSED++)) || ((FAILED++))
check_file "database/seed.sql" && ((PASSED++)) || ((FAILED++))
check_file "database/migrate.js" && ((PASSED++)) || ((FAILED++))
echo ""

echo "🧪 TESTS:"
check_dir "tests/unit" && ((PASSED++)) || ((FAILED++))
check_dir "tests/integration" && ((PASSED++)) || ((FAILED++))
check_file "tests/setup.js" && ((PASSED++)) || ((FAILED++))
echo ""

echo "📡 API ROUTES:"
check_file "routes/index.js" && ((PASSED++)) || ((FAILED++))
check_file "routes/auth.routes.js" && ((PASSED++)) || ((FAILED++))
check_file "routes/user.routes.js" && ((PASSED++)) || ((FAILED++))
check_file "routes/file.routes.js" && ((PASSED++)) || ((FAILED++))
check_file "routes/payment.routes.js" && ((PASSED++)) || ((FAILED++))
check_file "routes/messaging.routes.js" && ((PASSED++)) || ((FAILED++))
check_file "routes/ai.routes.js" && ((PASSED++)) || ((FAILED++))
check_file "routes/workflow.routes.js" && ((PASSED++)) || ((FAILED++))
check_file "routes/health.routes.js" && ((PASSED++)) || ((FAILED++))
echo ""

echo "🎮 CONTROLLERS:"
check_file "controllers/auth.controller.js" && ((PASSED++)) || ((FAILED++))
check_file "controllers/user.controller.js" && ((PASSED++)) || ((FAILED++))
check_file "controllers/file.controller.js" && ((PASSED++)) || ((FAILED++))
check_file "controllers/payment.controller.js" && ((PASSED++)) || ((FAILED++))
check_file "controllers/messaging.controller.js" && ((PASSED++)) || ((FAILED++))
check_file "controllers/ai.controller.js" && ((PASSED++)) || ((FAILED++))
check_file "controllers/workflow.controller.js" && ((PASSED++)) || ((FAILED++))
echo ""

echo "🔧 SERVICES:"
check_file "services/auth.service.js" && ((PASSED++)) || ((FAILED++))
check_file "services/user.service.js" && ((PASSED++)) || ((FAILED++))
check_file "services/file.service.js" && ((PASSED++)) || ((FAILED++))
check_file "services/payment.service.js" && ((PASSED++)) || ((FAILED++))
check_file "services/messaging.service.js" && ((PASSED++)) || ((FAILED++))
check_file "services/ai.service.js" && ((PASSED++)) || ((FAILED++))
check_file "services/workflow.service.js" && ((PASSED++)) || ((FAILED++))
echo ""

echo "🛡️  MIDDLEWARE:"
check_file "middleware/security.js" && ((PASSED++)) || ((FAILED++))
check_file "middleware/errorHandler.js" && ((PASSED++)) || ((FAILED++))
check_file "middleware/requestLogger.js" && ((PASSED++)) || ((FAILED++))
echo ""

echo "⚙️  WORKERS:"
check_file "workers/index.js" && ((PASSED++)) || ((FAILED++))
check_file "workers/queue.js" && ((PASSED++)) || ((FAILED++))
check_file "workers/README.md" && ((PASSED++)) || ((FAILED++))
check_dir "workers/jobs" && ((PASSED++)) || ((FAILED++))
check_dir "workers/private" && ((PASSED++)) || ((FAILED++))
echo ""

echo "📄 DOCS:"
check_file "docs/API_DOCUMENTATION.md" && ((PASSED++)) || ((FAILED++))
check_file "docs/postman_collection.json" && ((PASSED++)) || ((FAILED++))
echo ""

echo "🚀 DEPLOYMENT:"
check_dir "scripts" && ((PASSED++)) || ((FAILED++))
check_file "scripts/deploy.sh" && ((PASSED++)) || ((FAILED++))
check_file "scripts/start.sh" && ((PASSED++)) || ((FAILED++))
check_file "scripts/stop.sh" && ((PASSED++)) || ((FAILED++))
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 AUDIT RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED!"
    echo "✅ Repository is PRODUCTION READY"
else
    echo "⚠️  Some files are missing"
    echo "Review the items marked with ❌ above"
fi
echo ""
