package com.vicky.online_book_reading_platform.exception;

/**
 * Thrown intentionally by service-layer code for expected business errors
 * (e.g. "User Already Registered", "Invalid credentials").
 *
 * The message on this exception is considered SAFE to show directly to the
 * end user. Anything else (NullPointerException, DB errors, etc.) is an
 * unexpected bug and must never leak its raw message to the client — see
 * GlobalExceptionHandler.
 */
public class AppException extends RuntimeException {
    public AppException(String message) {
        super(message);
    }
}