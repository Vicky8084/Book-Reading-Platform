package com.vicky.online_book_reading_platform.ResponseDTO;

import com.vicky.online_book_reading_platform.enums.Role;
import com.vicky.online_book_reading_platform.enums.Status;
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
    private Status status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
