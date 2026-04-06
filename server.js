import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import marketingRoutes from './routes/marketingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startLogisticsEngine } from './services/logisticsEngine.js';
connectDB();

const app = express();

app.use(cors());
// INCREASED PAYLOAD LIMITS FOR WEB4 IMAGE UPLOADS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/user', userRoutes);

// Register centralized error handler as the last middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startLogisticsEngine();
});