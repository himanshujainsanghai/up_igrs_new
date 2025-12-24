import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Auth Routes
 * /api/v1/auth
 */

// Public routes
router.post('/login', authController.login); // Admin login

// Protected routes
router.post('/logout', authenticate, authController.logout); // Logout
router.get('/me', authenticate, authController.getMe); // Get current user
router.post('/refresh', authenticate, authController.refreshToken); // Refresh token

export default router;

