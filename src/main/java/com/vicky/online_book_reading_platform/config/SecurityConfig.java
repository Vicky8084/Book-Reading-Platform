package com.vicky.online_book_reading_platform.config;

import com.vicky.online_book_reading_platform.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception{
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))   // 🔑 naya: no session
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/home",
                                "/login",
                                "/signup",
                                "/admin-login",
                                "/forgotpassword",
                                "/api/v1/user/register",
                                "/css/**",
                                "/js/**",
                                "/images/**",
                                "/books",
                                "/api/v1/login/**",
                                "/api/v1/category/findAll",
                                "/api/v1/book/public/**"
                        ).permitAll()
                        .requestMatchers(
                                "/publisher-dashboard",
                                "/api/v1/category/suggest",
                                "/api/v1/book/upload",
                                "/api/v1/book/my-books",
                                "/api/v1/book/*"
                        ).hasRole("PUBLISHER")
                        .requestMatchers(
                                "/user-dashboard",
                                "/bookscreen",
                                "/read/**"
                        ).hasRole("USER")
                        .requestMatchers(
                                "/admin-dashboard",
                                "/api/v1/admin/**",
                                "/api/v1/category/pending",
                                "/api/v1/category/approve/**",
                                "/api/v1/category/reject/**"
                        ).hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
}