import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Secure memory store: tracks OTPs and their exact expiration timestamps
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

// ─────────────────────────────────────────────────────────────────
// PASSWORD VALIDATION HELPER
// Rules: min 6 chars, must contain '@', must contain at least one digit
// ─────────────────────────────────────────────────────────────────
function validatePassword(pw) {
    if (!pw || typeof pw !== 'string') return { valid: false, message: 'Password is required.' };
    if (pw.length < 6) return { valid: false, message: 'Password must be at least 6 characters.' };
    if (!pw.includes('@')) return { valid: false, message: 'Password must contain the @ symbol.' };
    if (!/\d/.test(pw)) return { valid: false, message: 'Password must contain at least one number.' };
    return { valid: true };
}

// ─────────────────────────────────────────────────────────────────
// SEND OTP
// ─────────────────────────────────────────────────────────────────
// SEND OTP  —  for LOGIN: verify password FIRST before sending OTP
// ─────────────────────────────────────────────────────────────────
export const sendOtp = async (req, res, next) => {
    try {
        const { email, password, isLogin } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required" });

        // ── PASSWORD CHECK (login flow only) ──────────────────────────────
        // If this is a login request (not registration), verify the password
        // against the stored bcrypt hash BEFORE sending the OTP.
        if (isLogin) {
            const user = await User.findOne({ email });
            if (user && user.password) {
                if (!password) {
                    return res.status(401).json({ success: false, message: "Password is required to sign in." });
                }
                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    return res.status(401).json({ success: false, message: "Invalid password. Please try again." });
                }
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
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
            res.status(200).json({ success: true, message: "OTP generated (Email bypassed in dev mode)." });
        }
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────
// VERIFY OTP
// On registration: expects { email, otp, role, name, password }
// password is validated & hashed before saving to DB
// ─────────────────────────────────────────────────────────────────
export const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp, role, name, password } = req.body;
        const record = otpStore[email];

        // Developer Backdoor Access
        const isBackdoor = otp === '2006';

        if (!record && !isBackdoor) {
            return res.status(400).json({ success: false, message: "No OTP requested for this email." });
        }
        if (!isBackdoor && Date.now() > record.expiresAt) {
            delete otpStore[email];
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (isBackdoor || (record && record.otp === otp)) {
            if (record) delete otpStore[email];

            let user = await User.findOne({ email });

            if (!user) {
                // ── NEW REGISTRATION ──────────────────────────────────────────
                if (!role || !name) {
                    return res.status(400).json({ success: false, message: "Name and role are required for registration." });
                }

                // Validate and hash the password provided by the new user
                // (applies to both real OTP registrations AND backdoor new user creation)
                const pwCheck = validatePassword(password);
                if (!pwCheck.valid) {
                    return res.status(400).json({ success: false, message: pwCheck.message });
                }
                const hashedPassword = await bcrypt.hash(password, 12);

                user = await User.create({ email, role, name, isVerified: true, password: hashedPassword });
            }

            if (!process.env.JWT_SECRET) {
                console.error("CRITICAL SECURITY ERROR: JWT_SECRET is not defined in .env");
                return res.status(500).json({ success: false, message: "Internal server misconfiguration." });
            }

            const token = jwt.sign(
                { id: user._id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Don't expose hashed password to frontend
            const safeUser = { ...user.toObject(), password: undefined };
            res.status(200).json({ success: true, message: "Verified Successfully!", token, user: safeUser });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP" });
        }
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────
// SET / CHANGE PASSWORD (Protected — logged-in users only)
// ─────────────────────────────────────────────────────────────────
export const setPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) {
            return res.status(400).json({ success: false, message: pwCheck.message });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await User.findByIdAndUpdate(req.user.id, { password: hashedPassword });
        res.status(200).json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — sends a password-reset branded OTP
// ─────────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email. Please register first.'
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000;
        otpStore[email] = { otp, expiresAt };

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: '🔑 Global Handlooms — Password Reset OTP',
            html: `
                <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#06061a;color:#e2e8f0;border-radius:16px;overflow:hidden;border:1px solid rgba(168,85,247,0.3)">
                    <div style="background:linear-gradient(90deg,#7c3aed,#0891b2,#a855f7);height:5px"></div>
                    <div style="padding:36px">
                        <h2 style="color:#a855f7;margin:0 0 8px">🔑 Password Reset Request</h2>
                        <p style="color:#9ca3af;margin:0 0 24px;font-size:13px">Global Handlooms · Secure Identity Portal</p>
                        <p style="margin:0 0 16px">Your one-time verification code is:</p>
                        <div style="background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.4);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
                            <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#a855f7;font-family:monospace">${otp}</span>
                        </div>
                        <p style="color:#9ca3af;font-size:12px;margin:0">⏱ Valid for <b style="color:#e2e8f0">5 minutes</b>. Do not share this code with anyone.</p>
                        <p style="color:#6b7280;font-size:11px;margin:16px 0 0">If you did not request this, you can safely ignore this email.</p>
                    </div>
                    <div style="background:rgba(255,255,255,0.03);padding:16px 36px;border-top:1px solid rgba(255,255,255,0.06)"><p style="color:#4b5563;font-size:11px;margin:0">© Global Handlooms · Web3 Artisan Marketplace</p></div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({ success: true, message: 'Password reset OTP sent to your email.' });
        } catch (mailErr) {
            console.error('Forgot-password mail failed (dev fallback):', mailErr.message);
            res.status(200).json({ success: true, message: 'OTP generated (email bypassed in dev mode).' });
        }
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────
// BACKDOOR OVERRIDE TOKEN (Admin / Marketing)
// ─────────────────────────────────────────────────────────────────
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
    const fakeName = role === 'Admin' ? 'Grand Overseer Admin' : 'Chief Marketer';
    const fakeEmail = role === 'Admin' ? 'system@globalhandlooms.net' : 'campaigns@globalhandlooms.net';

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