package com.vicky.online_book_reading_platform.service;

import com.vicky.online_book_reading_platform.ResponseDTO.BookResponseDTO;
import com.vicky.online_book_reading_platform.converter.BookConverter;
import com.vicky.online_book_reading_platform.enums.BookStatus;
import com.vicky.online_book_reading_platform.enums.CategoryStatus;
import com.vicky.online_book_reading_platform.exception.AppException;
import com.vicky.online_book_reading_platform.model.Book;
import com.vicky.online_book_reading_platform.model.Category;
import com.vicky.online_book_reading_platform.model.User;
import com.vicky.online_book_reading_platform.repository.BookRepository;
import com.vicky.online_book_reading_platform.repository.CategoryRepository;
import com.vicky.online_book_reading_platform.repository.ReadingHistoryRepository;
import com.vicky.online_book_reading_platform.repository.UserRepository;
import com.vicky.online_book_reading_platform.requestDTO.BookRequestDTO;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class BookService {

    // PDF ki apni hard limit — global multipart limit (application.properties) se alag aur
    // sakht. Isse zyada size ka PDF upload hi nahi hone dena, saaf error message ke saath.
    private static final long MAX_PDF_SIZE_BYTES = 10L * 1024 * 1024; // 10 MB

    private final BookRepository bookRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final ReadingHistoryRepository readingHistoryRepository;

    @Autowired
    public BookService(BookRepository bookRepository,
                       CategoryRepository categoryRepository,
                       UserRepository userRepository,
                       CloudinaryService cloudinaryService,
                       ReadingHistoryRepository readingHistoryRepository) {
        this.bookRepository = bookRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.cloudinaryService = cloudinaryService;
        this.readingHistoryRepository = readingHistoryRepository;
    }

    // ===== PUBLIC — books.html / bookscreen.html ke liye =====

    // Ye response public/unauthenticated hota hai (/public/all) — isliye filePath
    // (raw Cloudinary PDF URL) kabhi include nahi karte, warna login-gate bypass ho jaata hai
    public List<BookResponseDTO> findAllPublishedBooks() {
        return bookRepository.findByStatus(BookStatus.PUBLISHED)
                .stream()
                .map(book -> BookConverter.convertBookIntoBookResponseDTO(book, false))
                .toList();
    }

    // Ye bhi public/unauthenticated hota hai (/public/{id}) — same wajah se filePath exclude
    public BookResponseDTO findPublishedBookById(int bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException("Book not found"));
        if (book.getStatus() != BookStatus.PUBLISHED) {
            throw new AppException("This book is not available");
        }
        return BookConverter.convertBookIntoBookResponseDTO(book, false);
    }

    // Cloudinary se PDF bytes khud fetch karke laata hai — taaki raw Cloudinary URL
    // kabhi frontend ko expose na ho, aur hum apne khud ke headers (inline disposition) bhej sakein
    public byte[] fetchPdfBytes(int bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException("Book not found"));
        if (book.getStatus() != BookStatus.PUBLISHED) {
            throw new AppException("This book is not available");
        }

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder(URI.create(book.getFilePath())).GET().build();
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) {
                throw new AppException("Could not load book file. Please try again later.");
            }
            return response.body();
        } catch (IOException | InterruptedException e) {
            log.error("Failed to fetch PDF bytes for book id {}", bookId, e);
            throw new AppException("Could not load book file. Please try again later.");
        }
    }

    // Category REJECTED honi chahiye tabhi block karo — PENDING (newly suggested) bhi allowed hai
    private Category resolveUsableCategory(int categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new AppException("Category not found"));
        if (category.getStatus() == CategoryStatus.REJECTED) {
            throw new AppException("Selected category was rejected. Please choose or suggest another.");
        }
        return category;
    }

    private Category resolveOrSuggestCategory(BookRequestDTO bookRequestDTO) {
        if (bookRequestDTO.getCategoryId() != null) {
            return resolveUsableCategory(bookRequestDTO.getCategoryId());
        }

        if (bookRequestDTO.getNewCategoryName() == null || bookRequestDTO.getNewCategoryName().isBlank()) {
            throw new AppException("Please select an existing category or provide a name to suggest a new one");
        }

        String trimmedName = bookRequestDTO.getNewCategoryName().trim();
        Optional<Category> approved = categoryRepository.findFirstByCategoryNameIgnoreCaseAndStatus(trimmedName, CategoryStatus.APPROVED);
        if (approved.isPresent()) {
            return approved.get();
        }
        Optional<Category> rejected = categoryRepository.findFirstByCategoryNameIgnoreCaseAndStatus(trimmedName, CategoryStatus.REJECTED);
        if (rejected.isPresent()) {
            throw new AppException("This category name was rejected earlier. Please choose a different name.");
        }

        Category newCategory = new Category();
        newCategory.setCategoryName(trimmedName);
        newCategory.setStatus(CategoryStatus.PENDING);

        if (bookRequestDTO.getNewCategoryParentId() != null) {
            Category parent = categoryRepository.findById(bookRequestDTO.getNewCategoryParentId())
                    .orElseThrow(() -> new AppException("Parent category not found"));
            newCategory.setParentCategory(parent);
        }

        return categoryRepository.save(newCategory);
    }

    public BookResponseDTO uploadBook(BookRequestDTO bookRequestDTO,
                                      MultipartFile pdfFile,
                                      MultipartFile coverImage,
                                      String publisherEmail) {

        User publisher = userRepository.findByEmail(publisherEmail)
                .orElseThrow(() -> new AppException("Publisher not found"));

        if (pdfFile == null || pdfFile.isEmpty()) {
            throw new AppException("Book file (PDF) is required");
        }
        if (coverImage == null || coverImage.isEmpty()) {
            throw new AppException("Cover image is required");
        }
        if (pdfFile.getSize() > MAX_PDF_SIZE_BYTES) {
            throw new AppException("PDF file size should not exceed 10MB");
        }

        Book book = BookConverter.convertBookRequestDTOIntoBook(bookRequestDTO);
        book.setPublisher(publisher);

        try (PDDocument document = Loader.loadPDF(pdfFile.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            book.setExtractedText(stripper.getText(document));
            book.setTotalPages(document.getNumberOfPages());
        } catch (IOException e) {
            log.error("Failed to extract text from PDF for book: {}", bookRequestDTO.getTitle(), e);
            throw new AppException("Could not read PDF content. Please make sure the file is a valid PDF.");
        }

        Category category = resolveOrSuggestCategory(bookRequestDTO);
        book.setCategory(category);

        try {
            String pdfUrl = cloudinaryService.uploadFile(pdfFile, "books/pdfs", "raw");
            book.setFilePath(pdfUrl);
            book.setFileName(pdfFile.getOriginalFilename());
            book.setFileType(pdfFile.getContentType());
            book.setFileSize(pdfFile.getSize());

            String coverUrl = cloudinaryService.uploadFile(coverImage, "books/covers", "image");
            book.setCoverImagePath(coverUrl);
        } catch (IOException e) {
            log.error("Failed to upload book files to Cloudinary", e);
            throw new AppException("Failed to upload book files. Please try again.");
        }

        book.setStatus(BookStatus.PENDING);

        Book savedBook = bookRepository.save(book);
        return BookConverter.convertBookIntoBookResponseDTO(savedBook);
    }

    public List<BookResponseDTO> findMyBooks(String publisherEmail) {
        User publisher = userRepository.findByEmail(publisherEmail)
                .orElseThrow(() -> new AppException("Publisher not found"));

        return bookRepository.findByPublisher_Id(publisher.getId())
                .stream()
                .map(BookConverter::convertBookIntoBookResponseDTO)
                .toList();
    }

    // Sirf metadata edit — file/PDF replace karna abhi scope mein nahi
    public BookResponseDTO updateBook(int bookId, BookRequestDTO bookRequestDTO, String publisherEmail) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException("Book not found"));

        if (!book.getPublisher().getEmail().equals(publisherEmail)) {
            throw new AppException("You are not allowed to edit this book");
        }

        if (bookRequestDTO.getCategoryId() == null) {
            throw new AppException("Category is required");
        }
        Category category = resolveUsableCategory(bookRequestDTO.getCategoryId());

        book.setTitle(bookRequestDTO.getTitle());
        book.setAuthor(bookRequestDTO.getAuthor());
        book.setDescription(bookRequestDTO.getDescription());
        book.setLanguage(bookRequestDTO.getLanguage());
        book.setCategory(category);

        book.setStatus(BookStatus.PENDING);

        Book savedBook = bookRepository.save(book);
        return BookConverter.convertBookIntoBookResponseDTO(savedBook);
    }

    public void deleteBook(int bookId, String publisherEmail) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException("Book not found"));

        if (!book.getPublisher().getEmail().equals(publisherEmail)) {
            throw new AppException("You are not allowed to delete this book");
        }
        if (readingHistoryRepository.existsByBook_Id(bookId)) {
            throw new AppException("This book cannot be deleted because it has already been read by user(s). Unpublish it instead if you want to hide it.");
        }

        bookRepository.delete(book);
    }
}