import Order from '../models/Order.js';
import Product from '../models/Product.js';

// Buyer: Create a new order
export const createOrder = async (req, res, next) => {
    try {
        const { products, shippingAddress, paymentId, paymentMode } = req.body;
        const buyerId = req.user.id;

        if (!products || products.length === 0) {
            return res.status(400).json({ success: false, message: "No products provided in order." });
        }

        let calculatedTotal = 0;
        const processedProducts = [];

        for (let item of products) {
            const product = await Product.findOneAndUpdate(
                { _id: item.productId, inventory: { $gte: item.quantity } },
                { $inc: { inventory: -item.quantity } },
                { returnDocument: 'before' }
            );
            if (!product) {
                return res.status(400).json({ success: false, message: `Transaction Failed: Insufficient stock or invalid asset ID.` });
            }
            calculatedTotal += product.price * item.quantity;
            processedProducts.push({ productId: product._id, quantity: item.quantity });
        }

        const trackingNumber = 'GH' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

        const newOrder = await Order.create({
            buyerId,
            products: processedProducts,
            totalAmount: calculatedTotal,
            shippingAddress: shippingAddress || null,
            paymentId: paymentId || 'SIMULATED-' + Date.now(),
            paymentMode: paymentMode || 'UPI',
            trackingNumber
        });

        res.status(201).json({ success: true, message: "Order placed successfully!", data: newOrder });
    } catch (error) {
        next(error);
    }
};

// Buyer: Get their own orders
export const getUserOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ buyerId: req.user.id })
            .populate('products.productId', 'title price image')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};

// Buyer: Cancel one of their orders
export const cancelOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: "Transaction not found." });
        if (order.buyerId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: "Not authorized to cancel this transaction." });
        }
        for (let item of order.products) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { inventory: item.quantity } });
        }
        await Order.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Transaction Voided. Assets refunded to network." });
    } catch (error) {
        next(error);
    }
};

// ADMIN: Get ALL orders across the entire platform
export const getAllOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({})
            .populate('buyerId', 'name email role')
            .populate('products.productId', 'title price image')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};

// ADMIN: Update the status of any order
export const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });
        res.status(200).json({ success: true, message: `Order updated to ${status}`, data: order });
    } catch (error) {
        next(error);
    }
};

// ADMIN: Toggle Auto-Fulfillment
export const updateAutoFulfill = async (req, res, next) => {
    try {
        const { autoFulfillment } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id, 
            { autoFulfillment }, 
            { returnDocument: 'after' }
        );
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });
        res.status(200).json({ success: true, message: `Auto-Fulfillment set to ${autoFulfillment}`, data: order });
    } catch (error) {
        next(error);
    }
};