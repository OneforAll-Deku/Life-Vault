import express from 'express';
import {
    createVault,
    getMyVaults,
    getVault,
    updateVault,
    deleteVault,
    addMemory,
    removeMemory,
    createInvite,
    joinVault,
    getInviteInfo,
    updateMemberRole,
    removeMember,
    getActivity,
} from '../controllers/familyVaultController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public: get invite info (so unauthenticated users can see what they're joining)
router.get('/invite/:code/info', getInviteInfo);

// All other routes require authentication
router.use(protect);

// Vault CRUD
router.post('/', createVault);
router.get('/', getMyVaults);
router.get('/:id', getVault);
router.put('/:id', updateVault);
router.delete('/:id', deleteVault);

// Memories within vault
router.post('/:id/memories', addMemory);
router.delete('/:id/memories/:memoryId', removeMemory);

// Invite system
router.post('/:id/invite', createInvite);
router.post('/join/:code', joinVault);

// Member management
router.put('/:id/members/role', updateMemberRole);
router.delete('/:id/members/:memberId', removeMember);

// Activity feed
router.get('/:id/activity', getActivity);

export default router;
