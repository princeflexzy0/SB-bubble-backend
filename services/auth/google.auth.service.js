const { OAuth2Client } = require('google-auth-library');
const { query } = require('../../config/database');
const { generateTokenPair } = require('../../utils/jwt.util');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('google-auth');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const getAuthUrl = () => {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });
};

const verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    logger.error('Google token verification failed', { error: error.message });
    throw new Error('Invalid Google token');
  }
};

const handleGoogleCallback = async (code, metadata = {}) => {
  try {
    const { tokens } = await client.getToken(code);
    const googleData = await verifyGoogleToken(tokens.id_token);

    let result = await query(
      `SELECT * FROM users WHERE external_provider = 'google' AND external_provider_id = $1`,
      [googleData.sub]
    );

    let user;
    let isNewUser = false;

    if (result.rows.length > 0) {
      user = result.rows[0];
      await query(
        `UPDATE users SET last_login_at = NOW(), login_count = login_count + 1 WHERE id = $1`,
        [user.id]
      );
    } else {
      result = await query('SELECT * FROM users WHERE email = $1', [googleData.email]);

      if (result.rows.length > 0) {
        user = result.rows[0];
        await query(
          `UPDATE users SET external_provider = 'google', external_provider_id = $1, email_verified = TRUE, last_login_at = NOW(), login_count = login_count + 1 WHERE id = $2`,
          [googleData.sub, user.id]
        );
      } else {
        result = await query(
          `INSERT INTO users (email, external_provider, external_provider_id, email_verified, last_login_at, login_count)
           VALUES ($1, 'google', $2, TRUE, NOW(), 1) RETURNING *`,
          [googleData.email, googleData.sub]
        );
        user = result.rows[0];
        isNewUser = true;
      }
    }

    await query(
      `INSERT INTO login_events (user_id, login_method, success, ip_address, user_agent)
       VALUES ($1, 'google', TRUE, $2, $3)`,
      [user.id, metadata.ipAddress, metadata.userAgent]
    );

    const tokens = await generateTokenPair(user, metadata);

    logger.info('Google authentication successful', { userId: user.id, isNewUser });

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true,
      },
      tokens,
      isNewUser,
    };
  } catch (error) {
    logger.error('Google callback failed', { error: error.message });
    throw error;
  }
};

module.exports = {
  getAuthUrl,
  verifyGoogleToken,
  handleGoogleCallback,
};
