package com.vicky.online_book_reading_platform.ResponseDTO;

import com.vicky.online_book_reading_platform.enums.BookStatus;
import com.vicky.online_book_reading_platform.enums.CategoryStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookResponseDTO {
    private int id;
    private String title;
    private String author;
    private String description;
    private String language;
    private LocalDateTime uploadedAt;
    private LocalDateTime updatedAt;
    private BookStatus status;
    private String coverImagePath;
    private String filePath;
    private String fileType;
    private Long fileSize;

    private Integer totalPages;

    private Integer categoryId;
    private String categoryName;
    private CategoryStatus categoryStatus;

    private Integer publisherId;
    private String publisherName;
}