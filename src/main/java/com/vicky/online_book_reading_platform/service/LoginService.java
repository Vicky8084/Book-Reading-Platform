package com.vicky.online_book_reading_platform.service;

import com.vicky.online_book_reading_platform.ResponseDTO.LoginResponseDTO;
import com.vicky.online_book_reading_platform.converter.LoginConverter;
import com.vicky.online_book_reading_platform.model.User;
import com.vicky.online_book_reading_platform.repository.UserRepository;
import com.vicky.online_book_reading_platform.requestDTO.LoginRequestDTO;
import com.vicky.online_book_reading_platform.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class LoginService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Value("${jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Autowired
    public LoginService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        AuthenticationManager authenticationManager,
                        JwtUtil jwtUtil){
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
    }

    public LoginResponseDTO login(LoginRequestDTO loginRequestDTO, HttpServletRequest request, HttpServletResponse response) {
        Optional<User> userOptional = userRepository.findByEmail(loginRequestDTO.getEmail());
        if (userOptional.isEmpty()) {
            LoginResponseDTO error = new LoginResponseDTO();
            error.setSuccess(false);
            error.setMessage("Invalid credentials");
            return error;
        }

        User user = userOptional.get();
        if (!passwordEncoder.matches(loginRequestDTO.getPassword(), user.getPasswordHash())) {
            LoginResponseDTO error = new LoginResponseDTO();
            error.setSuccess(false);
            error.setMessage("Invalid credentials");
            return error;
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequestDTO.getEmail(),
                        loginRequestDTO.getPassword()
                )
        );

        // Generating Token
        String jwtToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        ResponseCookie cookie = ResponseCookie.from("token", jwtToken)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(jwtExpirationMs / 1000)
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        LoginResponseDTO loginResponseDTO = LoginConverter.convertUserIntoLoginResponseDTO(user);
        loginResponseDTO.setSuccess(true);
        loginResponseDTO.setMessage("Login successful! Welcome back, " + user.getName());
        return loginResponseDTO;
    }
}