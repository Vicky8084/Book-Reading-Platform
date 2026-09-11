package com.vicky.online_book_reading_platform.repository;

import com.vicky.online_book_reading_platform.enums.CategoryStatus;
import com.vicky.online_book_reading_platform.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    List<Category> findByStatus(CategoryStatus status);
    List<Category> findByParentCategory_Id(int parentCategoryId);
    List<Category> findByCategoryNameIgnoreCaseAndIdNotAndStatus(String categoryName, int id, CategoryStatus status);
    List<Category> findAllByCategoryName(String categoryName);
    Optional<Category> findFirstByCategoryNameIgnoreCaseAndStatus(String categoryName, CategoryStatus status);

}
