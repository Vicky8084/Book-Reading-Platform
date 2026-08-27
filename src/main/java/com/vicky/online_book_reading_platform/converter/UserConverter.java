package com.vicky.online_book_reading_platform.converter;

import com.vicky.online_book_reading_platform.ResponseDTO.UserResponseDTO;
import com.vicky.online_book_reading_platform.requestDTO.UserRequestDTO;
import com.vicky.online_book_reading_platform.model.User;

public class UserConverter {
    public static User convertUserRequestDTOIntoUser(UserRequestDTO userRequestDTO){
        User user = new User();
        user.setName(userRequestDTO.getName());
        user.setEmail(userRequestDTO.getEmail());
        user.setRole(userRequestDTO.getRole());
        user.setAge(userRequestDTO.getAge());
        user.setPhoneNumber(userRequestDTO.getPhoneNumber());
        return user;
    }

    public static UserResponseDTO convertUserIntoUserResponseDTO(User user){
        UserResponseDTO userResponseDTO = new UserResponseDTO();
        userResponseDTO.setId(user.getId());
        userResponseDTO.setName(user.getName());
        userResponseDTO.setEmail(user.getEmail());
        userResponseDTO.setRole(user.getRole());
        userResponseDTO.setPhoneNumber(user.getPhoneNumber());
        userResponseDTO.setCreatedAt(user.getCreatedAt());
        userResponseDTO.setUpdatedAt(user.getUpdatedAt());
        userResponseDTO.setAge(user.getAge());
        userResponseDTO.setStatus(user.getStatus());
        return userResponseDTO;
    }
}