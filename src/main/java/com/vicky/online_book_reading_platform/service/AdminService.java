package com.vicky.online_book_reading_platform.service;

import com.vicky.online_book_reading_platform.ResponseDTO.BookResponseDTO;
import com.vicky.online_book_reading_platform.ResponseDTO.UserResponseDTO;
import com.vicky.online_book_reading_platform.converter.BookConverter;
import com.vicky.online_book_reading_platform.converter.UserConverter;
import com.vicky.online_book_reading_platform.enums.BookStatus;
import com.vicky.online_book_reading_platform.enums.CategoryStatus;
import com.vicky.online_book_reading_platform.enums.Role;
import com.vicky.online_book_reading_platform.enums.UserStatus;
import com.vicky.online_book_reading_platform.exception.AppException;
import com.vicky.online_book_reading_platform.model.Book;
import com.vicky.online_book_reading_platform.model.User;
import com.vicky.online_book_reading_platform.repository.BookRepository;
import com.vicky.online_book_reading_platform.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class AdminService {
    private final UserRepository userRepository;
    private final BookRepository bookRepository;

    @Autowired
    public AdminService(UserRepository userRepository,
                        BookRepository bookRepository){
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
    }

    // ===== USER MANAGEMENT =====

    public UserResponseDTO approveUser(String email){
        Optional<User> userOptional = userRepository.findByEmail(email);
        if(userOptional.isEmpty()){
            throw new AppException("User not found");
        }
        User user = userOptional.get();
        if(user.getRole() != Role.PUBLISHER){
            throw new AppException("Only publisher accounts require approval");
        }
        user.setUserStatus(UserStatus.APPROVED);
        user = userRepository.save(user);
        return UserConverter.convertUserIntoUserResponseDTO(user);
    }

    public UserResponseDTO rejectUser(String email){
        Optional<User> userOptional = userRepository.findByEmail(email);
        if(userOptional.isEmpty()){
            throw new AppException("User not found");
        }
        User user = userOptional.get();
        if(user.getRole() != Role.PUBLISHER){
            throw new AppException("Only publisher accounts require approval");
        }
        user.setUserStatus(UserStatus.REJECTED);
        user = userRepository.save(user);
        return UserConverter.convertUserIntoUserResponseDTO(user);
    }

    public List<UserResponseDTO> findAllUsers(){
        List<User> users = userRepository.findAll();
        List<UserResponseDTO> userResponseDTOS = new ArrayList<>();
        for(User user : users){
            userResponseDTOS.add(UserConverter.convertUserIntoUserResponseDTO(user));
        }
        return userResponseDTOS;
    }

    public List<UserResponseDTO> findAllPendingUsers(){
        List<User> userList = userRepository.findByUserStatus(UserStatus.PENDING);
        List<UserResponseDTO> userResponseDTOList = new ArrayList<>();
        for(User user: userList){
            userResponseDTOList.add(UserConverter.convertUserIntoUserResponseDTO(user));
        }
        return userResponseDTOList;
    }

    public List<UserResponseDTO> findAllApprovedUsers(){
        List<User> userList = userRepository.findByUserStatus(UserStatus.APPROVED);
        List<UserResponseDTO> userResponseDTOList = new ArrayList<>();
        for(User user: userList){
            userResponseDTOList.add(UserConverter.convertUserIntoUserResponseDTO(user));
        }
        return userResponseDTOList;
    }

    // ===== BOOK MANAGEMENT =====

    public List<BookResponseDTO> findAllBooks() {
        return bookRepository.findAll()
                .stream()
                .map(BookConverter::convertBookIntoBookResponseDTO)
                .toList();
    }

    public List<BookResponseDTO> findPendingBooks() {
        return bookRepository.findByStatus(BookStatus.PENDING)
                .stream()
                .map(BookConverter::convertBookIntoBookResponseDTO)
                .toList();
    }

    public BookResponseDTO approveBook(int bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException("Book not found"));

        // Category pehle approved honi chahiye — warna is book ka category filter/tag
        // users ko kabhi nahi dikhega. Admin ko pehle "Manage Categories" mein
        // is category ko rename/reparent/merge karke approve karna hoga.
        if (book.getCategory().getStatus() != CategoryStatus.APPROVED) {
            throw new AppException(
                    "Cannot approve this book — its category '" + book.getCategory().getCategoryName()
                            + "' is still " + book.getCategory().getStatus()
                            + ". Please resolve the category first from Manage Categories."
            );
        }

        book.setStatus(BookStatus.PUBLISHED);
        return BookConverter.convertBookIntoBookResponseDTO(bookRepository.save(book));
    }

    public BookResponseDTO rejectBook(int bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException("Book not found"));
        book.setStatus(BookStatus.REJECTED);
        return BookConverter.convertBookIntoBookResponseDTO(bookRepository.save(book));
    }

    public void deleteBook(int bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException("Book not found"));
        bookRepository.delete(book);
    }
}