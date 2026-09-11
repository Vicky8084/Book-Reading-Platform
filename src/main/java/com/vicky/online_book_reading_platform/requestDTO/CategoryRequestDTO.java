package com.vicky.online_book_reading_platform.requestDTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CategoryRequestDTO {

    @NotBlank(message = "Category name is required")
    private String categoryName;

    private String description;

    // null hoga agar yeh top-level category hai, warna parent ki id
    private Integer parentCategoryId;
}