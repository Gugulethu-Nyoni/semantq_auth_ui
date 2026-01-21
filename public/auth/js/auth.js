// semantq_auth/controllers/authController.js
import { signupUser, loginUser, initiatePasswordReset, resetUserPassword } from '../services/authService.js';
import { emailServicePromise } from '../services/email.js';
import { successResponse, errorResponse } from '../lib/utils/response.js';
import jwt from 'jsonwebtoken';
import config from '../config/auth.js';
import models from '../models/index.js';

const { findUserByVerificationToken, verifyUserById, findUserById } = models;

import { getCookieOptions } from '../config/cookies.js';

// Signup - UPDATED to accept username
export const signupHandler = async (req, res) => {
  try {
    // Extract ALL fields from request body - ADDED username
    const { 
      name, 
      email, 
      password, 
      username, // NEW: Added username
      ref, 
      uplineId,
      surname,
      mobile,
      product_package,
      bank_name,
      branch_name,
      branch_code,
      account_holder,
      account_number
    } = req.body;

    // Required fields check
    if (!name || !email || !password || !surname || !mobile) {
      return errorResponse(res, 'All required fields are required.', 400);
    }

    if (!uplineId) {
      return errorResponse(res, 'Upline or Sponsor is required.', 400);
    }

    // NEW: Optional username validation if provided
    if (username) {
      // Example: Basic username validation
      if (username.length < 3) {
        return errorResponse(res, 'Username must be at least 3 characters long.', 400);
      }
      if (!/^[a-z0-9]+$/.test(username)) {
        return errorResponse(res, 'Username can only contain lowercase letters and numbers.', 400);
      }
      if (!/^[a-z]/.test(username)) {
        return errorResponse(res, 'Username must start with a letter.', 400);
      }
    }

    // Validate bank details if product package is selected
    if (product_package && product_package !== 'a') { // Assuming 'a' might not require bank details
      if (!bank_name || !branch_name || !branch_code || !account_holder || !account_number) {
        return errorResponse(res, 'Bank details are required for selected package.', 400);
      }
    }

    const upline = await models.getUpline(parseInt(uplineId));

    const signUpData = {
      name: name,
      surname: surname,
      email: email,
      username: username, // NEW: Add username
      mobile: mobile,
      password: password,
      ref: ref,
      product_package: product_package || 'a', // Default to 'a' if not provided
      level_1: upline.id,
      level_2: upline.level_1,
      level_3: upline.level_2,
      level_4: upline.level_3,
      level_5: upline.level_4,
      level_6: upline.level_5,
      level_7: upline.level_6,
      level_8: upline.level_7,
      level_9: upline.level_9,
      level_10: upline.level_10,
      level_11: upline.level_11,
      level_12: upline.level_12,
      stage: 0,
      // Bank details
      bank_name: bank_name,
      branch_name: branch_name,
      branch_code: branch_code,
      account_holder: account_holder,
      account_number: account_number
    };

    console.log('Signup data being sent to service:', signUpData);

    // Pass signUpData to signupUser service
    const { verification_token } = await signupUser(signUpData);

    const emailService = await emailServicePromise;
    await emailService.sendConfirmationEmail({
      to: email,
      name,
      token: verification_token
    });

    return successResponse(
      res,
      'Account created. Please check your email to verify.',
      { token: verification_token },
      200
    );

  } catch (err) {
    console.error('[AUTH] Signup error:', err);
    return errorResponse(res, err.message || 'Signup failed.', 500);
  }
};

// Confirm Email - UNCHANGED
export const confirmEmailHandler = async (req, res) => {
  const { token } = req.body;

  console.log('Received token:', token);
  // NOTE: The original code had a duplicate user lookup here.
  // The jwt.verify will handle the token validity, and findUserByVerificationToken
  // is then used to ensure the user exists and is not already verified.
  // const user = await findUserByVerificationToken(token); // This line can be removed or kept for initial debug
  // console.log('User found:', user);

  if (!token) return errorResponse(res, 'Verification token missing.', 400);

  try {
    const decoded = jwt.verify(token, config.jwtSecret); // This decodes the token
    const user = await findUserByVerificationToken(token); // This fetches user by the token
    if (!user) return errorResponse(res, 'Invalid or expired token.', 400);
    if (user.is_verified) return successResponse(res, 'Email already verified.', null, 200);

    await verifyUserById(user.id);
    return successResponse(res, 'Email verified successfully.', null, 200);

  } catch (err) {
    console.error('[AUTH] Email confirmation error:', err);
    return errorResponse(res, 'Invalid or expired token.', 400);
  }
};

// Login - UPDATED to accept identifier (email or username)
export const loginHandler = async (req, res) => {
  try {
    // Support both identifier (new) and email (backward compatibility)
    const identifier = req.body.identifier || req.body.email;
    const { password } = req.body;
    
    if (!identifier || !password) {
      return errorResponse(res, 'Email/username and password are required.', 400);
    }

    console.log('[AUTH] Login attempt for identifier:', identifier);

    const { user, token } = await loginUser({ identifier, password });

    console.log('[loginHandler] JWT token:', token);

    console.log('[AUTH] Setting auth_token cookie with options:', getCookieOptions());
    res.cookie('auth_token', token, getCookieOptions());

    return successResponse(res, 'Login successful.', { user });

  } catch (err) {
    console.error('[AUTH] Login error:', err);
    if (err.message.includes('Invalid email/username or password') || err.message.includes('Please verify your email')) {
      return errorResponse(res, err.message, 401);
    }
    return errorResponse(res, err.message || 'Login failed.', 500);
  }
};

// Validate Session - UPDATED to include username
export const validateSessionHandler = (req, res) => {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      console.log('[AUTH] validateSessionHandler: No auth_token cookie');
      return errorResponse(res, 'No valid session', 401);
    }

    const payload = jwt.verify(token, config.jwtSecret);

    console.log('[AUTH] validateSessionHandler: Session valid for userId:', payload.userId);

    return successResponse(res, 'Session valid', {
      valid: true,
      userId: payload.userId,
      email: payload.email,
      username: payload.username || null, // NEW: Include username
      access_level: payload.access_level || 1
    });

  } catch (err) {
    console.error('[AUTH] validateSessionHandler error:', err.message);
    return errorResponse(res, 'Session invalid or expired', 401);
  }
};

// Verify Token (for UI server) - UPDATED to include username
export const verifyTokenHandler = async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
        code: 'MISSING_TOKEN'
      });
    }

    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: 'authentique',
      audience: 'ui-server'
    });

    res.json({
      success: true,
      data: {
        userId: payload.userId,
        email: payload.email,
        username: payload.username || null, // NEW: Include username
        access_level: payload.access_level || 1, // Ensure access_level is returned
        sessionValid: true
      }
    });

  } catch (err) {
    console.error('[AUTH] Token verification error:', err);
    const errorType = err.name === 'TokenExpiredError' ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN';

    res.status(401).json({
      success: false,
      message: err.message,
      code: errorType,
      expiredAt: err.name === 'TokenExpiredError' ? err.expiredAt : undefined
    });
  }
};

// Get User Profile - UPDATED to include username
export const getUserProfileHandler = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return errorResponse(res, 'User ID not found in request context', 400);
    }

    const user = await findUserById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const profile = {
      id: user.id,
      email: user.email,
      username: user.username, // NEW: Include username
      name: user.name,
      access_level: user.access_level, // Include the access_level here
    };

    return successResponse(res, 'User profile fetched successfully.', { profile });

  } catch (err) {
    console.error('[AUTH] Error fetching user profile:', err);
    return errorResponse(res, 'Failed to fetch user profile.', 500);
  }
};

// Logout - UNCHANGED
export const logoutHandler = (req, res) => {
  try {
    // Use the dynamic options but set maxAge to 0 to delete it
    const options = { ...getCookieOptions(), maxAge: 0 };
    
    res.cookie('auth_token', '', options);
    console.log('[AUTH] User logged out, auth_token cookie cleared.');
    return successResponse(res, 'Logged out successfully.');
  } catch (err) {
    console.error('[AUTH] Logout error:', err);
    return errorResponse(res, 'Logout failed.', 500);
  }
};

// Handle forgot password request (send reset link) - UNCHANGED (email only)
export const forgotPasswordHandler = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 'Email is required.', 400);
    }

    const { name, token } = await initiatePasswordReset(email);

    if (token) {
      const emailService = await emailServicePromise;
      await emailService.sendPasswordResetEmail({
        to: email,
        name,
        token
      });
    }

    return successResponse(res, 'If an account with that email exists, a password reset link has been sent.', null, 200);

  } catch (err) {
    console.error('[AUTH] Forgot password error:', err);
    return errorResponse(res, err.message || 'Failed to initiate password reset.', 500);
  }
};

// Handle actual password reset (with token) - UNCHANGED
export const resetPasswordHandler = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return errorResponse(res, 'Token and new password are required.', 400);
    }

    await resetUserPassword(token, newPassword);

    return successResponse(res, 'Password has been reset successfully.', null, 200);

  } catch (err) {
    console.error('[AUTH] Reset password error:', err);
    return errorResponse(res, err.message || 'Failed to reset password.', 500);
  }
};