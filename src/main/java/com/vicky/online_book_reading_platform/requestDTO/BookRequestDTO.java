package com.vicky.online_book_reading_platform.requestDTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BookRequestDTO {
    @NotBlank(message = "Title is Required")
    private String title;

    @NotBlank(message = "Author is Required")
    private String author;

    private String description;

    @NotBlank(message = "Language is Required")
    private String language;

    private Integer categoryId;

    private String newCategoryName;

    private Integer newCategoryParentId;
}