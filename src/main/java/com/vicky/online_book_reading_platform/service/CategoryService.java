package com.vicky.online_book_reading_platform.service;

import com.vicky.online_book_reading_platform.ResponseDTO.CategoryResponseDTO;
import com.vicky.online_book_reading_platform.converter.CategoryConverter;
import com.vicky.online_book_reading_platform.enums.CategoryStatus;
import com.vicky.online_book_reading_platform.exception.AppException;
import com.vicky.online_book_reading_platform.model.Book;
import com.vicky.online_book_reading_platform.model.Category;
import com.vicky.online_book_reading_platform.repository.BookRepository;
import com.vicky.online_book_reading_platform.repository.CategoryRepository;
import com.vicky.online_book_reading_platform.requestDTO.CategoryApprovalRequestDTO;
import com.vicky.online_book_reading_platform.requestDTO.CategoryRequestDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final BookRepository bookRepository;

    @Autowired
    public CategoryService(CategoryRepository categoryRepository, BookRepository bookRepository){
        this.categoryRepository = categoryRepository;
        this.bookRepository = bookRepository;
    }

    public CategoryResponseDTO saveCategory(CategoryRequestDTO categoryRequestDTO){

        String trimmedName = categoryRequestDTO.getCategoryName().trim();

        // IMPORTANT: APPROVED aur REJECTED ke liye ALAG-ALAG status-specific query use karte
        // hain — ek generic "sirf naam se dhoondho" query (bina status filter ke) is-liye nahi
        // use kar sakte kyunki PENDING mein pehle se 2+ duplicate rows ho sakti hain (yahi to
        // is feature ka poora point hai) — aur Optional-returning query 2+ rows milne par
        // khud crash ho jaati (IncorrectResultSizeDataAccessException). Status-specific query
        // hamesha 0-ya-1 result guarantee karti hai (APPROVED/REJECTED practically ek hi hoti hai).
        Optional<Category> approved = categoryRepository.findFirstByCategoryNameIgnoreCaseAndStatus(trimmedName, CategoryStatus.APPROVED);
        if (approved.isPresent()) {
            throw new AppException("This category already exists and is approved. Please select it instead of suggesting a duplicate.");
        }
        Optional<Category> rejected = categoryRepository.findFirstByCategoryNameIgnoreCaseAndStatus(trimmedName, CategoryStatus.REJECTED);
        if (rejected.isPresent()) {
            throw new AppException("This category name was rejected earlier. Please choose a different name.");
        }
        // Naam PENDING mein pehle se ho ya na ho, dono cases mein aage badh kar naya
        // PENDING row banta hai — duplicate PENDING jaan-boojh kar allowed hai.

        CategoryRequestDTO normalized = new CategoryRequestDTO();
        normalized.setCategoryName(trimmedName);
        normalized.setDescription(categoryRequestDTO.getDescription());
        normalized.setParentCategoryId(categoryRequestDTO.getParentCategoryId());

        Category category = CategoryConverter.convertCategoryRequestDTOIntoCategory(normalized);

        if (categoryRequestDTO.getParentCategoryId() != null) {
            Category parent = categoryRepository.findById(categoryRequestDTO.getParentCategoryId())
                    .orElseThrow(() -> new AppException("Parent category not found"));
            category.setParentCategory(parent);
        }

        category.setStatus(CategoryStatus.PENDING);

        Category savedCategory = categoryRepository.save(category);
        return CategoryConverter.convertCategoryIntoCategoryResponseDTO(savedCategory);
    }

    // Publisher ke "Add Book" dropdown ke liye — sirf approved categories
    public List<CategoryResponseDTO> findAllApproved(){
        return categoryRepository.findByStatus(CategoryStatus.APPROVED)
                .stream()
                .map(CategoryConverter::convertCategoryIntoCategoryResponseDTO)
                .toList();
    }

    // Admin ke liye — sirf pending (approval ka wait kar rahi) categories
    public List<CategoryResponseDTO> findAllPending(){
        return categoryRepository.findByStatus(CategoryStatus.PENDING)
                .stream()
                .map(CategoryConverter::convertCategoryIntoCategoryResponseDTO)
                .toList();
    }

    /**
     * Teen scenario handle karta hai:
     *  1) mergeIntoCategoryId diya hai        -> duplicate ko approve nahi karta, existing category mein MERGE karta hai
     *  2) newCategoryName / parentCategoryId  -> rename/reparent karke tab APPROVE karta hai
     *  3) kuch nahi diya                       -> seedha plain approve (pehle jaisa behaviour)
     *
     * @Transactional yahan (outer/public entry-point method) par hai, andar wale mergeCategory()
     * par nahi — kyunki approveCategory() -> mergeCategory() ek hi class ke andar direct call hai
     * (self-invocation), jo Spring ke proxy ko bypass kar deta hai aur andar rakha @Transactional
     * silently ignore ho jaata. Yahan lagane se poori call-chain (reassign books + reparent
     * subcategories + delete + auto-merge) ek hi atomic transaction mein chalti hai.
     */
    @Transactional
    public CategoryResponseDTO approveCategory(int categoryId, CategoryApprovalRequestDTO request){
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new AppException("Category not found"));

        if (request != null && request.getMergeIntoCategoryId() != null) {
            return mergeCategory(category, request.getMergeIntoCategoryId());
        }

        if (request != null && request.getNewCategoryName() != null && !request.getNewCategoryName().isBlank()
                && !request.getNewCategoryName().equals(category.getCategoryName())) {
            boolean nameClash = categoryRepository.findAllByCategoryName(request.getNewCategoryName())
                    .stream()
                    .anyMatch(c -> c.getId() != category.getId());
            if (nameClash) {
                throw new AppException("A category with this name already exists. Use 'merge' instead of renaming to a duplicate name.");
            }
            category.setCategoryName(request.getNewCategoryName());
        }

        if (request != null && request.getParentCategoryId() != null) {
            if (request.getParentCategoryId() == categoryId) {
                throw new AppException("A category cannot be its own parent");
            }
            Category parent = categoryRepository.findById(request.getParentCategoryId())
                    .orElseThrow(() -> new AppException("Parent category not found"));
            category.setParentCategory(parent);
        }

        category.setStatus(CategoryStatus.APPROVED);
        Category approvedCategory = categoryRepository.save(category);

        autoMergeDuplicatePendingCategories(approvedCategory);

        return CategoryConverter.convertCategoryIntoCategoryResponseDTO(approvedCategory);
    }

    /**
     * Jab bhi ek category approve hoti hai, usi naam (case-insensitive) ki baaki saari
     * PENDING categories — jo alag-alag publishers ne isi waqt suggest ki thi — automatically
     * isi approved category mein merge ho jaati hain (unki books reassign, subcategories
     * reparent, aur duplicate row delete). Isse manually admin ko har duplicate ke liye
     * "merge" click nahi karna padta — DB mein sirf ek hi APPROVED row bachti hai us naam ki.
     */
    private void autoMergeDuplicatePendingCategories(Category approvedCategory) {
        List<Category> duplicates = categoryRepository.findByCategoryNameIgnoreCaseAndIdNotAndStatus(
                approvedCategory.getCategoryName(), approvedCategory.getId(), CategoryStatus.PENDING);

        for (Category duplicate : duplicates) {
            log.info("Auto-merging duplicate pending category '{}' (id={}) into approved category (id={})",
                    duplicate.getCategoryName(), duplicate.getId(), approvedCategory.getId());
            mergeCategory(duplicate, approvedCategory.getId());
        }
    }

    /**
     * Duplicate category (jaise "sciencefiction") ko approve karne ke bajaye,
     * jo bhi already APPROVED category isse match karti hai (jaise "Science Fiction"),
     * usme merge kar deta hai:
     *   - is category ko point karne wali saari books  -> target category
     *   - is category ki saari subcategories             -> target ke neeche reparent
     *   - is (duplicate) category ko delete kar diya jaata hai
     *
     * Koi @Transactional yahan nahi hai jaan-boojh kar — kyunki ye method approveCategory()
     * se self-invocation ke zariye call hota hai (upar ka comment dekho). Atomicity
     * approveCategory() ke @Transactional se milti hai, jo poori chain ko cover karta hai.
     */
    protected CategoryResponseDTO mergeCategory(Category source, int targetId) {
        if (source.getId() == targetId) {
            throw new AppException("Cannot merge a category into itself");
        }

        Category target = categoryRepository.findById(targetId)
                .orElseThrow(() -> new AppException("Target category not found"));

        if (target.getStatus() != CategoryStatus.APPROVED) {
            throw new AppException("Can only merge into an already-approved category");
        }

        List<Book> booksToReassign = bookRepository.findByCategory_Id(source.getId());
        for (Book book : booksToReassign) {
            book.setCategory(target);
        }
        bookRepository.saveAll(booksToReassign);

        List<Category> subCategoriesToReparent = categoryRepository.findByParentCategory_Id(source.getId());
        for (Category child : subCategoriesToReparent) {
            child.setParentCategory(target);
        }
        categoryRepository.saveAll(subCategoriesToReparent);

        categoryRepository.delete(source);

        log.info("Merged category '{}' (id={}) into '{}' (id={}) — {} book(s), {} subcategory(ies) reassigned",
                source.getCategoryName(), source.getId(), target.getCategoryName(), target.getId(),
                booksToReassign.size(), subCategoriesToReparent.size());

        return CategoryConverter.convertCategoryIntoCategoryResponseDTO(target);
    }

    public CategoryResponseDTO rejectCategory(int categoryId){
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new AppException("Category not found"));

        // Sirf PENDING category hi reject ho sakti hai — ek baar APPROVED ho jaane ke baad
        // usse reject karna already-published books ko tod sakta hai
        if (category.getStatus() != CategoryStatus.PENDING) {
            throw new AppException("Only pending categories can be rejected. This category is already " + category.getStatus() + ".");
        }

        category.setStatus(CategoryStatus.REJECTED);
        return CategoryConverter.convertCategoryIntoCategoryResponseDTO(categoryRepository.save(category));
    }
}