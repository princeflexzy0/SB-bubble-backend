const userService = require('../services/user.service');
const fileService = require('../services/file.service');
const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

class UserController {
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const profile = await userService.getUserProfile(userId);
      res.status(200).json({
        status: 'success',
        data: { profile }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updates = req.body;
      const profile = await userService.updateUserProfile(userId, updates);
      res.status(200).json({
        status: 'success',
        data: { profile }
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const userId = req.user.id;
      const stats = await userService.getUserStats(userId);
      res.status(200).json({
        status: 'success',
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req, res, next) {
    try {
      const userId = req.user.id;
      await userService.deactivateUser(userId);
      res.status(200).json({
        status: 'success',
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadFile(req, res, next) {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }
      
      const result = await fileService.uploadFile(file, userId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req, res, next) {
    try {
      const userId = req.user.id;
      const { confirmPassword } = req.body;
      
      // Verify password before deletion
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      
      if (user.password_hash && confirmPassword) {
        const validPassword = await bcrypt.compare(confirmPassword, user.password_hash);
        if (!validPassword) {
          return res.status(401).json({ success: false, error: 'Invalid password' });
        }
      }
      
      // Soft delete user
      await pool.query(
        `UPDATE users 
         SET deleted_at = NOW(), 
             deletion_reason = 'user_requested',
             email = email || '.deleted.' || id::text
         WHERE id = $1`,
        [userId]
      );
      
      // Revoke all tokens
      await pool.query(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
        [userId]
      );
      
      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
