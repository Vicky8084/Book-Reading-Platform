package com.vicky.online_book_reading_platform.controller;

import com.vicky.online_book_reading_platform.requestDTO.ForgotPasswordRequestDTO;
import com.vicky.online_book_reading_platform.requestDTO.ResetPasswordRequestDTO;
import com.vicky.online_book_reading_platform.requestDTO.VerifyOtpRequestDTO;
import com.vicky.online_book_reading_platform.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Yeh controller USER aur PUBLISHER dono roles ke liye kaam karta hai,
// kyunki dono same User table/entity share karte hain (role field alag hota hai).
@RestController
@RequestMapping("/api/v1/password")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @Autowired
    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequestDTO dto) {
        passwordResetService.sendOtp(dto);
        // Generic message — yeh confirm nahi karta ki email exist karta hai ya nahi (security best practice)
        return ResponseEntity.status(HttpStatus.OK)
                .body("If an account exists with this email, an OTP has been sent.");
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(@Valid @RequestBody VerifyOtpRequestDTO dto) {
        passwordResetService.verifyOtp(dto);
        return ResponseEntity.status(HttpStatus.OK).body("OTP verified successfully.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequestDTO dto) {
        passwordResetService.resetPassword(dto);
        return ResponseEntity.status(HttpStatus.OK).body("Password reset successful. Please login with your new password.");
    }
}