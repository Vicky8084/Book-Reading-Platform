package com.vicky.online_book_reading_platform.ResponseDTO;

import com.vicky.online_book_reading_platform.enums.CategoryStatus;
import lombok.Data;

@Data
public class CategoryResponseDTO {
    private int id;
    private String categoryName;
    private String description;
    private CategoryStatus status;

    private Integer parentCategoryId;
    private String parentCategoryName;
}