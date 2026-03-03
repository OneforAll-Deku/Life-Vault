import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    createWill, getMyWills, getWill, updateWill, deleteWill,
    addBeneficiary, removeBeneficiary, assignMemories,
    confirmBeneficiary, checkin, notarizeWill, executeWill, getActivity,
} from '../controllers/digitalWillController.js';

const router = express.Router();

// ── Public route (confirmation link from email) ──
router.post('/confirm', confirmBeneficiary);

// ── All below require auth ──
router.use(protect);

// Core CRUD
router.route('/')
    .post(createWill)
    .get(getMyWills);

router.route('/:id')
    .get(getWill)
    .put(updateWill)
    .delete(deleteWill);

// Beneficiaries
router.post('/:id/beneficiaries', addBeneficiary);
router.delete('/:id/beneficiaries/:beneficiaryId', removeBeneficiary);
router.put('/:id/beneficiaries/:beneficiaryId/memories', assignMemories);

// Actions
router.post('/:id/checkin', checkin);
router.post('/:id/notarize', notarizeWill);
router.post('/:id/execute', executeWill);
router.get('/:id/activity', getActivity);

export default router;
