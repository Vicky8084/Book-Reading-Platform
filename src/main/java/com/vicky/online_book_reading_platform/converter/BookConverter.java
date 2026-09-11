package com.vicky.online_book_reading_platform.converter;

import com.vicky.online_book_reading_platform.ResponseDTO.BookResponseDTO;
import com.vicky.online_book_reading_platform.model.Book;
import com.vicky.online_book_reading_platform.requestDTO.BookRequestDTO;

public class BookConverter {

    public static Book convertBookRequestDTOIntoBook(BookRequestDTO bookRequestDTO) {
        Book book = new Book();
        book.setTitle(bookRequestDTO.getTitle());
        book.setAuthor(bookRequestDTO.getAuthor());
        book.setDescription(bookRequestDTO.getDescription());
        book.setLanguage(bookRequestDTO.getLanguage());
        return book;
    }

    // Publisher ke apne endpoints (my-books / upload / update response) ke liye —
    // publisher apni hi book ka poora detail (raw filePath samet) dekh sakta hai
    public static BookResponseDTO convertBookIntoBookResponseDTO(Book book) {
        return convertBookIntoBookResponseDTO(book, true);
    }

    public static BookResponseDTO convertBookIntoBookResponseDTO(Book book, boolean includeFilePath) {
        BookResponseDTO dto = new BookResponseDTO();
        dto.setId(book.getId());
        dto.setTitle(book.getTitle());
        dto.setAuthor(book.getAuthor());
        dto.setDescription(book.getDescription());
        dto.setLanguage(book.getLanguage());
        dto.setUploadedAt(book.getUploadedAt());
        dto.setUpdatedAt(book.getUpdatedAt());
        dto.setStatus(book.getStatus());
        dto.setCoverImagePath(book.getCoverImagePath());
        if (includeFilePath) {
            dto.setFilePath(book.getFilePath());
        }
        dto.setFileType(book.getFileType());
        dto.setFileSize(book.getFileSize());
        dto.setTotalPages(book.getTotalPages());

        dto.setCategoryId(book.getCategory().getId());
        dto.setCategoryName(book.getCategory().getCategoryName());
        dto.setCategoryStatus(book.getCategory().getStatus());

        dto.setPublisherId(book.getPublisher().getId());
        dto.setPublisherName(book.getPublisher().getName());

        return dto;
    }
}