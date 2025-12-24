import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * Users Routes
 * /api/v1/users
 * 
 * All routes require admin authentication
 */

router.use(authenticate);
router.use(authorize('admin'));

// Statistics route (must be before /:id)
router.get('/statistics', usersController.getUserStatistics);

// Governance users route (must be before /:id)
router.get('/governance', usersController.getGovernanceUsers);

// Officer-related routes (must be before /:id)
router.get('/officers/available', usersController.getAvailableOfficers);
router.get('/officers', usersController.getOfficerUsers); // Get all officer users
router.get('/officers/:officerId', usersController.getOfficerById); // Get officer details by ID

// CRUD routes
router.get('/', usersController.getAllUsers);
router.get('/:id', usersController.getUserById);
router.post('/', usersController.createUser);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);

// Activation routes
router.patch('/:id/activate', usersController.activateUser);
router.patch('/:id/deactivate', usersController.deactivateUser);

export default router;

