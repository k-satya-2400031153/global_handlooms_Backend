package com.globalhandlooms.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.jwt.override-expiration}")
    private long overrideExpiration;

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String id, String email, String role) {
        return buildToken(id, email, role, jwtExpiration);
    }

    public String generateOverrideToken(String id, String email, String role) {
        return buildToken(id, email, role, overrideExpiration);
    }

    private String buildToken(String id, String email, String role, long expiration) {
        return Jwts.builder()
                .claim("id", id)
                .claim("email", email)
                .claim("role", role)
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getKey())
                .compact();
    }

    public Claims validateAndGetClaims(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UserPrincipal getPrincipal(String token) {
        Claims claims = validateAndGetClaims(token);
        String id    = claims.get("id", String.class);
        String email = claims.get("email", String.class);
        String role  = claims.get("role", String.class);
        return new UserPrincipal(id, email, role);
    }
}
