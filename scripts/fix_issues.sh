#!/bin/bash

echo "🔧 APPLYING SECURITY FIXES"
echo "=========================="
echo ""

# Backup current app.js
cp app.js app.js.backup

# Fix 1: Update HMAC exemptions in app.js
echo "1️⃣ Fixing HMAC exemptions..."
sed -i '107,115d' app.js

# Insert new HMAC logic at line 107
sed -i '106a\
  const isWebhook = req.path.includes("/webhook");\
  const isHealthRoute = req.path.includes("/health") || req.path.includes("/debug");\
  \
  // Only exempt specific public routes from HMAC\
  const publicAuthRoutes = [\
    "/auth/signin",\
    "/auth/signup",\
    "/auth/register",\
    "/auth/refresh",\
    "/auth/csrf-token",\
    "/auth/google",\
    "/auth/apple"\
  ];\
  \
  const isMagicLink = req.path.startsWith("/auth/magic/");\
  const isPublicAuth = publicAuthRoutes.some(route => req.path.includes(route));\
  \
  if (isPublicAuth || isMagicLink || isWebhook || isHealthRoute) {\
    return next();\
  }\
  \
  validateHmacSignature(req, res, next);' app.js

echo "✅ HMAC exemptions fixed"

# Fix 2: Add RLS context to auth middleware
echo ""
echo "2️⃣ Adding RLS context to auth middleware..."

# Check if setUserContext already exists
if ! grep -q "setUserContext" middleware/auth.middleware.js; then
  # Add before authenticateUser function
  sed -i '/const authenticateUser/i\
/**\
 * Set user context for RLS\
 */\
async function setUserContext(userId, userRole = "user") {\
  try {\
    await query("SELECT set_user_context($1, $2)", [userId, userRole]);\
  } catch (error) {\
    logger.warn("Failed to set user context", { error: error.message });\
  }\
}\
' middleware/auth.middleware.js
  
  echo "✅ RLS context function added"
else
  echo "⏭️  RLS context function already exists"
fi

echo ""
echo "=========================="
echo "✅ All fixes applied!"
echo ""
echo "Next steps:"
echo "1. Run database migration: 009_add_rls_context.sql"
echo "2. Test HMAC exemptions"
echo "3. Verify RLS context is set"
echo "4. Add virus scanner to upload flow"

