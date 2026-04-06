import express from 'express';
import { getMe, updateMe, addAddress, deleteAddress, getMyOrders } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/address', protect, addAddress);
router.delete('/address/:addrId', protect, deleteAddress);
router.get('/orders', protect, getMyOrders);

export default router;
