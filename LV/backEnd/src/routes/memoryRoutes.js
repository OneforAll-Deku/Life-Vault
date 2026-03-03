import express from 'express';
import {
  createMemory,
  getMemories,
  getMemory,
  deleteMemory,
  verifyMemory,
  getStats,
  relayMemory,
  createCapsule,       // NEW
  claimCapsule,        // NEW
  searchMemories
} from '../controllers/memoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/search', searchMemories);
router.get('/stats', getStats);

router.post('/relay', relayMemory);   // ← NEW ROUTE

router.route('/')
  .get(getMemories)
  .post(createMemory);

router.route('/:id')
  .get(getMemory)
  .delete(deleteMemory);

router.get('/:id/verify', verifyMemory);

// Legacy Capsules
router.post('/capsule', createCapsule);
router.post('/capsule/:id/claim', claimCapsule);

export default router;