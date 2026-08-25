package com.vicky.online_book_reading_platform.controller;

import com.vicky.online_book_reading_platform.ResponseDTO.LoginResponseDTO;
import com.vicky.online_book_reading_platform.requestDTO.LoginRequestDTO;
import com.vicky.online_book_reading_platform.service.LoginService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/login")
public class LoginController {

    private final LoginService loginService;

    @Autowired
    public LoginController(LoginService loginService){
        this.loginService = loginService;
    }

    @PostMapping("/")
    public ResponseEntity<LoginResponseDTO> loginResponseDTO(@Valid @RequestBody LoginRequestDTO loginRequestDTO,
                                                             HttpServletRequest request,
                                                             HttpServletResponse response){
        LoginResponseDTO loginResponseDTO = loginService.login(loginRequestDTO, request, response);
        return ResponseEntity.status(HttpStatus.OK).body(loginResponseDTO);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletResponse response){
        ResponseCookie cookie = ResponseCookie.from("token", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.ok("Logged out successfully");
    }

}
