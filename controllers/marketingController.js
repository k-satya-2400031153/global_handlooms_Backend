import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Discount from '../models/Discount.js';
import Order from '../models/Order.js';

// Transporter (reused from auth, but could be separate in prod)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
    },
    family: 4
});

// ── BROADCAST EMAILS ──────────────────────────────────────────────
export const broadcastEmail = async (req, res, next) => {
    try {
        const { subject, htmlBody } = req.body;

        if (!subject || !htmlBody) {
            return res.status(400).json({ success: false, message: "Subject and HTML body are required." });
        }

        // Fetch all registered buyers
        const buyers = await User.find({ role: 'Buyer' }).select('email name');
        if (buyers.length === 0) {
            return res.status(400).json({ success: false, message: "No buyers found in the network." });
        }

        const bccList = buyers.map(b => b.email).join(', ');

        const mailOptions = {
            from: process.env.EMAIL,
            to: process.env.EMAIL, // Send to self
            bcc: bccList,          // BCC all buyers to protect privacy
            subject: `Global Handlooms: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 20px; border-radius: 8px; border: 1px solid #00f0ff;">
                    <h1 style="color: #00f0ff; text-align: center; margin-bottom: 30px;">GLOBAL HANDLOOMS</h1>
                    <div style="background: #111; padding: 20px; border-radius: 4px;">
                        ${htmlBody}
                    </div>
                    <p style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #333; padding-top: 20px;">
                        You are receiving this because you registered on the Global Handlooms decentralized network.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ success: true, message: `Broadcast deployed to ${buyers.length} buyers successfully.` });
    } catch (error) {
        console.error("Nodemailer Broadcast Error:", error);
        res.status(500).json({ success: false, message: "Server failed to deploy broadcast. Check SMTP credentials." });
    }
};

// ── DISCOUNTS CRUD ──────────────────────────────────────────────
export const createDiscount = async (req, res, next) => {
    try {
        const { title, percentage, isActive } = req.body;
        
        // If this one is set to active, deactivate all others automatically
        if (isActive) {
            await Discount.updateMany({}, { isActive: false });
        }

        const discount = await Discount.create({ title, percentage, isActive });
        res.status(201).json({ success: true, data: discount });
    } catch (error) {
        next(error);
    }
};

export const getDiscounts = async (req, res, next) => {
    try {
        const discounts = await Discount.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: discounts });
    } catch (error) {
        next(error);
    }
};

export const updateDiscountStatus = async (req, res, next) => {
    try {
        const { isActive } = req.body;
        
        if (isActive) {
            // Turn everything else off first
            await Discount.updateMany({}, { isActive: false });
        }

        const discount = await Discount.findByIdAndUpdate(req.params.id, { isActive }, { returnDocument: 'after' });
        if (!discount) return res.status(404).json({ success: false, message: 'Discount not found' });

        res.status(200).json({ success: true, data: discount });
    } catch (error) {
        next(error);
    }
};

export const deleteDiscount = async (req, res, next) => {
    try {
        await Discount.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Discount deleted' });
    } catch (error) {
        next(error);
    }
};

// ── PUBLIC ──────────────────────────────────────────────
export const getActiveDiscount = async (req, res, next) => {
    try {
        const active = await Discount.findOne({ isActive: true });
        res.status(200).json({ success: true, data: active || null });
    } catch (error) {
        next(error);
    }
};

// ── MARKETING ANALYTICS ─────────────────────────────────
export const getMarketingAnalytics = async (req, res, next) => {
    try {
        const orders = await Order.find({})
            .populate('buyerId', 'name email')
            .populate('products.productId', 'title originRegion materialsUsed');

        // Total buyers registered
        const totalBuyers = await User.countDocuments({ role: 'Buyer' });

        // Revenue per product
        const productMap = {};
        orders.forEach(order => {
            order.products.forEach(item => {
                const prod = item.productId;
                if (!prod) return;
                const id = prod._id.toString();
                if (!productMap[id]) {
                    productMap[id] = { title: prod.title, region: prod.originRegion, revenue: 0, unitsSold: 0, buyers: new Set() };
                }
                productMap[id].revenue += (item.price || 0) * item.quantity;
                productMap[id].unitsSold += item.quantity;
                if (order.buyerId) productMap[id].buyers.add(order.buyerId.email || order.buyerId._id.toString());
            });
        });

        const topProducts = Object.values(productMap)
            .map(p => ({ ...p, buyers: p.buyers.size }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 6);

        // Recent buyer activity (last 10 orders)
        const recentActivity = orders.slice(0, 10).map(o => ({
            buyerName: o.buyerId?.name || 'Unknown',
            buyerEmail: o.buyerId?.email || '—',
            status: o.status,
            total: o.totalAmount,
            items: o.products.map(p => p.productId?.title || 'Deleted').join(', '),
            createdAt: o.createdAt
        }));

        // Total revenue from delivered orders
        const totalRevenue = orders
            .filter(o => o.status === 'Delivered')
            .reduce((s, o) => s + (o.totalAmount || 0), 0);

        const totalOrders = orders.length;

        res.status(200).json({
            success: true,
            data: { topProducts, recentActivity, totalBuyers, totalRevenue, totalOrders }
        });
    } catch (error) {
        next(error);
    }
};
