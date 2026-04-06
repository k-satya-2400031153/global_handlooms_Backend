import express from 'express';
import { createProduct, getProducts, updateProduct, deleteProduct } from '../controllers/productController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import Product from '../models/Product.js';

const router = express.Router();

// Artisan's own products — only their listings
router.get('/artisan', protect, async (req, res) => {
    try {
        const artisanId = req.user?._id || req.user?.id;
        const myProducts = await Product.find({ artisanId }).sort({ createdAt: -1 });
        res.json(myProducts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch artisan nodes.' });
    }
});

// Public: anyone can view (supports ?search, ?material, ?region)
router.get('/', getProducts);

// Artisans and Admins can create products
router.post('/', protect, authorizeRoles('Artisan', 'Admin'), createProduct);

// Admin or owning Artisan can edit
router.put('/:id', protect, authorizeRoles('Admin', 'Artisan'), updateProduct);

// Admin or owning Artisan can delete
router.delete('/:id', protect, authorizeRoles('Admin', 'Artisan'), deleteProduct);

export default router;