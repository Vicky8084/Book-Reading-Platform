package com.vicky.online_book_reading_platform.model;

import com.vicky.online_book_reading_platform.enums.SuggestionStatus;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "suggestion_table")
@Data
public class Suggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false)
    private String suggestedTitle;

    private String author;

    @Column(columnDefinition = "TEXT")
    private String suggestionReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SuggestionStatus suggestionStatus = SuggestionStatus.PENDING;

    @Column(nullable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // Admin notes for approval/rejection
    @Column(columnDefinition = "TEXT")
    private String adminNotes;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}