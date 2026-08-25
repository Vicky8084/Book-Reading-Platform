package com.vicky.online_book_reading_platform.service;

import com.vicky.online_book_reading_platform.ResponseDTO.UserResponseDTO;
import com.vicky.online_book_reading_platform.converter.UserConverter;
import com.vicky.online_book_reading_platform.enums.Role;
import com.vicky.online_book_reading_platform.enums.Status;
import com.vicky.online_book_reading_platform.model.User;
import com.vicky.online_book_reading_platform.repository.UserRepository;
import com.vicky.online_book_reading_platform.requestDTO.UpdateNameRequestDTO;
import com.vicky.online_book_reading_platform.requestDTO.UserRequestDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Slf4j
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
        log.info("Registering user with email: {}", userRequestDTO.getEmail());
        Optional<User> optionalUser = userRepository.findByEmail(userRequestDTO.getEmail());

        //if User is already present then this exception will occur
        if(optionalUser.isPresent()){
            throw new RuntimeException("User Already Registered..");
        }

        //here converting userRequestDTO into User
        User user = UserConverter.convertUserRequestDTOIntoUser(userRequestDTO);
        log.info("User Request Dto is converted into user ");

        //now password is encoded
        user.setPasswordHash(passwordEncoder.encode(userRequestDTO.getPassword()));
        log.info("password in encrypted");

        User savedUser;
        if(user.getRole() == Role.USER){
            user.setStatus(Status.ACTIVE);
            savedUser = userRepository.save(user);
            log.info("User saved as ACTIVE with role USER, email: {}", savedUser.getEmail());
        }else if(user.getRole() == Role.PUBLISHER){
            user.setStatus(Status.INACTIVE);
            savedUser = userRepository.save(user);
            log.info("User saved as INACTIVE with role PUBLISHER, email: {}", savedUser.getEmail());
        }else {
            throw new RuntimeException("Invalid role provided");
        }
        return UserConverter.convertUserIntoUserResponseDTO(savedUser);
    }

    public UserResponseDTO updateUserName(String email, UpdateNameRequestDTO updateNameRequestDTO){
        Optional<User> userOptional = userRepository.findByEmail(email);
        if(userOptional.isEmpty()){
            throw new RuntimeException("User not Found..");
        }
        User user = userOptional.get();
        user.setName(updateNameRequestDTO.getName());

        return UserConverter.convertUserIntoUserResponseDTO(userRepository.save(user));
    }
}
