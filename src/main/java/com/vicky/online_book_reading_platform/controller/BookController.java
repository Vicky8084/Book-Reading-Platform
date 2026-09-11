package com.vicky.online_book_reading_platform.controller;

import com.vicky.online_book_reading_platform.ResponseDTO.BookResponseDTO;
import com.vicky.online_book_reading_platform.ResponseDTO.ProgressResponseDTO;
import com.vicky.online_book_reading_platform.requestDTO.BookRequestDTO;
import com.vicky.online_book_reading_platform.requestDTO.ProgressRequestDTO;
import com.vicky.online_book_reading_platform.service.BookService;
import com.vicky.online_book_reading_platform.service.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/book")
public class BookController {

    private final BookService bookService;
    private final RecommendationService recommendationService;
    private final ObjectMapper objectMapper;

    @Autowired
    public BookController(BookService bookService,
                          RecommendationService recommendationService,
                          ObjectMapper objectMapper) {
        this.bookService = bookService;
        this.recommendationService = recommendationService;
        this.objectMapper = objectMapper;
    }

    // ===== PUBLIC — books.html / bookscreen.html ke liye =====

    @GetMapping("/public/all")
    public ResponseEntity<List<BookResponseDTO>> findAllPublished() {
        return ResponseEntity.ok(bookService.findAllPublishedBooks());
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<BookResponseDTO> findPublishedBookById(@PathVariable int id) {
        return ResponseEntity.ok(bookService.findPublishedBookById(id));
    }

    // Login hai to personalized recommendations, nahi to global popular books
    @GetMapping("/public/recommended")
    public ResponseEntity<List<BookResponseDTO>> getRecommended(Authentication authentication) {
        return ResponseEntity.ok(recommendationService.getRecommendations(resolveEmail(authentication)));
    }

    // Book "Read Now" click hone par call hoga — guest ke liye silently skip ho jaata hai
    @PostMapping("/public/{id}/read")
    public ResponseEntity<Void> trackRead(@PathVariable int id, Authentication authentication) {
        String email = resolveEmail(authentication);
        if (email != null) {
            recommendationService.trackRead(email, id);
        }
        return ResponseEntity.noContent().build();
    }

    // Anonymous (guest) user ke liye Authentication object bhi non-null milta hai
    // (AnonymousAuthenticationToken) — isliye email nikaalne se pehle ye check zaroori hai
    private String resolveEmail(Authentication authentication) {
        if (authentication == null || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return authentication.getName();
    }

    // ===== READER — login zaroori hai (koi bhi role: USER/PUBLISHER/ADMIN) =====
    // Note: ye "/public/" prefix ke andar jaan-boojh kar NAHI hain — SecurityConfig mein
    // in dono paths (do segments: /{id}/stream, /{id}/progress) ko permitAll nahi kiya,
    // isliye ye default ".anyRequest().authenticated()" rule follow karte hain — matlab
    // guest access nahi kar sakta, sirf logged-in users hi.

    // Frontend seedha Cloudinary URL kabhi nahi dekhta — hamesha ye apna backend endpoint
    // hi call karega, jo "inline" disposition ke saath PDF bytes deta hai
    @GetMapping("/{id}/stream")
    public ResponseEntity<byte[]> streamBook(@PathVariable int id) {
        byte[] pdfBytes = bookService.fetchPdfBytes(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"book-" + id + ".pdf\"")
                .body(pdfBytes);
    }

    // Reader har page-change par (debounced) isko call karega
    @PutMapping("/{id}/progress")
    public ResponseEntity<Void> saveProgress(
            @PathVariable int id,
            @RequestBody ProgressRequestDTO request,
            Authentication authentication) {
        recommendationService.updateProgress(authentication.getName(), id, request.getPageNumber());
        return ResponseEntity.noContent().build();
    }

    // Reader page load hote hi isko call karega — "Continue Reading" (resume) ke liye
    @GetMapping("/{id}/progress")
    public ResponseEntity<ProgressResponseDTO> getProgress(@PathVariable int id, Authentication authentication) {
        BookResponseDTO book = bookService.findPublishedBookById(id);

        ProgressResponseDTO response = new ProgressResponseDTO();
        response.setLastPageRead(recommendationService.getLastReadPage(authentication.getName(), id));
        response.setTotalPages(book.getTotalPages());
        return ResponseEntity.ok(response);
    }

    // ===== PUBLISHER-ONLY =====

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<BookResponseDTO> uploadBook(
            @RequestPart("book") String bookRequestDTOJson,
            @RequestPart("pdfFile") MultipartFile pdfFile,
            @RequestPart("coverImage") MultipartFile coverImage,
            Authentication authentication) throws IOException {

        BookRequestDTO bookRequestDTO = objectMapper.readValue(bookRequestDTOJson, BookRequestDTO.class);
        BookResponseDTO response = bookService.uploadBook(bookRequestDTO, pdfFile, coverImage, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my-books")
    public ResponseEntity<List<BookResponseDTO>> findMyBooks(Authentication authentication) {
        return ResponseEntity.ok(bookService.findMyBooks(authentication.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookResponseDTO> updateBook(
            @PathVariable int id,
            @RequestBody BookRequestDTO bookRequestDTO,
            Authentication authentication) {
        return ResponseEntity.ok(bookService.updateBook(id, bookRequestDTO, authentication.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable int id, Authentication authentication) {
        bookService.deleteBook(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}