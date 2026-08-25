package com.vicky.online_book_reading_platform.converter;

import com.vicky.online_book_reading_platform.ResponseDTO.LoginResponseDTO;
import com.vicky.online_book_reading_platform.enums.Role;
import com.vicky.online_book_reading_platform.model.User;

public class LoginConverter {
    public static LoginResponseDTO convertUserIntoLoginResponseDTO(User user){
        LoginResponseDTO loginResponseDTO = new LoginResponseDTO();
        loginResponseDTO.setUserId(user.getId());
        loginResponseDTO.setUserName(user.getName());
        loginResponseDTO.setEmail(user.getEmail());
        loginResponseDTO.setRole(user.getRole().name());
        loginResponseDTO.setAge(user.getAge());
        loginResponseDTO.setPhoneNumber(user.getPhoneNumber());
        return loginResponseDTO;
    }

}
