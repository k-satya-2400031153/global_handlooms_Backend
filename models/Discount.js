import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Discount title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    percentage: { 
        type: Number, 
        required: [true, 'Discount percentage is required'],
        min: [1, 'Percentage must be at least 1'],
        max: [99, 'Percentage cannot exceed 99']
    },
    isActive: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

export default mongoose.model('Discount', discountSchema);
