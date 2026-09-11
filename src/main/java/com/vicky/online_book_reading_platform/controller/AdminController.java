package com.vicky.online_book_reading_platform.controller;

import com.vicky.online_book_reading_platform.ResponseDTO.BookResponseDTO;
import com.vicky.online_book_reading_platform.ResponseDTO.UserResponseDTO;
import com.vicky.online_book_reading_platform.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AdminService adminService;

    @Autowired
    public AdminController(AdminService adminService){
        this.adminService=adminService;
    }

                    // ===== USER MANAGEMENT =====

    @PutMapping("/approve/{email}")
    public ResponseEntity<UserResponseDTO> approveUser(@PathVariable String email){
        return ResponseEntity.status(HttpStatus.OK).body(adminService.approveUser(email));
    }

    @PutMapping("/reject/{email}")
    public ResponseEntity<UserResponseDTO> rejectUser(@PathVariable String email){
        return ResponseEntity.status(HttpStatus.OK).body(adminService.rejectUser(email));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponseDTO>> findAllUsers(){
        return ResponseEntity.status(HttpStatus.OK).body(adminService.findAllUsers());
    }

    @GetMapping("/users/pending")
    public ResponseEntity<List<UserResponseDTO>> findAllPendingUsers(){
        return ResponseEntity.status(HttpStatus.OK).body(adminService.findAllPendingUsers());
    }

    @GetMapping("/users/approved")
    public ResponseEntity<List<UserResponseDTO>> findAllApprovedUsers(){
        return ResponseEntity.status(HttpStatus.OK).body(adminService.findAllApprovedUsers());
    }

                    // ===== BOOK MANAGEMENT =====

    @GetMapping("/books")
    public ResponseEntity<List<BookResponseDTO>> findAllBooks(){
        return ResponseEntity.ok(adminService.findAllBooks());
    }

    @GetMapping("/books/pending")
    public ResponseEntity<List<BookResponseDTO>> findPendingBooks(){
        return ResponseEntity.ok(adminService.findPendingBooks());
    }

    @PutMapping("/books/approve/{id}")
    public ResponseEntity<BookResponseDTO> approveBook(@PathVariable int id){
        return ResponseEntity.ok(adminService.approveBook(id));
    }

    @PutMapping("/books/reject/{id}")
    public ResponseEntity<BookResponseDTO> rejectBook(@PathVariable int id){
        return ResponseEntity.ok(adminService.rejectBook(id));
    }

    @DeleteMapping("/books/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable int id){
        adminService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }
}