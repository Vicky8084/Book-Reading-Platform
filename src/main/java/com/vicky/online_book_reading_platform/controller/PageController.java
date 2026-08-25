package com.vicky.online_book_reading_platform.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping({"/","/home"})
    public String home() {
        return "home";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/signup")
    public String signup() {
        return "signup";
    }

    @GetMapping("/user-dashboard")
    public String userDashboard() {
        return "userdashboard";
    }

    @GetMapping("/bookscreen")
    public String bookScreen() {
        return "bookscreen";
    }

    @GetMapping("/books")
    public String book(){
        return "books";
    }

    @GetMapping("/publisher-dashboard")
    public String publisher(){
        return "publisherdashboard";
    }

    @GetMapping("/forgotpassword")
    public String forgotPassword(){
        return "forgotpassword";
    }

    @GetMapping("/admin-login")
    public String adminLogin(){
        return "adminlogin";
    }

}