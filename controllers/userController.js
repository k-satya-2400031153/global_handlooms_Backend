import User from '../models/User.js';
import Order from '../models/Order.js';

// GET /api/user/me — return logged-in user's profile + orders
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-__v');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
};

// PUT /api/user/me — update name and/or phone
export const updateMe = async (req, res, next) => {
    try {
        const { name, phone } = req.body;
        const updated = await User.findByIdAndUpdate(
            req.user.id,
            { name, phone },
            { returnDocument: 'after', runValidators: true }
        ).select('-__v');
        res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
};

// POST /api/user/address — add a new address to address book
export const addAddress = async (req, res, next) => {
    try {
        const { label, fullName, phone, addressLine1, city, state, pincode } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $push: { savedAddresses: { label, fullName, phone, addressLine1, city, state, pincode } } },
            { returnDocument: 'after' }
        );
        res.status(201).json({ success: true, data: user.savedAddresses });
    } catch (error) { next(error); }
};

// DELETE /api/user/address/:addrId — remove an address from address book
export const deleteAddress = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { savedAddresses: { _id: req.params.addrId } } },
            { returnDocument: 'after' }
        );
        res.status(200).json({ success: true, data: user.savedAddresses });
    } catch (error) { next(error); }
};

// GET /api/user/orders — all orders for logged-in buyer
export const getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ buyerId: req.user.id })
            .populate('products.productId', 'title price image originRegion')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) { next(error); }
};
