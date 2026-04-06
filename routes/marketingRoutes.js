import express from 'express';
import { 
    broadcastEmail, 
    createDiscount, 
    getDiscounts, 
    updateDiscountStatus, 
    deleteDiscount, 
    getActiveDiscount,
    getMarketingAnalytics
} from '../controllers/marketingController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/discounts/active', getActiveDiscount);

// Admin & Marketing Specialist routes
const marketingAuth = [protect, authorizeRoles('Admin', 'Marketing Specialist')];

router.post('/broadcast', ...marketingAuth, broadcastEmail);

router.post('/discounts', ...marketingAuth, createDiscount);
router.get('/discounts', ...marketingAuth, getDiscounts);
router.patch('/discounts/:id/status', ...marketingAuth, updateDiscountStatus);
router.delete('/discounts/:id', ...marketingAuth, deleteDiscount);

// Analytics — Marketing Specialist & Admin
router.get('/analytics', ...marketingAuth, getMarketingAnalytics);

export default router;
