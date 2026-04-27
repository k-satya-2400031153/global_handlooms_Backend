import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';

// ─── Nodemailer transporter (reuses the same Gmail creds as authController) ───
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

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE EMAIL  —  PhonePe-style receipt
// ─────────────────────────────────────────────────────────────────────────────
async function sendInvoiceEmail({ buyerEmail, buyerName, order, products }) {
    const date = new Date(order.createdAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    // Build itemised rows
    const rows = products.map(item => `
        <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#1a1a1a;font-size:14px">${item.title}</td>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#666;font-size:14px;text-align:center">×${item.quantity}</td>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#1a1a1a;font-size:14px;text-align:right;font-weight:600">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
        </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

    <!-- ── Header Strip ── -->
    <div style="background:linear-gradient(135deg,#5f259f 0%,#7b3fe4 100%);padding:32px 28px 24px;text-align:center">
      <div style="width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);text-align:center;line-height:64px;font-size:32px">🪡</div>
      </div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px">Global Handlooms</h1>
      <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px">Order Confirmation & Invoice</p>
    </div>

    <!-- ── Success Badge ── -->
    <div style="background:#f0faf0;padding:20px 28px;text-align:center;border-bottom:1px solid #e8f5e9">
      <div style="display:inline-flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:28px;height:28px;background:#22c55e;border-radius:50%;text-align:center;line-height:28px;font-size:16px;color:#fff;font-weight:900">✓</span>
        <span style="color:#16a34a;font-size:16px;font-weight:700">Payment Successful</span>
      </div>
      <div style="margin-top:8px;font-size:28px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px">₹${order.totalAmount.toLocaleString('en-IN')}</div>
      <div style="color:#888;font-size:12px;margin-top:4px">${date}</div>
    </div>

    <!-- ── Order Details ── -->
    <div style="padding:20px 28px 8px">
      <div style="background:#fafafa;border-radius:10px;padding:16px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Order ID</span>
          <span style="color:#5f259f;font-size:12px;font-weight:700;font-family:monospace">#${order._id.toString().slice(-8).toUpperCase()}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Tracking No.</span>
          <span style="color:#1a1a1a;font-size:12px;font-weight:700;font-family:monospace">${order.trackingNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Payment Mode</span>
          <span style="color:#1a1a1a;font-size:12px;font-weight:600">${order.paymentMode}</span>
        </div>
      </div>
    </div>

    <!-- ── Item Breakdown ── -->
    <div style="padding:0 28px 20px">
      <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px">Items Ordered</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="color:#aaa;font-size:11px;font-weight:500;text-align:left;padding:8px 0;border-bottom:2px solid #f0f0f0">Product</th>
            <th style="color:#aaa;font-size:11px;font-weight:500;text-align:center;padding:8px 0;border-bottom:2px solid #f0f0f0">Qty</th>
            <th style="color:#aaa;font-size:11px;font-weight:500;text-align:right;padding:8px 0;border-bottom:2px solid #f0f0f0">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <!-- Total row -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0 0;border-top:2px solid #5f259f;margin-top:4px">
        <span style="color:#1a1a1a;font-size:15px;font-weight:700">Total Paid</span>
        <span style="color:#5f259f;font-size:18px;font-weight:800">₹${order.totalAmount.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <!-- ── Shipping Address ── -->
    ${order.shippingAddress ? `
    <div style="padding:0 28px 20px">
      <div style="background:#fafafa;border-radius:10px;padding:16px">
        <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">Shipping To</p>
        <p style="color:#1a1a1a;font-size:14px;font-weight:600;margin:0 0 2px">${order.shippingAddress.fullName}</p>
        <p style="color:#555;font-size:13px;margin:0">${order.shippingAddress.addressLine1}${order.shippingAddress.addressLine2 ? ', ' + order.shippingAddress.addressLine2 : ''}</p>
        <p style="color:#555;font-size:13px;margin:0">${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pincode}</p>
        <p style="color:#888;font-size:13px;margin:4px 0 0">📞 ${order.shippingAddress.phone}</p>
      </div>
    </div>
    ` : ''}

    <!-- ── Footer ── -->
    <div style="background:#f7f7f7;padding:20px 28px;text-align:center;border-top:1px solid #eee">
      <p style="color:#888;font-size:12px;margin:0 0 4px">Thank you for shopping with <strong style="color:#5f259f">Global Handlooms</strong>!</p>
      <p style="color:#bbb;font-size:11px;margin:0">For support, reply to this email or contact us at ${process.env.EMAIL}</p>
    </div>

  </div>
</body>
</html>`;

    try {
        await transporter.sendMail({
            from: `Global Handlooms <${process.env.EMAIL}>`,
            to: buyerEmail,
            subject: `✅ Order Confirmed — ₹${order.totalAmount.toLocaleString('en-IN')} | ${order.trackingNumber}`,
            html
        });
        console.log(`📧 Invoice sent to ${buyerEmail}`);
    } catch (err) {
        // Non-fatal — log and continue
        console.error(`⚠️ Invoice email failed for ${buyerEmail}:`, err.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Buyer: Create a new order  (+ send invoice email on success)
// ─────────────────────────────────────────────────────────────────────────────
export const createOrder = async (req, res, next) => {
    try {
        const { products, shippingAddress, paymentId, paymentMode } = req.body;
        const buyerId = req.user.id;

        if (!products || products.length === 0) {
            return res.status(400).json({ success: false, message: "No products provided in order." });
        }

        let calculatedTotal = 0;
        const processedProducts = [];
        const productDetails = []; // for invoice

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
            productDetails.push({ title: product.title, price: product.price, quantity: item.quantity });
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

        // ── Send PhonePe-style invoice email ──────────────────────────────────
        const buyer = await User.findById(buyerId).select('email name');
        if (buyer) {
            sendInvoiceEmail({
                buyerEmail: buyer.email,
                buyerName: buyer.name,
                order: newOrder,
                products: productDetails
            }); // fire-and-forget (non-blocking)
        }

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
        const cancellableStatuses = ['Pending', 'Processing'];
        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({ success: false, message: `Order cannot be cancelled — it is already ${order.status}.` });
        }
        for (let item of order.products) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { inventory: item.quantity } });
        }
        await Order.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Order cancelled. Stock refunded." });
    } catch (error) {
        next(error);
    }
};

// ─── Buyer: Get invoice for a single order (must own the order) ───────────────
export const getOrderInvoice = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('products.productId', 'title price image');
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });
        if (order.buyerId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Not authorized to view this invoice." });
        }
        res.status(200).json({ success: true, data: order });
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

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        order.status = status;

        if (status !== 'Cancelled') {
            const locationMap = {
                'Processing':        'Artisan Hub (Admin Override)',
                'Shipped':           'In Transit (Admin Override)',
                'Out for Delivery':  'Local Delivery Hub (Admin Override)',
                'Delivered':         'Delivered to Customer (Admin Override)',
            };
            order.trackingHistory.push({
                status,
                location: locationMap[status] || 'System Update',
                timestamp: new Date(),
            });
        }

        await order.save();
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