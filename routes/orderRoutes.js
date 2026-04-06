import express from 'express';
import { createOrder, getUserOrders, cancelOrder, getAllOrders, updateOrderStatus, updateAutoFulfill } from '../controllers/orderController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Buyer routes
router.post('/', protect, createOrder);
router.get('/', protect, getUserOrders);
router.delete('/:id', protect, cancelOrder);

// Admin-only routes
router.get('/all', protect, authorizeRoles('Admin'), getAllOrders);
router.patch('/:id/status', protect, authorizeRoles('Admin'), updateOrderStatus);
router.patch('/:id/auto-fulfill', protect, authorizeRoles('Admin'), updateAutoFulfill);

export default router;