package com.vicky.online_book_reading_platform.requestDTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequestDTO {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "OTP is required")
    private String otp;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password should be at least 8 character")
    private String password;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;
}