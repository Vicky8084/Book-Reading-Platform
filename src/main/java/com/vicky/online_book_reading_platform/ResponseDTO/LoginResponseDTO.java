package com.vicky.online_book_reading_platform.ResponseDTO;

import com.vicky.online_book_reading_platform.enums.Role;
import lombok.Data;

@Data
public class LoginResponseDTO {
    private boolean success;
    private String message;
    private int userId;
    private String userName;
    private String email;
    private String role;
    private Integer age;
    private String phoneNumber;
}
