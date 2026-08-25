package com.vicky.online_book_reading_platform.requestDTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateNameRequestDTO {
    @NotBlank(message = "Name is required")
    private String name;
}
