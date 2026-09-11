package com.vicky.online_book_reading_platform.service;

import com.vicky.online_book_reading_platform.ResponseDTO.BookResponseDTO;
import com.vicky.online_book_reading_platform.converter.BookConverter;
import com.vicky.online_book_reading_platform.enums.BookStatus;
import com.vicky.online_book_reading_platform.exception.AppException;
import com.vicky.online_book_reading_platform.model.Book;
import com.vicky.online_book_reading_platform.model.ReadingHistory;
import com.vicky.online_book_reading_platform.model.User;
import com.vicky.online_book_reading_platform.repository.BookRepository;
import com.vicky.online_book_reading_platform.repository.ReadingHistoryRepository;
import com.vicky.online_book_reading_platform.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class RecommendationService {

    // Kitni total books recommend karni hain
    private static final int TOTAL_RECOMMENDATIONS = 10;

    // User ki top kitni subcategories consider karni hain (Fantasy, Romance, Mystery...)
    private static final int TOP_CATEGORIES_TO_CONSIDER = 3;

    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final ReadingHistoryRepository readingHistoryRepository;

    @Autowired
    public RecommendationService(BookRepository bookRepository,
                                 UserRepository userRepository,
                                 ReadingHistoryRepository readingHistoryRepository) {
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.readingHistoryRepository = readingHistoryRepository;
    }

    /**
     * Jab user koi book kholta/padhta hai — reading history save hoti hai
     * aur (sirf pehli baar) book ka global readCount +1 hota hai.
     */
    public void trackRead(String userEmail, int bookId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException("User not found"));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException("Book not found"));

        boolean alreadyRead = readingHistoryRepository.existsByUser_IdAndBook_Id(user.getId(), bookId);
        if (!alreadyRead) {
            book.setReadCount(book.getReadCount() + 1);
            bookRepository.save(book);
        }

        ReadingHistory history = new ReadingHistory();
        history.setUser(user);
        history.setBook(book);
        history.setCategory(book.getCategory());
        readingHistoryRepository.save(history);

        log.info("Tracked read: user={}, bookId={}, newReadCount={}", userEmail, bookId, book.getReadCount());
    }

    /**
     * Reader jab page badalta hai (debounced), yahan se progress save hota hai.
     * Naya row nahi banata — usi ReadingHistory row ko update karta hai jo
     * trackRead() ne banayi thi (jitni baar bhi ye call ho, ek hi row overwrite hoti hai).
     */
    public void updateProgress(String userEmail, int bookId, int pageNumber) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException("User not found"));

        ReadingHistory history = readingHistoryRepository
                .findTopByUser_IdAndBook_IdOrderByReadAtDesc(user.getId(), bookId)
                .orElseGet(() -> {
                    // Edge case: progress aayi lekin trackRead() kabhi call nahi hua tha
                    Book book = bookRepository.findById(bookId)
                            .orElseThrow(() -> new AppException("Book not found"));
                    ReadingHistory newHistory = new ReadingHistory();
                    newHistory.setUser(user);
                    newHistory.setBook(book);
                    newHistory.setCategory(book.getCategory());
                    return newHistory;
                });

        history.setLastPageRead(pageNumber);
        readingHistoryRepository.save(history);
    }

    /**
     * Reader page load hote hi ye call hota hai — "Continue Reading" ke liye
     * pichli baar jahan chhoda tha wahan se resume karwane ke liye.
     */
    public int getLastReadPage(String userEmail, int bookId) {
        Optional<User> userOptional = userRepository.findByEmail(userEmail);
        if (userOptional.isEmpty()) {
            return 1;
        }
        return readingHistoryRepository
                .findTopByUser_IdAndBook_IdOrderByReadAtDesc(userOptional.get().getId(), bookId)
                .map(h -> h.getLastPageRead() != null ? h.getLastPageRead() : 1)
                .orElse(1);
    }

    /**
     * Personalized recommendations:
     *  1) User ki top-N subcategories nikaalo (jitna zyada padha, utni priority)
     *  2) Har subcategory se proportional slots allocate karo
     *  3) Har slot us subcategory ki sabse "famous" (zyada readCount wali) unread books se bharo
     *  4) Agar user naya hai (koi history nahi) ya slots poore nahi bhare — global popular books se fill karo
     */
    public List<BookResponseDTO> getRecommendations(String userEmail) {
        if (userEmail == null) {
            return globalPopular(TOTAL_RECOMMENDATIONS, List.of(-1));
        }

        Optional<User> userOptional = userRepository.findByEmail(userEmail);
        if (userOptional.isEmpty()) {
            return globalPopular(TOTAL_RECOMMENDATIONS, List.of(-1));
        }
        int userId = userOptional.get().getId();

        List<ReadingHistoryRepository.CategoryReadCount> topCategories =
                readingHistoryRepository.findTopCategoriesForUser(userId);

        List<Integer> alreadyReadBookIds = readingHistoryRepository.findReadBookIdsByUser(userId);
        if (alreadyReadBookIds.isEmpty()) {
            alreadyReadBookIds = List.of(-1); // NOT IN () invalid hota hai, dummy id daal diya
        }

        // ===== Cold start: naya user, koi reading history nahi =====
        if (topCategories.isEmpty()) {
            return globalPopular(TOTAL_RECOMMENDATIONS, alreadyReadBookIds);
        }

        List<ReadingHistoryRepository.CategoryReadCount> topFew = topCategories.stream()
                .limit(TOP_CATEGORIES_TO_CONSIDER)
                .toList();

        long totalReadsInTopCategories = topFew.stream()
                .mapToLong(ReadingHistoryRepository.CategoryReadCount::getReads)
                .sum();

        List<Book> recommendations = new ArrayList<>();
        Set<Integer> pickedBookIds = new HashSet<>();

        // ===== Proportional allocation: jis subcategory ko zyada padha, usse zyada books =====
        for (ReadingHistoryRepository.CategoryReadCount cat : topFew) {
            int slots = (int) Math.round((cat.getReads() * 1.0 / totalReadsInTopCategories) * TOTAL_RECOMMENDATIONS);
            if (slots <= 0) {
                continue;
            }

            List<Book> popularInCategory = bookRepository.findPopularByCategoryExcluding(
                    cat.getCategoryId(), alreadyReadBookIds, PageRequest.of(0, slots));

            for (Book book : popularInCategory) {
                if (pickedBookIds.add(book.getId())) {
                    recommendations.add(book);
                }
            }
        }

        // ===== Rounding ki wajah se kam pade to famous books se fill karo (koi bhi category) =====
        if (recommendations.size() < TOTAL_RECOMMENDATIONS) {
            int remaining = TOTAL_RECOMMENDATIONS - recommendations.size();

            List<Integer> excludeNow = new ArrayList<>(alreadyReadBookIds);
            excludeNow.addAll(pickedBookIds);
            if (excludeNow.isEmpty()) {
                excludeNow = List.of(-1);
            }

            List<Book> fillers = bookRepository.findPopularExcluding(excludeNow, PageRequest.of(0, remaining));
            for (Book book : fillers) {
                if (pickedBookIds.add(book.getId())) {
                    recommendations.add(book);
                }
            }
        }

        return recommendations.stream()
                .map(BookConverter::convertBookIntoBookResponseDTO)
                .toList();
    }

    private List<BookResponseDTO> globalPopular(int limit, List<Integer> excludeIds) {
        List<Book> books = excludeIds.equals(List.of(-1))
                ? bookRepository.findByStatusOrderByReadCountDesc(BookStatus.PUBLISHED, PageRequest.of(0, limit))
                : bookRepository.findPopularExcluding(excludeIds, PageRequest.of(0, limit));

        return books.stream()
                .map(BookConverter::convertBookIntoBookResponseDTO)
                .toList();
    }
}