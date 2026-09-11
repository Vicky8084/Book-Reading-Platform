package com.vicky.online_book_reading_platform.converter;

import com.vicky.online_book_reading_platform.ResponseDTO.CategoryResponseDTO;
import com.vicky.online_book_reading_platform.model.Category;
import com.vicky.online_book_reading_platform.requestDTO.CategoryRequestDTO;

public class CategoryConverter {

    public static Category convertCategoryRequestDTOIntoCategory(CategoryRequestDTO categoryRequestDTO){
        Category category = new Category();
        category.setCategoryName(categoryRequestDTO.getCategoryName());
        category.setDescription(categoryRequestDTO.getDescription());
        return category;
    }

    public static CategoryResponseDTO convertCategoryIntoCategoryResponseDTO(Category category){
        CategoryResponseDTO categoryResponseDTO = new CategoryResponseDTO();
        categoryResponseDTO.setId(category.getId());
        categoryResponseDTO.setCategoryName(category.getCategoryName());
        categoryResponseDTO.setDescription(category.getDescription());
        categoryResponseDTO.setStatus(category.getStatus());
        if (category.getParentCategory() != null) {
            categoryResponseDTO.setParentCategoryId(category.getParentCategory().getId());
            categoryResponseDTO.setParentCategoryName(category.getParentCategory().getCategoryName());
        }

        return categoryResponseDTO;
    }
}