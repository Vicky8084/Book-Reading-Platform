package com.vicky.online_book_reading_platform.ResponseDTO;

import lombok.Data;

@Data
public class ProgressResponseDTO {
    private int lastPageRead;
    private Integer totalPages;
}