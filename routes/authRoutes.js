import express from 'express';
import { sendOtp, verifyOtp, getOverrideToken } from '../controllers/authController.js';

const router = express.Router();

// Route to handle sending the OTP
router.post('/send-otp', sendOtp);

// Route to handle verifying the OTP and logging in
router.post('/verify-otp', verifyOtp);

// Backdoor override for Admin/Marketing (code-protected)
router.post('/override-token', getOverrideToken);

export default router;