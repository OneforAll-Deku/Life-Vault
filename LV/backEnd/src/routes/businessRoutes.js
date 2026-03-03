import express from 'express';
import { getBusinessStats } from '../controllers/businessController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get business statistics
router.get('/stats', protect, getBusinessStats);

export default router;
