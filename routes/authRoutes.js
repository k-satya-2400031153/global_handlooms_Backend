import express from 'express';
import { sendOtp, verifyOtp, forgotPassword, getOverrideToken, setPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to handle sending the OTP (login / register)
router.post('/send-otp', sendOtp);

// Route to handle verifying the OTP and logging in
router.post('/verify-otp', verifyOtp);

// Forgot password — sends a password-reset branded OTP to registered email
router.post('/forgot-password', forgotPassword);

// Set / change password — requires valid JWT (logged-in users only)
router.post('/set-password', protect, setPassword);

// Backdoor override for Admin/Marketing (code-protected)
router.post('/override-token', getOverrideToken);

export default router;