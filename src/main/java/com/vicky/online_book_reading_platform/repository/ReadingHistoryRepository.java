package com.vicky.online_book_reading_platform.repository;

import com.vicky.online_book_reading_platform.model.ReadingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReadingHistoryRepository extends JpaRepository<ReadingHistory, Integer> {

    // Same user same book baar-baar khole to readCount har baar na badhe
    boolean existsByUser_IdAndBook_Id(int userId, int bookId);

    // Book delete karne se pehle check karne ke liye — kya kisi ne bhi ye book kabhi padhi hai
    boolean existsByBook_Id(int bookId);

    // Ek user ne kaunsi category kitni baar padhi — sabse zyada padhi wali category top pe
    @Query("""
            SELECT rh.category.id AS categoryId, COUNT(rh) AS reads
            FROM ReadingHistory rh
            WHERE rh.user.id = :userId
            GROUP BY rh.category.id
            ORDER BY reads DESC
            """)
    List<CategoryReadCount> findTopCategoriesForUser(@Param("userId") int userId);

    // User ne ab tak jo books padh li hain — inko recommend list se exclude karna hai
    @Query("SELECT rh.book.id FROM ReadingHistory rh WHERE rh.user.id = :userId")
    List<Integer> findReadBookIdsByUser(@Param("userId") int userId);

    // Progress save/resume ke liye — is user-book pair ka sabse latest history row
    Optional<ReadingHistory> findTopByUser_IdAndBook_IdOrderByReadAtDesc(int userId, int bookId);

    interface CategoryReadCount {
        Integer getCategoryId();
        Long getReads();
    }
}