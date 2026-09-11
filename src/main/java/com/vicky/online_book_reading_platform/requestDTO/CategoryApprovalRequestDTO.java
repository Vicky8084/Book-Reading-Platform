package com.vicky.online_book_reading_platform.requestDTO;

import lombok.Data;

@Data
public class CategoryApprovalRequestDTO {

    // Optional — agar admin approve karte waqt naam clean karna chahta hai
    // e.g. "sci-fic" -> "Science Fiction"
    private String newCategoryName;

    // Optional — agar admin ise kisi existing category ki subcategory banana chahta hai
    private Integer parentCategoryId;

    // Optional — agar ye duplicate hai, to admin isay approve na karke
    // is existing (already APPROVED) category mein MERGE kar sakta hai
    private Integer mergeIntoCategoryId;
}