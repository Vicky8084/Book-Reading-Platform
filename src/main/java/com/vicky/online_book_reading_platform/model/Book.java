package com.vicky.online_book_reading_platform.model;


import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.vicky.online_book_reading_platform.enums.BookStatus;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "book_table")
@Data
public class Book {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "author",nullable = false)
    private String author;

    @Column(name = "description",nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "language",nullable = false)
    private String language;

    @Column(name = "uploaded_at", nullable = false)
    @CreationTimestamp
    private LocalDateTime uploadedAt;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(name = "file_name",nullable = false)
    private String fileName;

    @Enumerated(EnumType.STRING)
    @Column(name = "book_status",nullable = false)
    private BookStatus status;

    // physical path (relative) to stored file (pdf or text)
    @Column(name = "file_path",nullable = false)
    private String filePath;

    // cover image path (relative)
    @Column(name = "cover_image_path",nullable = false)
    private String coverImagePath;

    // file type, e.g. "pdf", "txt"
    @Column(name = "file_type")
    private String fileType;

    // file size in bytes
    @Column(name = "file_size",nullable = false)
    private Long fileSize;

    // extracted text
    @Column(name = "extracted_text",columnDefinition = "LONGTEXT")
    private String extractedText;

    @Column(name = "read_count", nullable = false)
    private long readCount = 0;

    @Column(name = "total_pages")
    private Integer totalPages;

    @ManyToOne
    @JoinColumn(name = "suggestion_id")
    @JsonManagedReference
    private Suggestion suggestion;

    @ManyToOne
    @JoinColumn(name = "publisher_id", nullable = false)
    @JsonManagedReference
    private User publisher;

    @ManyToOne
    @JoinColumn(name = "category_id",nullable = false)
    @JsonManagedReference
    private Category category;
}
