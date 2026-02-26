import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns'; // <-- Naya Import

// 🚨 Network issue fix: Forces Node.js to use IPv4 instead of IPv6
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const otpStore = {};

// Secure Transporter Setup with Forced IPv4
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587, // 465 ki jagah 587
    secure: false, // 587 ke liye isko false karna padta hai
    requireTLS: true, // TLS enable kar diya
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
    },
    family: 4
});

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Your Global Handlooms Login OTP',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
                <h2>Global Handlooms Artisan Portal</h2>
                <p>Your authentication code is:</p>
                <h1 style="color: #4f46e5; letter-spacing: 5px;">${otp}</h1>
                <p>This code is valid for 5 minutes.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP successfully sent to: ${email}`);
        res.status(200).json({ message: "OTP sent successfully!" });
    } catch (error) {
        console.error("❌ Nodemailer Error:", error);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (otpStore[email] && otpStore[email] === otp) {
        delete otpStore[email];
        res.status(200).json({ message: "OTP Verified Successfully!" });
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});