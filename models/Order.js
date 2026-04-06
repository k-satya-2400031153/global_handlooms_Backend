import mongoose from 'mongoose';

const shippingAddressSchema = new mongoose.Schema({
    fullName:     { type: String, required: true, trim: true },
    phone:        { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city:         { type: String, required: true, trim: true },
    state:        { type: String, required: true, trim: true },
    pincode:      { type: String, required: true, trim: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    buyerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'Buyer ID is required'] 
    },
    products: [{
        productId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Product',
            required: [true, 'Product ID is required']
        },
        quantity: { 
            type: Number, 
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1']
        }
    }],
    totalAmount: { 
        type: Number, 
        required: [true, 'Total amount is required'],
        min: [0, 'Total amount cannot be negative']
    },
    shippingAddress: { type: shippingAddressSchema, required: false },
    paymentId:    { type: String, trim: true, default: 'SIMULATED' },
    paymentMode:  { type: String, trim: true, default: 'UPI' },
    status: {
        type: String,
        enum: {
            values: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
            message: '{VALUE} is not a valid order status'
        },
        default: 'Pending'
    },
    trackingNumber: { type: String, trim: true },
    autoFulfillment: { type: Boolean, default: true },
    trackingHistory: [{
        status: { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'] },
        location: { type: String },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);