import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    label:       { type: String, default: 'Home' },
    fullName:    { type: String },
    phone:       { type: String },
    addressLine1:{ type: String },
    city:        { type: String },
    state:       { type: String },
    pincode:     { type: String },
}, { _id: true });

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    role: {
        type: String,
        enum: {
            values: ['Admin', 'Artisan', 'Buyer', 'Marketing Specialist'],
            message: '{VALUE} is not a supported role'
        },
        required: true
    },
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long']
    },
    phone: { type: String, trim: true },
    // Artisan specific
    storeName: { type: String, trim: true },
    location: { type: String, trim: true },
    // Buyer — address book
    savedAddresses: [addressSchema],
    // Legacy field (kept for compatibility)
    shippingAddress: { type: String, trim: true },
    // Verification
    isVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);