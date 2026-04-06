import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        // Use MONGO_URI from environment, fallback to local MongoDB for development.
        const conn = await mongoose.connect(
            process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/global_handlooms'
        );

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;

