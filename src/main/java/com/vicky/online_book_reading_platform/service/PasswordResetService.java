package com.vicky.online_book_reading_platform.service;

import com.vicky.online_book_reading_platform.exception.AppException;
import com.vicky.online_book_reading_platform.model.User;
import com.vicky.online_book_reading_platform.repository.UserRepository;
import com.vicky.online_book_reading_platform.requestDTO.ForgotPasswordRequestDTO;
import com.vicky.online_book_reading_platform.requestDTO.ResetPasswordRequestDTO;
import com.vicky.online_book_reading_platform.requestDTO.VerifyOtpRequestDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Note: Yeh service User aur Publisher DONO ke liye kaam karta hai — kyunki
 * dono ek hi User entity/table use karte hain (role field se differentiate
 * hota hai).
 *
 * Is version me 2 extra protections hain:
 * 1. Rate limiting  -> ek email se 1 minute me kitni baar OTP maanga ja sakta hai
 * 2. Brute-force lock -> OTP verify karte waqt max galat attempts allowed
 *    (yeh Lua script se atomically hota hai, taaki parallel requests se
 *    limit bypass na ho sake - race condition safe)
 */
@Service
@Slf4j
public class PasswordResetService {

    private static final Duration OTP_TTL = Duration.ofMinutes(2);
    private static final Duration VERIFIED_TTL = Duration.ofMinutes(5);
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(1);

    private static final int MAX_OTP_REQUESTS_PER_WINDOW = 3; // per email, per minute
    private static final int MAX_OTP_VERIFY_ATTEMPTS = 5;     // per OTP

    private static final String OTP_PREFIX = "otp:reset:";
    private static final String VERIFIED_PREFIX = "otp:reset:verified:";
    private static final String RATE_LIMIT_PREFIX = "otp:ratelimit:";
    private static final String ATTEMPTS_PREFIX = "otp:attempts:";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final RedisTemplate<String, String> redisTemplate;
    private final RedisScript<String> verifyOtpScript;
    private final SecureRandom secureRandom = new SecureRandom();

    @Autowired
    public PasswordResetService(UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                EmailService emailService,
                                RedisTemplate<String, String> redisTemplate,
                                @Qualifier("verifyOtpScript") RedisScript<String> verifyOtpScript) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.redisTemplate = redisTemplate;
        this.verifyOtpScript = verifyOtpScript;
    }

    // ============ Step 1: OTP generate karke Redis me daalna aur email karna ============
    public void sendOtp(ForgotPasswordRequestDTO dto) {
        // Sabse pehle rate-limit check - taaki spam requests DB/email tak
        // pahunche hi nahi, jitni jaldi ho reject kar do
        checkRateLimit(dto.getEmail());

        Optional<User> userOptional = userRepository.findByEmail(dto.getEmail());

        // Email exist karta hai ya nahi - yeh reveal nahi karte (security best practice).
        // Isliye rate-limit ke baad bhi, yahan chup-chaap return kar dete hain.
        if (userOptional.isEmpty()) {
            log.info("Forgot-password requested for non-existing email: {}", dto.getEmail());
            return;
        }

        User user = userOptional.get();
        String otp = generateOtp();

        redisTemplate.opsForValue().set(OTP_PREFIX + user.getEmail(), otp, OTP_TTL);

        // Naya OTP generate hote hi purana verified-flag aur attempts-counter clear
        // kar do, warna purana state naye OTP ke saath conflict kar sakta hai
        redisTemplate.delete(VERIFIED_PREFIX + user.getEmail());
        redisTemplate.delete(ATTEMPTS_PREFIX + user.getEmail());

        emailService.sendOtpEmail(user, otp);
        log.info("Password reset OTP generated (Redis) for: {}", user.getEmail());
    }

    // ============ Step 2: OTP verify karna (Lua script se atomic + attempt-limited) ============
    public void verifyOtp(VerifyOtpRequestDTO dto) {
        String otpKey = OTP_PREFIX + dto.getEmail();
        String attemptsKey = ATTEMPTS_PREFIX + dto.getEmail();

        // execute() Lua script Redis ko bhejta hai. KEYS list pehle, phir ARGV list -
        // yeh Redis convention hai taaki Redis Cluster mode me bhi sahi node par
        // script route ho sake. Poora script ek atomic unit ki tarah chalta hai,
        // isliye parallel requests se attempt-limit bypass nahi ho sakta.
        String result = redisTemplate.execute(
                verifyOtpScript,
                List.of(otpKey, attemptsKey),
                dto.getOtp(),
                String.valueOf(MAX_OTP_VERIFY_ATTEMPTS),
                String.valueOf(OTP_TTL.getSeconds())
        );

        switch (result) {
            case "OK" -> {
                redisTemplate.opsForValue().set(VERIFIED_PREFIX + dto.getEmail(), "true", VERIFIED_TTL);
                log.info("OTP verified (Redis) for: {}", dto.getEmail());
            }
            case "EXPIRED" -> throw new AppException("OTP has expired or was never requested. Please request a new one");
            case "LOCKED" -> throw new AppException("Too many wrong attempts. Please request a new OTP");
            case "WRONG" -> throw new AppException("Invalid OTP");
            default -> throw new AppException("Something went wrong. Please try again");
        }
    }

    // ============ Step 3: Password reset karna ============
    public void resetPassword(ResetPasswordRequestDTO dto) {
        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new AppException("Invalid email or OTP"));

        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            throw new AppException("Password and Confirm Password do not match");
        }

        // Verified-flag hi kaafi hai yahan check karne ke liye - agar user verify-otp
        // step se successfully guzra hai, tabhi yeh flag set hua hoga (5 min TTL ke saath)
        String verifiedFlag = redisTemplate.opsForValue().get(VERIFIED_PREFIX + dto.getEmail());
        if (verifiedFlag == null) {
            throw new AppException("Please verify OTP before resetting password");
        }

        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        userRepository.save(user);

        // Cleanup - saari reset-related keys turant delete (TTL se bhi hoti,
        // par turant hata dena behtar hai taaki koi reuse na kar sake)
        redisTemplate.delete(OTP_PREFIX + dto.getEmail());
        redisTemplate.delete(VERIFIED_PREFIX + dto.getEmail());
        redisTemplate.delete(ATTEMPTS_PREFIX + dto.getEmail());

        log.info("Password reset successful (Redis) for: {}", user.getEmail());
    }

    // ============ Helper: Rate limiting ============
    private void checkRateLimit(String email) {
        String rateLimitKey = RATE_LIMIT_PREFIX + email;

        // increment() Redis ka INCR command call karta hai - yeh khud hi atomic hai,
        // isliye parallel requests aane par bhi count sahi hi rahega
        Long currentCount = redisTemplate.opsForValue().increment(rateLimitKey);

        // Sirf pehli request par hi TTL set karo (jab count 1 aaye) - warna
        // har request par window reset ho jaayega aur limit kabhi lagegi hi nahi
        if (currentCount != null && currentCount == 1L) {
            redisTemplate.expire(rateLimitKey, RATE_LIMIT_WINDOW);
        }

        if (currentCount != null && currentCount > MAX_OTP_REQUESTS_PER_WINDOW) {
            throw new AppException("Too many OTP requests. Please try again after some time.");
        }
    }

    private String generateOtp() {
        int otp = 1000 + secureRandom.nextInt(9000); // 4-digit: 1000-9999
        return String.valueOf(otp);
    }
}