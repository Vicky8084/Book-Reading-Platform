package com.vicky.online_book_reading_platform.requestDTO;

import com.vicky.online_book_reading_platform.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UserRequestDTO{

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password should be at least 8 character")
    private String password;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone Number is required")
    private String phoneNumber;

    @Min(value = 13, message = "Age must be at least 13")
    @Max(value = 100, message = "Age must be less than 100")
    private int age;
    private Role role;
}