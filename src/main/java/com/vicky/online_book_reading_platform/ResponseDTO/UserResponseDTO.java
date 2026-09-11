package com.vicky.online_book_reading_platform.ResponseDTO;

import com.vicky.online_book_reading_platform.enums.Role;
import com.vicky.online_book_reading_platform.enums.UserStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserResponseDTO {
    private int id;
    private String name;
    private String email;
    private String phoneNumber;
    private int age;
    private Role role;
    private UserStatus userStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
