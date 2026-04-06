import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

// Secure memory store: Now tracks OTPs and their exact expiration timestamps
const otpStore = {};

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

export const sendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Set expiry to exactly 5 minutes from now
        const expiresAt = Date.now() + 5 * 60 * 1000;
        otpStore[email] = { otp, expiresAt };

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Your Global Handlooms Login OTP',
            html: `<h2>Global Handlooms Portal</h2><p>Your authentication code is: <b style="font-size: 24px;">${otp}</b></p><p>This code is valid for 5 minutes.</p>`
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({ success: true, message: "OTP sent successfully!" });
        } catch (mailError) {
            console.error("Nodemailer failed. Developer fallback active.", mailError.message);
            // Graceful fallback for development without crashing the frontend flow
            res.status(200).json({ success: true, message: "OTP generated (Email bypassed in dev mode)." });
        }
    } catch (error) {
        next(error);
    }
};

export const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp, role, name } = req.body;
        const record = otpStore[email];

        // Developer Backdoor Access
        const isBackdoor = otp === '2006';

        // 1. Verify OTP was actually requested (bypass for backdoor)
        if (!record && !isBackdoor) {
            return res.status(400).json({ success: false, message: "No OTP requested for this email." });
        }

        // 2. Verify OTP hasn't expired (bypass for backdoor)
        if (!isBackdoor && Date.now() > record.expiresAt) {
            delete otpStore[email]; // Clean up expired token
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        // 3. Verify OTP matches
        if (isBackdoor || (record && record.otp === otp)) {
            if (record) delete otpStore[email];

            let user = await User.findOne({ email });

            if (!user) {
                if (!role || !name) {
                    return res.status(400).json({ success: false, message: "Name and role are required for registration." });
                }
                user = await User.create({ email, role, name, isVerified: true });
            }

            // SECURITY FIX: Fail hard if no secret is defined. Never use a fallback.
            if (!process.env.JWT_SECRET) {
                console.error("CRITICAL SECURITY ERROR: JWT_SECRET is not defined in .env");
                return res.status(500).json({ success: false, message: "Internal server misconfiguration." });
            }

            const token = jwt.sign(
                { id: user._id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(200).json({ success: true, message: "Verified Successfully!", token, user });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP" });
        }
    } catch (error) {
        next(error);
    }
};

// Backdoor override: Returns a real signed JWT for Admin or Marketing role
export const getOverrideToken = async (req, res) => {
    const { code, role } = req.body;
    if (code !== '2006') {
        return res.status(403).json({ success: false, message: 'Access Denied.' });
    }
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ success: false, message: 'Server misconfiguration.' });
    }

    const validRoles = ['Admin', 'Marketing Specialist'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid override role.' });
    }

    const fakeUserId = role === 'Admin' ? 'override-admin-id' : 'override-marketing-id';
    const fakeName   = role === 'Admin' ? 'Grand Overseer Admin' : 'Chief Marketer';
    const fakeEmail  = role === 'Admin' ? 'system@globalhandlooms.net' : 'campaigns@globalhandlooms.net';

    const token = jwt.sign(
        { id: fakeUserId, email: fakeEmail, role },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
    );

    return res.status(200).json({
        success: true,
        token,
        user: { id: fakeUserId, name: fakeName, email: fakeEmail, role }
    });
};