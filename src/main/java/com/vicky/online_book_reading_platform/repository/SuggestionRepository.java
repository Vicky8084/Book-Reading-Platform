package com.vicky.online_book_reading_platform.repository;

import com.vicky.online_book_reading_platform.model.Suggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SuggestionRepository extends JpaRepository<Suggestion, Integer> {
}
