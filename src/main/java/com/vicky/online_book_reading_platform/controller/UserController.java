package com.vicky.online_book_reading_platform.controller;

import com.vicky.online_book_reading_platform.ResponseDTO.UserResponseDTO;
import com.vicky.online_book_reading_platform.requestDTO.UpdateNameRequestDTO;
import com.vicky.online_book_reading_platform.requestDTO.UserRequestDTO;
import com.vicky.online_book_reading_platform.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService){
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> userRegister(@Valid @RequestBody UserRequestDTO userRequestDTO){
        UserResponseDTO userResponseDTO = userService.registerUser(userRequestDTO);
        return ResponseEntity.status(HttpStatus.OK).body(userResponseDTO);
    }

    @PostMapping("/update-user-name")
    public ResponseEntity<UserResponseDTO> updateUserName(@Valid @RequestBody UpdateNameRequestDTO updateNameRequestDTO, Authentication authentication){
        String email = authentication.getName();
        return ResponseEntity.status(HttpStatus.OK).body(userService.updateUserName(email, updateNameRequestDTO));
    }
}
