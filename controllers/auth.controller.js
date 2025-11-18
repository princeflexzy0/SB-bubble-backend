const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

class AuthController {
  async signUp(req, res) {
    try {
      const { email, password, name } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Email and password are required'
        });
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      
      if (error) {
        console.error('Sign up error', { error: error.message });
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }
      
      res.status(201).json({
        status: 'success',
        data: {
          user: data.user,
          session: data.session
        }
      });
    } catch (error) {
      console.error('Sign up error', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
  
  async signIn(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Email and password are required'
        });
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return res.status(401).json({
          status: 'error',
          message: error.message
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          user: data.user,
          session: data.session
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
  
  async signOut(req, res) {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Signed out successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
  
  async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({
          status: 'error',
          message: 'Refresh token is required'
        });
      }
      
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      });
      
      if (error) {
        return res.status(401).json({
          status: 'error',
          message: error.message
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          session: data.session
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
  
  async resetPassword(req, res) {
    try {
      const { email } = req.body;
      
      // Validate required field
      if (!email) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Password reset email sent'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
  
  async getMe(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No token provided'
        });
      }
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token'
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: { user }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AuthController();
