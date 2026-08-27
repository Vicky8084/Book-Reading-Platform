package com.vicky.online_book_reading_platform.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Intentional business errors (e.g. "User Already Registered", "Invalid credentials").
    // These messages are written for the end user, so it's safe to return them as-is.
    @ExceptionHandler(AppException.class)
    public ResponseEntity<String> handleAppException(AppException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    // @Valid annotation ke fields fail hone par yeh handler chalega
    // (e.g. "Name is required", "Password should be at least 8 character")
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<String> handleValidationException(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getDefaultMessage())
                .orElse("Invalid input");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
    }

    // Catch-all for anything unexpected (NullPointerException, DB errors, etc.).
    // The real exception is logged for debugging, but the client only ever
    // sees a generic message — never raw internal error details.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleUnexpectedException(Exception ex) {
        log.error("Unexpected error occurred", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Something went wrong. Please try again later.");
    }
}