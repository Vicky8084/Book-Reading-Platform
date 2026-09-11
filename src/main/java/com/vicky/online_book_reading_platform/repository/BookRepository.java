package com.vicky.online_book_reading_platform.repository;

import com.vicky.online_book_reading_platform.enums.BookStatus;
import com.vicky.online_book_reading_platform.model.Book;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, Integer> {
    List<Book> findByPublisher_Id(int publisherId);
    List<Book> findByStatus(BookStatus status);
    List<Book> findByStatusOrderByReadCountDesc(BookStatus status, Pageable pageable);

    // Ek category ke andar sabse zyada padhi gayi books, jo user ne already nahi padhi
    @Query("""
            SELECT b FROM Book b
            WHERE b.category.id = :categoryId
              AND b.status = 'PUBLISHED'
              AND b.id NOT IN :excludeIds
            ORDER BY b.readCount DESC
            """)
    List<Book> findPopularByCategoryExcluding(@Param("categoryId") int categoryId,
                                              @Param("excludeIds") List<Integer> excludeIds,
                                              Pageable pageable);

    // Overall sabse zyada padhi gayi books (category filter ke bina), jo user ne already nahi padhi
    @Query("""
            SELECT b FROM Book b
            WHERE b.status = 'PUBLISHED'
              AND b.id NOT IN :excludeIds
            ORDER BY b.readCount DESC
            """)
    List<Book> findPopularExcluding(@Param("excludeIds") List<Integer> excludeIds, Pageable pageable);
    List<Book> findByCategory_Id(int categoryId);
}