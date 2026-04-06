import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Product title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    price: { 
        type: Number, 
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    inventory: { 
        type: Number, 
        required: [true, 'Inventory is required'],
        min: [0, 'Inventory cannot be negative']
    },
    originRegion: { 
        type: String, 
        required: [true, 'Origin region is required'],
        trim: true
    },
    materialsUsed: [{ 
        type: String,
        trim: true
    }],
    image: { 
        type: String,
        default: 'https://via.placeholder.com/400' // Fallback image
    }, 
    artisanId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'Artisan ID is required'] 
    }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);