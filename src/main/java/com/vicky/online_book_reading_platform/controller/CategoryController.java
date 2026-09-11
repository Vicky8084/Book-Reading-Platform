package com.vicky.online_book_reading_platform.controller;

import com.vicky.online_book_reading_platform.ResponseDTO.CategoryResponseDTO;
import com.vicky.online_book_reading_platform.requestDTO.CategoryApprovalRequestDTO;
import com.vicky.online_book_reading_platform.requestDTO.CategoryRequestDTO;
import com.vicky.online_book_reading_platform.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/category")
public class CategoryController {

    private final CategoryService categoryService;

    @Autowired
    public CategoryController(CategoryService categoryService){
        this.categoryService = categoryService;
    }

    // Kisi bhi logged-in Publisher/User se aa sakta hai — naya category/subcategory suggest karna
    @PostMapping("/suggest")
    public ResponseEntity<CategoryResponseDTO> suggestCategory(@Valid @RequestBody CategoryRequestDTO categoryRequestDTO){
        return ResponseEntity.status(HttpStatus.OK).body(categoryService.saveCategory(categoryRequestDTO));
    }

    // Public — books.js/bookscreen.js ka dropdown/filter populate karega
    @GetMapping("/findAll")
    public ResponseEntity<List<CategoryResponseDTO>> findAllApproved(){
        return ResponseEntity.ok(categoryService.findAllApproved());
    }

    // Admin-only
    @GetMapping("/pending")
    public ResponseEntity<List<CategoryResponseDTO>> findAllPending(){
        return ResponseEntity.ok(categoryService.findAllPending());
    }

    // Admin-only — body optional hai: plain approve, ya rename/reparent/merge karke approve
    @PostMapping("/approve/{id}")
    public ResponseEntity<CategoryResponseDTO> approveCategory(
            @PathVariable int id,
            @RequestBody(required = false) CategoryApprovalRequestDTO request){
        return ResponseEntity.ok(categoryService.approveCategory(id, request));
    }

    // Admin-only
    @PostMapping("/reject/{id}")
    public ResponseEntity<CategoryResponseDTO> rejectCategory(@PathVariable int id){
        return ResponseEntity.ok(categoryService.rejectCategory(id));
    }
}