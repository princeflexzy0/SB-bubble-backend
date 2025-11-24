#!/bin/bash

# Fix unused variables in auth.controller.js
sed -i 's/const { generateTokenPair, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens } = require/const { generateTokenPair, verifyRefreshToken, revokeRefreshToken } = require/' controllers/auth/auth.controller.js

# Fix unused 'name' variable
sed -i 's/const { email, password, name } = req.body;/const { email, password } = req.body;/' controllers/auth/auth.controller.js

# Fix duplicate 'tokens' declaration in google.auth.service.js
sed -i 's/const tokens = await generateTokenPair/const authTokens = await generateTokenPair/' services/auth/google.auth.service.js
sed -i 's/return {$/return {\n      user: {\n        id: user.id,\n        email: user.email,\n        emailVerified: true,\n      },\n      tokens: authTokens,/' services/auth/google.auth.service.js | head -100

# Remove unused crypto import
sed -i '/^const crypto = require/d' services/kyc/kyc.service.js

# Remove unused metadata parameter
sed -i 's/, metadata = {}//' services/payment/stripe.service.js

# Remove unused JWT variables
sed -i '/^const JWT_REFRESH_SECRET/d' utils/jwt.util.js
sed -i '/^const JWT_REFRESH_EXPIRY/d' utils/jwt.util.js

echo "✅ ESLint fixes applied"
