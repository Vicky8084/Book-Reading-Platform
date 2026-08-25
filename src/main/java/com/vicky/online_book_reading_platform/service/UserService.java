package com.vicky.online_book_reading_platform.service;

import com.vicky.online_book_reading_platform.ResponseDTO.UserResponseDTO;
import com.vicky.online_book_reading_platform.converter.UserConverter;
import com.vicky.online_book_reading_platform.model.User;
import com.vicky.online_book_reading_platform.repository.UserRepository;
import com.vicky.online_book_reading_platform.requestDTO.UserRequestDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder){
        this.userRepository=userRepository;
        this.passwordEncoder=passwordEncoder;
    }

    public UserResponseDTO registerUser(UserRequestDTO userRequestDTO){
        Optional<User> optionalUser = userRepository.findByEmail(userRequestDTO.getEmail());
        if(optionalUser.isPresent()){
            throw new RuntimeException("User Already Registered..");
        }

        User user = UserConverter.convertUserRequestDTOIntoUser(userRequestDTO);
        user.setPasswordHash(passwordEncoder.encode(userRequestDTO.getPassword()));
        userRepository.save(user);
        return UserConverter.convertUserIntoUserResponseDTO(user);
    }

    public UserResponseDTO updateUserName(String email, UserRequestDTO userRequestDTO){
        Optional<User> userOptional = userRepository.findByEmail(email);
        if(userOptional.isEmpty()){
            throw new RuntimeException("User not Found..");
        }
        User user = userOptional.get();
        user.setName(userRequestDTO.getName());

        return UserConverter.convertUserIntoUserResponseDTO(userRepository.save(user));
    }
}
