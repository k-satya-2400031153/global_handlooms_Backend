import Product from '../models/Product.js';
import Discount from '../models/Discount.js';

// Fetch all products — supports ?search, ?material, ?region query params
export const getProducts = async (req, res, next) => {
    try {
        const { search, material, region } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { originRegion: { $regex: search, $options: 'i' } }
            ];
        }
        if (material) query.materialsUsed = { $in: [new RegExp(material, 'i')] };
        if (region)   query.originRegion  = { $regex: region, $options: 'i' };

        const products = await Product.find(query).populate('artisanId', 'name email storeName').sort({ createdAt: -1 });

        const activeDiscount = await Discount.findOne({ isActive: true });
        
        const data = products.map(p => {
            const doc = p.toObject();
            doc.originalPrice = doc.price;
            if (activeDiscount) {
                const discountAmount = (doc.price * activeDiscount.percentage) / 100;
                doc.price = Math.max(0, doc.price - discountAmount);
                doc.discountBadge = `${activeDiscount.percentage}% OFF`;
            }
            return doc;
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// Create a new product (Artisan / Admin)
export const createProduct = async (req, res, next) => {
    try {
        const { title, description, price, materialsUsed, originRegion, inventory, image } = req.body;
        const artisanId = req.user?.id || req.user?._id;

        if (!title || !price || !inventory) {
            return res.status(400).json({ success: false, message: "Title, price, and inventory are required." });
        }
        if (!artisanId) {
            return res.status(401).json({ success: false, message: "Not authorized to create product." });
        }

        const newProduct = await Product.create({
            artisanId, title, description, price,
            materialsUsed: Array.isArray(materialsUsed)
                ? materialsUsed
                : (materialsUsed ? materialsUsed.split(',').map(s => s.trim()).filter(Boolean) : []),
            originRegion, inventory,
            image: image || 'https://via.placeholder.com/400'
        });

        res.status(201).json({ success: true, message: "Product created successfully", data: newProduct });
    } catch (error) {
        next(error);
    }
};

// Update a product — Admin can update any; Artisan can only update their own
export const updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        const requesterId = req.user?.id || req.user?._id;

        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        if (product.artisanId.toString() !== requesterId && req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, message: "Not authorized to edit this product" });
        }

        const { title, price, inventory, originRegion, image, materialsUsed } = req.body;
        const updates = { title, price, inventory, originRegion, image };
        if (materialsUsed !== undefined) {
            updates.materialsUsed = Array.isArray(materialsUsed)
                ? materialsUsed
                : materialsUsed.split(',').map(s => s.trim()).filter(Boolean);
        }

        const updated = await Product.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true });
        res.status(200).json({ success: true, message: "Product updated", data: updated });
    } catch (error) {
        next(error);
    }
};

// Delete a product — Admin or owning Artisan
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        const requesterId = req.user?.id || req.user?._id;

        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        if (product.artisanId.toString() !== requesterId && req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, message: "Not authorized to delete this asset" });
        }

        await Product.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Asset removed from network" });
    } catch (error) {
        next(error);
    }
};