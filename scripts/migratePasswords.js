/**
 * ONE-TIME Migration Script
 * Sets the default password "Ksatyanarayana@2006" (bcrypt hashed) for all
 * existing users who do not yet have a password field.
 *
 * Run ONCE with: node backend/scripts/migratePasswords.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'Ksatyanarayana@2006';

// ── Inline schema (avoids circular imports) ──────────────────────────────────
const userSchema = new mongoose.Schema({
    email: String,
    role: String,
    name: String,
    password: String,
    isVerified: Boolean,
}, { timestamps: true, strict: false });

const User = mongoose.model('User', userSchema);

async function migrate() {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('❌ MONGO_URI not set in .env'); process.exit(1); }

    console.log('🔗 Connecting to MongoDB…');
    await mongoose.connect(uri);
    console.log('✅ Connected.\n');

    // Find users who have no password set yet
    const users = await User.find({ $or: [{ password: { $exists: false } }, { password: null }, { password: '' }] });
    console.log(`Found ${users.length} user(s) without a password.\n`);

    if (users.length === 0) {
        console.log('✅ All users already have a password. Nothing to do.');
        await mongoose.disconnect();
        return;
    }

    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    let updated = 0;
    for (const user of users) {
        await User.updateOne({ _id: user._id }, { $set: { password: hash } });
        console.log(`  ✔ Set password for: ${user.email} (${user.role})`);
        updated++;
    }

    console.log(`\n✅ Migration complete. Updated ${updated} user(s).`);
    console.log(`   Default password: ${DEFAULT_PASSWORD}`);
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
